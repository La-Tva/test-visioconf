"use client";
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useSocket } from './SocketContext';

const TeamCallContext = createContext();

export function useTeamCall() {
    return useContext(TeamCallContext);
}

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

export function TeamCallProvider({ children }) {
    const { controleur, isReady } = useSocket();
    
    // State
    const [teamCallStatus, setTeamCallStatus] = useState('idle'); // idle, connected
    const [activeTeamCalls, setActiveTeamCalls] = useState({}); // teamId -> { active: boolean, participants: [] }
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream
    const [currentTeamCallId, setCurrentTeamCallId] = useState(null);
    const [isAudioEnabled, setIsAudioEnabled] = useState(true);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isBusy, setIsBusy] = useState(false); // Validating media access / joining

    // Refs
    const peerConnections = useRef({}); // socketId -> RTCPeerConnection
    const callCompRef = useRef(null);
    const localVideoRef = useRef(null); // Optional ref if we want to manage it here, but Overlay handles it usually
    const currentTeamIdRef = useRef(null); // For access in callbacks

    // --- Socket Setup ---
    useEffect(() => {
        if (!controleur || !isReady) return;

        const callComp = {
            nomDInstance: "TeamCallComponent",
            traitementMessage: (msg) => {
                // 1. Status Updates (Who is in the call)
                if (msg['team-call-status']) {
                    const { teamId, active, participants } = msg['team-call-status'];
                    setActiveTeamCalls(prev => ({
                        ...prev,
                        [teamId]: { active, participants }
                    }));

                    // If we are currently in this call, update our mesh connections if new people joined?
                    // Actually, usually new people join -> they call US (Mesh).
                    // But if we are joining late, we use this list to call THEM.
                }

                // 2. Someone left
                else if (msg['participant-left']) {
                    const { socket: leftSocketId, teamId } = msg['participant-left'];
                    if (currentTeamIdRef.current === teamId) {
                        console.log(`Participant ${leftSocketId} left the call.`);
                        closePeerConnection(leftSocketId);
                    }
                }

                // 3. Incoming Mesh Offer (Someone joined and is calling us)
                else if (msg['call-made-group']) {
                    const { offer, socket: senderSocket, user, teamId } = msg['call-made-group'];
                    // Only accept if we are in the SAME team call or if this is an invitation?
                    // For Mesh, we only accept if we are ALREADY "connected" or "joining" this team call?
                    // Actually, if we are 'idle', this acts as an invitation we ignore visually (handled by UI "Join" button),
                    // BUT for the "Start Call" flow, the owner is "connected".
                    // Wait, 'call-made-group' is sent by server on 'call-team' broadcast too. 
                    
                    if (currentTeamIdRef.current === teamId) {
                        console.log("Accepting Mesh Offer from:", senderSocket);
                        handleIncomingMeshOffer(senderSocket, offer, user);
                    }
                }

                // 4. Answer Received (Response to our Mesh Offer)
                else if (msg['answer-made-group']) {
                    const { answer, socket: answererSocket } = msg['answer-made-group'];
                    if (peerConnections.current[answererSocket]) {
                        console.log("Received Mesh Answer from:", answererSocket);
                        peerConnections.current[answererSocket].setRemoteDescription(new RTCSessionDescription(answer))
                            .catch(e => console.error("Error setting group answer:", e));
                    }
                }

                // 5. ICE Candidate
                else if (msg['ice-candidate-group']) {
                    const { candidate, socket: senderSocket } = msg['ice-candidate-group'];
                    const pc = peerConnections.current[senderSocket];
                    if (pc && pc.remoteDescription) {
                        pc.addIceCandidate(new RTCIceCandidate(candidate))
                            .catch(e => console.error("Error adding group ice candidate:", e));
                    }
                }
                // 6. Call Ended (Owner Left)
                else if (msg['team-call-ended']) {
                    const { teamId, reason } = msg['team-call-ended'];
                    
                    // Mark call as inactive for everyone (hides Join button)
                    setActiveTeamCalls(prev => ({
                        ...prev,
                        [teamId]: { active: false, participants: [] }
                    }));

                    if (currentTeamIdRef.current === teamId) {
                        console.log("Team call ended by owner.");
                        cleanup();
                        alert("L'hôte a terminé l'appel.");
                    }
                }
            }
        };

        callCompRef.current = callComp;
        controleur.inscription(callComp, 
            ['call-peer-group', 'make-answer-group', 'ice-candidate-group', 'call-team', 'leave-group-call'], 
            ['call-made-group', 'answer-made-group', 'ice-candidate-group', 'team-call-status', 'participant-left', 'team-call-ended']
        );

        return () => {
             controleur.desincription(callComp, 
                ['call-peer-group', 'make-answer-group', 'ice-candidate-group', 'call-team', 'leave-group-call'], 
                ['call-made-group', 'answer-made-group', 'ice-candidate-group', 'team-call-status', 'participant-left', 'team-call-ended']
            );
        };
    }, [controleur, isReady]);

    // --- Actions ---

    const startTeamCall = async (teamId) => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            // Stop existing tracks if any
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            setLocalStream(stream);
            setIsAudioEnabled(true);
            setIsVideoEnabled(true);

            setTeamCallStatus('connected');
            setCurrentTeamCallId(teamId);
            currentTeamIdRef.current = teamId;

            // Notify server we started (and joined)
            controleur.envoie(callCompRef.current, {
                'call-team': { teamId, offer: null } // Offer is null because we don't broadcast a single offer anymore, we wait for joiners
            });

        } catch (e) {
            console.error("Error starting team call:", e);
            alert("Erreur d'accès aux médias. Vérifiez votre caméra.");
        } finally {
            setIsBusy(false);
        }
    };

    const joinTeamCall = async (teamId) => {
        if (isBusy) return;
        setIsBusy(true);
        try {
             // Stop existing tracks if any
             if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            // Join with AUDIO ONLY (User sees others, but sends no video)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            
            setLocalStream(stream);
            setIsAudioEnabled(true);
            setIsVideoEnabled(false);

            setTeamCallStatus('connected');
            setCurrentTeamCallId(teamId);
            currentTeamIdRef.current = teamId;

            // Notify server we are joining (via 'call-team' is easiest to add us to list?) 
            // OR use 'call-team' again? server.js logic adds us to list if we call 'call-team'.
            // AND since we are NOT owner, it checks activeGroupCalls. 
            // If activeGroupCalls has teamId, it adds us. Perfect.
            
            controleur.envoie(callCompRef.current, {
                'call-team': { teamId } 
            });

            // MESH: Initiate connections to EXISTING participants
            const currentCall = activeTeamCalls[teamId];
            if (currentCall && currentCall.participants) {
                currentCall.participants.forEach(p => {
                    if (p.socketId !== controleur.socketID) {
                         createMeshConnection(p.socketId, true, teamId);
                    }
                });
            }

        } catch (e) {
            console.error("Error joining team call:", e);
            alert("Erreur d'accès aux médias. Vérifiez votre caméra.");
        } finally {
            setIsBusy(false);
        }
    };

    const leaveTeamCall = () => {
        if (currentTeamCallId) {
            // Notify server
            controleur.envoie(callCompRef.current, {
                 'leave-group-call': { teamId: currentTeamCallId }
            });
        }
        cleanup();
    };

    // --- Mesh Helpers ---

    const createMeshConnection = async (targetSocketId, isInitiator, teamId) => {
        if (peerConnections.current[targetSocketId]) return peerConnections.current[targetSocketId];

        console.log(`Creating Mesh Connection to ${targetSocketId} (Initiator: ${isInitiator})`);
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnections.current[targetSocketId] = pc;

        // ICE Candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                controleur.envoie(callCompRef.current, {
                    'ice-candidate-group': { candidate: event.candidate, to: targetSocketId }
                });
            }
        };

        // Remote Stream
        pc.ontrack = (event) => {
            console.log(`Received track from ${targetSocketId}`);
            if (event.streams[0]) {
                setRemoteStreams(prev => ({
                    ...prev,
                    [targetSocketId]: event.streams[0]
                }));
            }
        };

        // Add Local Tracks
        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        if (isInitiator) {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                controleur.envoie(callCompRef.current, {
                    'call-peer-group': { offer, to: targetSocketId, teamId }
                });
            } catch (e) { console.error("Error creating mesh offer:", e); }
        }

        return pc;
    };

    const handleIncomingMeshOffer = async (senderSocket, offer, user) => {
        const teamId = currentTeamIdRef.current;
        console.log("Handle Incoming Mesh Offer from", senderSocket, offer);

        if (!offer || !offer.type || !offer.sdp) {
            console.error("Invalid offer received:", offer);
            return;
        }

        const pc = await createMeshConnection(senderSocket, false, teamId);
        
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            controleur.envoie(callCompRef.current, {
                'make-answer-group': { answer, to: senderSocket }
            });
        } catch (e) { console.error("Error handling mesh offer:", e); }
    };

    const closePeerConnection = (socketId) => {
        if (peerConnections.current[socketId]) {
            peerConnections.current[socketId].close();
            delete peerConnections.current[socketId];
            setRemoteStreams(prev => {
                const next = { ...prev };
                delete next[socketId];
                return next;
            });
        }
    };

    const cleanup = () => {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            setLocalStream(null);
        }
        Object.keys(peerConnections.current).forEach(sid => closePeerConnection(sid));
        setTeamCallStatus('idle');
        setCurrentTeamCallId(null);
        currentTeamIdRef.current = null;
    };
    
    // --- Toggles ---
    const toggleAudio = () => {
        if (localStream) {
            const track = localStream.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsAudioEnabled(track.enabled);
            }
        }
    };

    const toggleVideo = () => {
         if (localStream) {
            const track = localStream.getVideoTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsVideoEnabled(track.enabled);
            }
        }
    };

    return (
        <TeamCallContext.Provider value={{
            startTeamCall,
            joinTeamCall,
            leaveTeamCall,
            teamCallStatus,
            activeTeamCalls,
            localStream,
            remoteStreams,
            toggleAudio,
            toggleVideo,
            isAudioEnabled,
            isVideoEnabled,
            currentTeamCallId,
            isBusy
        }}>
            {children}
        </TeamCallContext.Provider>
    );
}
