"use client";
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useSounds } from './SoundContext';

const TeamCallContext = createContext();

export function useTeamCall() {
    return useContext(TeamCallContext);
}

const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Free TURN servers for production NAT traversal
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject', 
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

export function TeamCallProvider({ children }) {
    const { controleur, isReady } = useSocket();
    const { playCallStart, playCallEnd, playUserJoin, playUserLeave } = useSounds();
    
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
    const [pendingJoinRequests, setPendingJoinRequests] = useState([]); // Host sees these requests
    const [joinRequestStatus, setJoinRequestStatus] = useState('idle'); // 'idle' | 'pending' | 'accepted' | 'rejected'
    const [leaveNotification, setLeaveNotification] = useState(null); // { firstname } - shows toast when someone leaves

    // Refs
    const peerConnections = useRef({}); // socketId -> RTCPeerConnection
    const callCompRef = useRef(null);
    const localVideoRef = useRef(null); // Optional ref if we want to manage it here, but Overlay handles it usually
    const currentTeamIdRef = useRef(null); // For access in callbacks
    const localStreamRef = useRef(null); // For access in callbacks (avoids stale closure)

    // --- Socket Setup ---
    useEffect(() => {
        if (!controleur || !isReady) return;

        const callComp = {
            nomDInstance: "TeamCallComponent",
            traitementMessage: (msg) => {
                // 1. Status Updates (Who is in the call)
                if (msg['team-call-status']) {
                    const { teamId, active, participants, ownerId } = msg['team-call-status'];
                    setActiveTeamCalls(prev => ({
                        ...prev,
                        [teamId]: { active, participants, ownerId }
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
                    const { offer, socket: senderSocket, user, teamId, renegotiation } = msg['call-made-group'];
                    // Only accept if we are in the SAME team call or if this is an invitation?
                    // For Mesh, we only accept if we are ALREADY "connected" or "joining" this team call?
                    // Actually, if we are 'idle', this acts as an invitation we ignore visually (handled by UI "Join" button),
                    // BUT for the "Start Call" flow, the owner is "connected".
                    // Wait, 'call-made-group' is sent by server on 'call-team' broadcast too. 
                    
                    if (currentTeamIdRef.current === teamId) {
                        console.log("Accepting Mesh Offer from:", senderSocket);
                        handleIncomingMeshOffer(senderSocket, offer, user, renegotiation);
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
                        playCallEnd();
                        cleanup();
                        alert("L'hôte a terminé l'appel.");
                    }
                }

                // 7. MESH FIX: New joiner notification -> Existing participant initiates connection
                else if (msg['notify-new-joiner']) {
                    const { teamId, newJoinerSocketId, newJoinerUser } = msg['notify-new-joiner'];
                    if (currentTeamIdRef.current === teamId && newJoinerSocketId !== controleur.socketID) {
                        console.log(`[MESH] Received notify-new-joiner for ${newJoinerSocketId}. Initiating connection...`);
                        playUserJoin();
                        createMeshConnection(newJoinerSocketId, true, teamId);
                    }
                }

                // 8. JOIN REQUEST: Host receives a join request from a member
                else if (msg['join-request-received']) {
                    const { teamId, requester } = msg['join-request-received'];
                    if (currentTeamIdRef.current === teamId) {
                        console.log(`Join request received from ${requester.firstname}`);
                        setPendingJoinRequests(prev => {
                            // Avoid duplicates
                            if (prev.some(r => r.socketId === requester.socketId)) return prev;
                            return [...prev, requester];
                        });
                    }
                }

                // 9. JOIN REQUEST STATUS: Member gets response from host
                else if (msg['join-request-status']) {
                    const { teamId, status } = msg['join-request-status'];
                    console.log(`Join request status: ${status}`);
                    setJoinRequestStatus(status);
                    
                    if (status === 'accepted') {
                        // Request approved! We are now officially in the call
                        playCallStart();
                        setTeamCallStatus('connected');
                        setCurrentTeamCallId(teamId);
                        currentTeamIdRef.current = teamId;
                        setIsBusy(false);
                        // The mesh connections will be initiated by existing participants (notify-new-joiner)
                    } else if (status === 'rejected') {
                        // Request rejected
                        alert("Votre demande a été refusée par l'hôte.");
                        cleanup();
                    } else if (status === 'no_call') {
                        alert("L'appel n'existe plus.");
                        cleanup();
                    }
                }

                // 10. Participant left notification (with name)
                else if (msg['participant-left-notification']) {
                    const { teamId, firstname } = msg['participant-left-notification'];
                    if (currentTeamIdRef.current === teamId) {
                        console.log(`${firstname} a quitté l'appel.`);
                        playUserLeave();
                        // Show toast notification
                        setLeaveNotification({ firstname });
                        // Auto-clear after 3 seconds
                        setTimeout(() => setLeaveNotification(null), 3000);
                    }
                }
            }
        };

        callCompRef.current = callComp;
        console.log("Registering TeamCallComponent with Controleur...");
        controleur.inscription(callComp, 
            ['call-peer-group', 'make-answer-group', 'ice-candidate-group', 'call-team', 'leave-group-call', 'join-request-response'], // Emission (Send)
            ['call-made-group', 'answer-made-group', 'ice-candidate-group', 'team-call-status', 'participant-left', 'team-call-ended', 'notify-new-joiner', 'join-request-received', 'join-request-status', 'participant-left-notification'] // Subscription (Receive)
        );

        return () => {
             console.log("Unregistering TeamCallComponent...");
             controleur.desincription(callComp, 
                ['call-peer-group', 'make-answer-group', 'ice-candidate-group', 'call-team', 'leave-group-call', 'join-request-response'], 
                ['call-made-group', 'answer-made-group', 'ice-candidate-group', 'team-call-status', 'participant-left', 'team-call-ended', 'notify-new-joiner', 'join-request-received', 'join-request-status', 'participant-left-notification']
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
            localStreamRef.current = stream; // Update ref for callbacks
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
        setJoinRequestStatus('pending'); // Show "waiting for approval" UI
        
        try {
             // Stop existing tracks if any
             if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }

            // Join with AUDIO ONLY (User sees others, but sends no video)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            
            setLocalStream(stream);
            localStreamRef.current = stream; // Update ref for callbacks
            setIsAudioEnabled(true);
            setIsVideoEnabled(false);

            // DON'T set connected yet - we need host approval first
            // The status will be set to 'connected' when join-request-status: accepted is received

            // Send join REQUEST to server (server forwards to host)
            controleur.envoie(callCompRef.current, {
                'call-team': { teamId } 
            });

            console.log("[JOIN] Request sent to host. Waiting for approval...");
            // isBusy stays true until response is received (handled in message handler)

        } catch (e) {
            console.error("Error joining team call:", e);
            alert("Erreur d'accès aux médias. Vérifiez votre caméra.");
            setJoinRequestStatus('idle');
            setIsBusy(false);
        }
        // Note: setIsBusy(false) is now handled in the join-request-status handler
    };

    const leaveTeamCall = async () => {
        if (isBusy) return; // Prevent double-clicking
        setIsBusy(true);
        
        const teamIdToLeave = currentTeamCallId;
        
        // Cleanup local state first
        cleanup();
        
        if (teamIdToLeave) {
            // Notify server
            controleur.envoie(callCompRef.current, {
                 'leave-group-call': { teamId: teamIdToLeave }
            });
        }
        
        // Small delay to let server fully process before allowing rejoin
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsBusy(false);
    };

    // --- Host: Accept/Reject Join Requests ---

    const acceptJoinRequest = (requesterSocketId) => {
        if (!currentTeamCallId) return;
        
        // Send acceptance to server
        controleur.envoie(callCompRef.current, {
            'join-request-response': {
                teamId: currentTeamCallId,
                requesterSocketId,
                accepted: true
            }
        });
        
        // Remove from local pending list
        setPendingJoinRequests(prev => prev.filter(r => r.socketId !== requesterSocketId));
    };

    const rejectJoinRequest = (requesterSocketId) => {
        if (!currentTeamCallId) return;
        
        // Send rejection to server
        controleur.envoie(callCompRef.current, {
            'join-request-response': {
                teamId: currentTeamCallId,
                requesterSocketId,
                accepted: false
            }
        });
        
        // Remove from local pending list
        setPendingJoinRequests(prev => prev.filter(r => r.socketId !== requesterSocketId));
    };

    // --- Mesh Helpers ---

    const createMeshConnection = async (targetSocketId, isInitiator, teamId) => {
        // If we already have a connection, close it first to handle reconnects
        // (in case participant-left wasn't received before rejoin)
        if (peerConnections.current[targetSocketId]) {
            console.log(`Closing existing connection to ${targetSocketId} before creating new one`);
            closePeerConnection(targetSocketId);
        }

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
            console.log(`Received track from ${targetSocketId}: ${event.track.kind}`);
            if (event.streams[0]) {
                setRemoteStreams(prev => ({
                    ...prev,
                    [targetSocketId]: event.streams[0]
                }));
            }
        };

        // Handle renegotiation when tracks are added dynamically
        pc.onnegotiationneeded = async () => {
            console.log(`[RENEGOTIATION] Negotiation needed for ${targetSocketId}`);
            try {
                // Only the initiator should create offers during renegotiation
                // to avoid offer collision (glare)
                if (pc.signalingState === 'stable') {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    controleur.envoie(callCompRef.current, {
                        'call-peer-group': { 
                            offer, 
                            to: targetSocketId, 
                            teamId: currentTeamIdRef.current,
                            renegotiation: true 
                        }
                    });
                    console.log(`[RENEGOTIATION] Sent new offer to ${targetSocketId}`);
                }
            } catch (e) {
                console.error("Error during renegotiation:", e);
            }
        };

        // Add Local Tracks (use ref to avoid stale closure)
        const currentStream = localStreamRef.current;
        if (currentStream) {
            console.log(`Adding ${currentStream.getTracks().length} tracks to peer connection`);
            currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));
        } else {
            console.warn("No local stream available when creating mesh connection!");
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

    const handleIncomingMeshOffer = async (senderSocket, offer, user, isRenegotiation = false) => {
        const teamId = currentTeamIdRef.current;
        console.log(`Handle Incoming Mesh Offer from ${senderSocket} (renegotiation: ${isRenegotiation})`);

        if (!offer || !offer.type || !offer.sdp) {
            console.error("Invalid offer received:", offer);
            return;
        }

        let pc = peerConnections.current[senderSocket];
        
        // If it's a renegotiation and we have an existing connection, reuse it
        if (isRenegotiation && pc && pc.signalingState !== 'closed') {
            console.log(`[RENEGOTIATION] Reusing existing connection for ${senderSocket}`);
        } else {
            // Create new connection for initial offer
            pc = await createMeshConnection(senderSocket, false, teamId);
        }
        
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            controleur.envoie(callCompRef.current, {
                'make-answer-group': { answer, to: senderSocket }
            });
            console.log(`Sent answer to ${senderSocket}`);
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
        localStreamRef.current = null; // Reset ref for next call
        Object.keys(peerConnections.current).forEach(sid => closePeerConnection(sid));
        setTeamCallStatus('idle');
        setCurrentTeamCallId(null);
        currentTeamIdRef.current = null;
        setPendingJoinRequests([]); // Clear pending requests
        setJoinRequestStatus('idle'); // Reset request status
        setIsBusy(false); // Reset busy state
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

    const toggleVideo = async () => {
        if (!localStream) return;
        
        const existingVideoTrack = localStream.getVideoTracks()[0];
        
        if (existingVideoTrack) {
            // If we have a video track, toggle it
            existingVideoTrack.enabled = !existingVideoTrack.enabled;
            setIsVideoEnabled(existingVideoTrack.enabled);
        } else {
            // No video track exists - need to add one (member joined audio-only)
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                const videoTrack = videoStream.getVideoTracks()[0];
                
                // Add to local stream
                localStream.addTrack(videoTrack);
                localStreamRef.current = localStream;
                setIsVideoEnabled(true);
                
                // Add video track to all existing peer connections
                Object.values(peerConnections.current).forEach(pc => {
                    if (pc.signalingState !== 'closed') {
                        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                        if (sender) {
                            sender.replaceTrack(videoTrack);
                        } else {
                            pc.addTrack(videoTrack, localStream);
                        }
                    }
                });
                
                console.log("[TOGGLE VIDEO] Added new video track for audio-only participant");
            } catch (e) {
                console.error("Error adding video track:", e);
                alert("Impossible d'accéder à la caméra.");
            }
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop Screen Share -> Revert to Camera
            if (localStream) {
                 const videoTrack = localStream.getVideoTracks()[0];
                 if (videoTrack) {
                      Object.values(peerConnections.current).forEach(pc => {
                           const sender = pc.getSenders().find(s => s.track.kind === 'video');
                           if (sender) sender.replaceTrack(videoTrack);
                      });
                 }
            }
            setIsScreenSharing(false);
            // We don't stop the screen track explicitly here if it was already stopped via browser UI, 
            // but if we triggered it via button, we might need to. 
            // Actually, we usually replace the track in the *localStream* specifically? 
            // No, for Mesh, we keep localStream as "Source of Truth" for visual feedback? 
            // Let's keep localStream as CAMERA usually. 
            // We just swap what is sent.
        } else {
             try {
                 const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                 const screenTrack = screenStream.getVideoTracks()[0];
                 
                 // Handle "Stop Sharing" from Browser UI
                 screenTrack.onended = () => {
                      if (localStream) {
                           const camTrack = localStream.getVideoTracks()[0];
                           if (camTrack) {
                                Object.values(peerConnections.current).forEach(pc => {
                                     const sender = pc.getSenders().find(s => s.track.kind === 'video');
                                     if (sender) sender.replaceTrack(camTrack);
                                });
                           }
                      }
                      setIsScreenSharing(false);
                 };

                 Object.values(peerConnections.current).forEach(pc => {
                      const sender = pc.getSenders().find(s => s.track.kind === 'video');
                      if (sender) sender.replaceTrack(screenTrack);
                 });
                 
                 setIsScreenSharing(true);
                 // We could setLocalStream(screenStream) to see what we share, 
                 // but ideally we want to see our camera in "Preview" maybe?
                 // For now, let's update localStream to show the screen share to the user too.
                 // This makes "Mute Video" button confused though.
                 // Best practice: Keep localStream as "Self View".
                 // But Zoom shows your screen in your box.
                 // Let's swap the track in localStream too? 
                 // No, localStream is a collection of tracks. 
                 // Let's just rely on the fact we are sending it. 
                 // But the UI uses `localStream` to render `<video ref={localVideoRef} />`.
                 // So we SHOULD update localStream to show the screen share locally.
                 
                 // However, we must NOT lose the camera track reference to switch back!
                 // The camera track is still in the original `localStream` object if we saved it?
                 // `localStream` is state.
                 // Let's NOT mutate localStream track. 
                 // Let's assume the UI will show "You are sharing screen" overlay.
             } catch (e) {
                 console.error("Error sharing screen:", e);
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
            toggleScreenShare,
            isScreenSharing,
            currentTeamCallId,
            isBusy,
            // Join Request System
            pendingJoinRequests,
            joinRequestStatus,
            acceptJoinRequest,
            rejectJoinRequest,
            leaveNotification
        }}>
            {children}
        </TeamCallContext.Provider>
    );
}
