"use client";
import React, { createContext, useContext, useState, useRef, useEffect } from 'react'; // Fixed import
import { useSocket } from './SocketContext';

const CallContext = createContext();

export function useCall() {
    return useContext(CallContext);
}

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export function CallProvider({ children }) {
    const { controleur, isReady } = useSocket();
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, receiving, connected
    const [incomingCall, setIncomingCall] = useState(null); // { offer, socket, user }
    const [remoteStream, setRemoteStream] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [callDuration, setCallDuration] = useState(0);

    const peerConnection = useRef(null);
    const callTimerRef = useRef(null);
    const ringtoneAudioRef = useRef(null); // Changed to Audio element
    const callCompRef = useRef(null);
    const candidateQueue = useRef([]); // ICE Candidate Queue

    // --- Ringtone Logic (File Based) ---
    const playRingtone = (type = 'incoming') => {
        if (type === 'incoming') {
            try {
                const audio = new Audio('/assets/sonnerie.mp3');
                audio.loop = true;
                audio.play().catch(e => console.error("Error playing ringtone:", e));
                ringtoneAudioRef.current = audio;
            } catch(e) {
                console.error("Audio Play Error", e);
            }
        } else {
            // Outgoing: Soft generated tone using AudioContext (Keep old logic for outgoing or just silence)
            // For now, let's keep it simple or maybe re-use the file with lower volume/no loop?
            // Let's stick to a simple generated beep for outgoing to distinguish.
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                osc.start();
                
                // Pulse effect
                const loop = setInterval(() => {
                    if(ctx.state === 'closed') { clearInterval(loop); return; }
                    gain.gain.setValueAtTime(0.05, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                }, 1500);
                
                // Store in a way we can stop it. reusing ringtoneAudioRef structure might be messy if mixed types.
                // Let's store ctx/loop in a separate ref or object if needed, but for simplicity let's attach to ringtoneAudioRef as special obj
                ringtoneAudioRef.current = { ctx, osc, loop, type: 'generated' };
            } catch(e) {}
        }
    };

    const stopRingtone = () => {
        if (ringtoneAudioRef.current) {
            if (ringtoneAudioRef.current.type === 'generated') {
                 clearInterval(ringtoneAudioRef.current.loop);
                 try {
                     ringtoneAudioRef.current.osc.stop();
                     ringtoneAudioRef.current.ctx.close();
                 } catch(e) {}
            } else {
                // HTML5 Audio
                ringtoneAudioRef.current.pause();
                ringtoneAudioRef.current.currentTime = 0;
            }
            ringtoneAudioRef.current = null;
        }
    };

    const processCandidateQueue = async () => {
        if (peerConnection.current && candidateQueue.current.length > 0) {
            console.log("Processing queued ICE candidates:", candidateQueue.current.length);
            for (const candidate of candidateQueue.current) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding queued candidate", e);
                }
            }
            candidateQueue.current = [];
        }
    };

    // --- Socket Listeners ---
    useEffect(() => {
        if (!controleur || !isReady) return;

        const callComp = {
            nomDInstance: "CallComponent",
            traitementMessage: (msg) => {
                 if (msg['call-made']) {
                     const { offer, socket: senderSocket, user } = msg['call-made'];
                     console.log("Incoming call from:", user);
                     if (callStatus === 'idle') {
                         setIncomingCall({ offer, socket: senderSocket, user });
                         setCallStatus('receiving');
                         playRingtone('incoming');
                     }
                 }
                 else if (msg['answer-made']) {
                     const { answer } = msg['answer-made'];
                     console.log("Call accepted, answer received.");
                     if (peerConnection.current) {
                         peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer))
                            .then(() => {
                                setCallStatus('connected');
                                stopRingtone();
                                startCallTimer();
                                processCandidateQueue(); // Process any queued candidates
                            })
                            .catch(e => console.error("Error setting remote answer:", e));
                     }
                 }
                 else if (msg['ice-candidate']) {
                     const { candidate } = msg['ice-candidate'];
                     if (peerConnection.current) {
                         if (peerConnection.current.remoteDescription) {
                             peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate))
                                .catch(e => console.error("Error adding candidate:", e));
                         } else {
                             // Queue candidate
                             console.log("Queueing ICE candidate (no remote description yet)");
                             candidateQueue.current.push(candidate);
                         }
                     }
                 }
            }
        };
        callCompRef.current = callComp;

        controleur.inscription(callComp, 
            ['call-user', 'make-answer', 'ice-candidate'], 
            ['call-made', 'answer-made', 'ice-candidate']
        );

        return () => {
            controleur.desincription(callComp, 
                ['call-user', 'make-answer', 'ice-candidate'], 
                ['call-made', 'answer-made', 'ice-candidate']
            );
        };
    }, [controleur, isReady, callStatus]);

    // --- WebRTC Logic ---

    // ... (createPeerConnection matches previous logic mostly but let's inline it to be safe)

    const startCall = async (friendId) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            const pc = new RTCPeerConnection(rtcConfig);
            
            pc.onicecandidate = (event) => {
                if(event.candidate) {
                     controleur.envoie(callCompRef.current, {
                        'ice-candidate': { candidate: event.candidate, to: friendId } // friendId is UserID
                    });
                }
            };
            
            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };
            
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            peerConnection.current = pc;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            console.log("Sending call offer to:", friendId);
            controleur.envoie(callCompRef.current, {
                'call-user': { offer, to: friendId }
            });

            setCallStatus('calling');
            playRingtone('outgoing');
        } catch (err) {
            console.error("Mic Access Error:", err);
            alert("Erreur: Impossible d'accéder au micro.");
        }
    };

    const answerCall = async () => {
        if (!incomingCall) return;
        try {
            stopRingtone();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            const pc = new RTCPeerConnection(rtcConfig);
            
             pc.onicecandidate = (event) => {
                if(event.candidate) {
                     // CAREFUL: incomingCall.socket might be socketID or userID depending on what server sent
                     // Generally for answers we target the Specific Socket that called us
                     controleur.envoie(callCompRef.current, {
                        'ice-candidate': { candidate: event.candidate, to: incomingCall.socket }
                    });
                }
            };
            
            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
            };

            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            peerConnection.current = pc;

            await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
            // Process queue immediately after modifying remote description? 
            // Better to wait for answer creation? No, we can process incoming candidates now that we have an offer.
            processCandidateQueue();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log("Sending answer to:", incomingCall.socket);
            controleur.envoie(callCompRef.current, {
                'make-answer': { answer, to: incomingCall.socket }
            });

            setCallStatus('connected');
            startCallTimer();

        } catch (err) {
            console.error("Answer Error:", err);
        }
    };

    const endCall = () => {
        stopRingtone();
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        setRemoteStream(null);
        setIncomingCall(null);
        setCallStatus('idle');
        candidateQueue.current = []; // Clear queue
        clearInterval(callTimerRef.current);
    };

    // Timer Logic
    const startCallTimer = () => {
        clearInterval(callTimerRef.current);
        setCallDuration(0);
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    // --- Audio Policy Unlocker ---
    useEffect(() => {
        const unlockAudio = () => {
            // Create a dummy audio context interaction or play/pause to unlock autoplay
            const audio = new Audio('/assets/sonnerie.mp3');
            audio.volume = 0;
            audio.play().then(() => {
                audio.pause();
                console.log("Audio autoplay unlocked");
            }).catch(() => {});
            
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
    }, []);

    return (
        <CallContext.Provider value={{
            callStatus,
            incomingCall,
            remoteStream,
            startCall,
            answerCall,
            endCall,
            callDuration
        }}>
            {children}
        </CallContext.Provider>
    );
}
