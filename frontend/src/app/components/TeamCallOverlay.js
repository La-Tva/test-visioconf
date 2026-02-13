"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useTeamCall } from '../context/TeamCallContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamCallOverlay() {
    const { 
        teamCallStatus, 
        localStream, 
        remoteStreams, 
        leaveTeamCall, 
        toggleAudio, 
        toggleVideo, 
        isAudioEnabled, 
        isVideoEnabled,
        currentTeamCallId,
        activeTeamCalls, // Need this for owner info
        pendingJoinRequests,
        acceptJoinRequest,
        rejectJoinRequest,
        leaveNotification,
        toggleScreenShare,
        isScreenSharing,
    } = useTeamCall();

    const [isMinimized, setIsMinimized] = useState(false);
    const [pinnedSocketId, setPinnedSocketId] = useState(null); // SocketID of pinned user
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Mobile Check (Moved to top to avoid conditional hook error)
    const [isMobileView, setIsMobileView] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobileView(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const localVideoRef = useRef(null);
    const remoteVideoRefs = useRef({});
    const overlayRef = useRef(null); // Ref for fullscreen container

    // Attach local stream to video element
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Attach remote streams to video elements
    useEffect(() => {
        Object.entries(remoteStreams).forEach(([socketId, stream]) => {
            if (remoteVideoRefs.current[socketId]) {
                const el = remoteVideoRefs.current[socketId];
                if (el.srcObject !== stream) el.srcObject = stream;
            }
        });
    }, [remoteStreams, pinnedSocketId]); // Re-attach on layout change if needed

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            overlayRef.current?.requestFullscreen().catch(e => console.error(e));
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(e => console.error(e));
            setIsFullscreen(false);
        }
    };

    // Listen for fullscreen change
    useEffect(() => {
        const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFSChange);
        return () => document.removeEventListener('fullscreenchange', handleFSChange);
    }, []);

    // Don't render if not in a call
    if (teamCallStatus !== 'connected' || !currentTeamCallId) {
        return null;
    }

    // --- Hero Logic ---
    const activeCall = activeTeamCalls[currentTeamCallId];
    const participantCount = activeCall ? activeCall.participants.length : 1;
    const ownerId = activeCall?.ownerId;
    
    // Find socketId of owner
    const ownerParticipant = activeCall?.participants?.find(p => p.userId === ownerId);
    let ownerSocketId = ownerParticipant?.socketId;
    
    // If we are the owner, identifying socket might be different or local
    // activeCall.participants includes US. So if we are owner, ownerSocketId should match our socket (if we knew it)
    // Actually, simple check: is ownerId our user id?
    // But we don't have our user ID in context easily exposed. 
    // Let's rely on finding ownerSocketId in remoteStreams OR assuming it's local if ownerParticipant is us.
    
    // Determine who is the "Hero" (Main View)
    // Order: Pinned > Owner (if remote or local) > First Remote > Local
    let heroSocketId = pinnedSocketId;
    
    if (!heroSocketId) {
        // Default to Owner if available and in the call (remote or local)
        if (ownerSocketId) {
            // Is this owner remote?
            if (remoteStreams[ownerSocketId]) heroSocketId = ownerSocketId;
            // Is this owner us? (We can't easily distinguish 'local' socketId here without context, 
            // but we can assume if not in remote, it might be us IF we are in list)
            // But let's check if ownerSocketId is in active participants list and we are not finding him in remote
            // logic: if ownerSocket is active but not in remote => It's US (Local).
             else if (!remoteStreams[ownerSocketId] && activeCall.participants.some(p => p.socketId === ownerSocketId)) {
                heroSocketId = 'local';
             }
        }
    }
    
    // Fallback if no owner found or owner not connected yet
    if (!heroSocketId) {
        const firstRemote = Object.keys(remoteStreams)[0];
        heroSocketId = firstRemote || 'local';
    }

    const hasLocalVideo = localStream?.getVideoTracks().some(t => t.enabled);
    
    // Get current user info
    const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null;
    const currentUser = userStr ? JSON.parse(userStr) : null;
    
    // Helper function to get participant display name
    const getParticipantName = (socketId, isLocal = false) => {
        if (isLocal) {
            const firstName = currentUser?.firstname || 'Vous';
            const isOwner = currentUser?._id === ownerId;
            return isOwner ? `${firstName} (hôte)` : firstName;
        }
        
        const participant = activeCall?.participants?.find(p => p.socketId === socketId);
        const firstName = participant?.user?.firstname || participant?.firstname || 'Participant';
        const isOwner = participant?.userId === ownerId;
        return isOwner ? `${firstName} (hôte)` : firstName;
    };
    
    // List of "Side" participants (everyone except Hero)
    const sideParticipants = [];
    if (heroSocketId !== 'local') sideParticipants.push('local');
    Object.keys(remoteStreams).forEach(sid => {
        if (sid !== heroSocketId) sideParticipants.push(sid);
    });

    const isHeroLocal = heroSocketId === 'local';

    // --- SVG Icons ---
    const IconMic = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    );
    const IconMicOff = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
    );
    const IconCam = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z"></path>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
    );
    const IconCamOff = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    );
    const IconHangup = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
            <line x1="23" y1="1" x2="1" y2="23"></line>
        </svg>
    );
    const IconMinimize = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 12h8"></path>
        </svg>
    );
    const IconMaximize = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>
        </svg>
    );
    const IconScreen = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
    );
    const IconScreenOff = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    );
    const IconFullscreen = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
        </svg>
    );
    const IconFullscreenExit = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
        </svg>
    );

    // --- Styles ---
    const containerStyle = isMinimized ? {
        position: 'fixed',
        top: '69px', left: '0', right: '0',
        zIndex: 9999,
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none',
    } : {
        position: 'fixed',
        top: '0', left: '0', right: '0', bottom: '0', // Full screen overlay
        zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        pointerEvents: 'none',
        padding: '0',
    };

    const panelStyle = isMinimized ? {
        background: '#FFFFFF',
        borderRadius: '16px',
        overflow: 'hidden', // Contain video
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        pointerEvents: 'auto',
        border: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        width: '360px', // Larger width ("entre deux")
    } : {
        background: '#FFFFFF',
        width: '98vw', // Almost full width
        height: '92vh', // Almost full height
        maxWidth: 'none', // Remove limit
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #F1F5F9',
    };

    // Video Grid: dynamic columns based on participant count
    const getGridStyle = () => {
        const cols = participantCount <= 1 ? 1 : participantCount <= 4 ? 2 : 3;
        return {
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '8px',
            padding: '16px',
            background: '#1E293B', // Dark background for video area (Zoom-like)
            borderRadius: '16px',
            margin: '16px',
            minHeight: '400px',
        };
    };

    // Video Tile Style
    const tileStyle = {
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#0F172A',
        aspectRatio: '16 / 9',
    };

    const videoStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    };

    const nameTagStyle = {
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        padding: '4px 12px',
        borderRadius: '6px',
        color: 'white',
        fontSize: '0.85rem',
        fontWeight: 500,
    };

    const avatarPlaceholderStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        color: 'white',
        fontWeight: 600,
    };

    // Control Bar Style (Floating, Glassmorphism)
    const controlBarStyle = {
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 24px',
        background: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)',
        borderRadius: '9999px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 50,
    };

    const buttonStyle = (isActive, isDanger = false) => ({
        background: isDanger ? '#FEF2F2' : (isActive ? '#EFF6FF' : '#FEF2F2'),
        border: 'none',
        borderRadius: '8px',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isDanger ? '#EF4444' : (isActive ? '#3B82F6' : '#EF4444'),
        cursor: 'pointer',
        transition: 'all 0.2s',
    });

    const hangupButtonStyle = {
        background: '#EF4444',
        border: 'none',
        borderRadius: '8px',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        cursor: 'pointer',
        marginLeft: '16px',
    };

    // --- Hero Layout Styles ---
    const heroContainerStyle = {
        flex: 1,
        width: '100%',
        position: 'relative',
        background: '#000',
        borderRadius: '16px',
        overflow: 'hidden',
        minHeight: '0',
    };

    // --- Render ---
    return (
        <AnimatePresence>
            <motion.div
                ref={overlayRef}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={containerStyle}
            >

                {/* Removed leave notification toast */}

                <motion.div ref={overlayRef} layout style={{
                    ...panelStyle, 
                    ...(isMobileView ? { width: '100%', height: '100%', borderRadius: 0, border: 'none' } : {})
                }}>
                    {isMinimized ? (
                        // --- Minimized View ("Entre deux") ---
                        <>
                            {/* Video Area (Main Participant/Host) */}
                            <div style={{ width: '100%', height: '200px', background: '#000', position: 'relative' }}>
                                {isHeroLocal ? (
                                    <video 
                                        ref={localVideoRef} 
                                        autoPlay 
                                        muted 
                                        playsInline 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                ) : (
                                    <video 
                                        ref={el => {
                                            if (el) {
                                                remoteVideoRefs.current[heroSocketId] = el;
                                                // Re-attach stream if needed (Effect handles this, but safe to check)
                                                if (remoteStreams[heroSocketId] && el.srcObject !== remoteStreams[heroSocketId]) {
                                                    el.srcObject = remoteStreams[heroSocketId];
                                                }
                                            }
                                        }}
                                        autoPlay 
                                        playsInline 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                )}
                                
                                {/* Name Tag */}
                                <div style={{ 
                                    position: 'absolute', bottom: '8px', left: '8px', 
                                    background: 'rgba(0,0,0,0.6)', color: 'white', 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' 
                                }}>
                                    {getParticipantName(heroSocketId, isHeroLocal)}
                                </div>
                            </div>
                            
                            {/* Controls & Status Bar */}
                            <div style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1E293B' }}>Appel en cours</span>
                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{participantCount} participants</span>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={toggleAudio} style={{ ...buttonStyle(isAudioEnabled), width: '32px', height: '32px' }}>
                                        {isAudioEnabled ? <IconMic /> : <IconMicOff />}
                                    </button>
                                    <button onClick={leaveTeamCall} style={{ ...hangupButtonStyle, width: '32px', height: '32px', marginLeft: 0 }}>
                                        <IconHangup />
                                    </button>
                                    <button onClick={() => setIsMinimized(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <IconMaximize />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        // --- Maximized View ---
                        <>
                            {/* Header (Hidden in Fullscreen Mobile to save space?) No keep it for exit */}
                            {!isFullscreen && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobileView ? '12px 16px' : '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>Appel d'équipe</h3>
                                        <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{participantCount} participant{participantCount > 1 ? 's' : ''}</span>
                                    </div>
                                    <button onClick={() => setIsMinimized(true)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                        <IconMinimize />
                                    </button>
                                </div>
                            )}

                            {/* Pending Join Requests (Host Only) */}
                            {pendingJoinRequests && pendingJoinRequests.length > 0 && (
                                <div style={{ background: '#FFF7ED', padding: '12px 24px', borderBottom: '1px solid #FFEDD5' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#9A3412' }}>Demandes ({pendingJoinRequests.length})</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {pendingJoinRequests.map(req => (
                                            <div key={req.socketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <img src={`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'}/${req.picture}`} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{req.firstname}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => acceptJoinRequest(req.socketId)} style={{ background: '#22C55E', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>Accepter</button>
                                                    <button onClick={() => rejectJoinRequest(req.socketId)} style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>Refuser</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isFullscreen ? '0' : (isMobileView ? '0' : '0 16px'), gap: '8px', minHeight: 0, justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                
                                {isMobileView ? (
                                    /* --- MOBILE VIEW (Simplified: Host Video + Avatars) --- */
                                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',  background: '#0F172A' }}>
                                        
                                        {/* 1. HOST VIDEO AREA (Takes most space) */}
                                        <div style={{ flex: 1, position: 'relative', overflow:'hidden', borderRadius: isFullscreen ? 0 : '0 0 16px 16px' }}>
                                            {/* Logic to find Host Video */}
                                            {(() => {
                                                // Find Host Socket ID - Re-using logic from top but being explicit
                                                // If we are owner, localStream is host. If remote is owner, remoteStream is host.
                                                let hostVidStream = null;
                                                let isLocalHost = currentUser?._id === ownerId;
                                                
                                                if (isLocalHost) {
                                                    hostVidStream = localStream;
                                                } else if (ownerSocketId && remoteStreams[ownerSocketId]) {
                                                    hostVidStream = remoteStreams[ownerSocketId];
                                                }

                                                // Fallback: If no host video is found (e.g. host waiting), maybe show placeholder or Active Speaker?
                                                // Prompt says "on voit que la cam de l'hôte".
                                                
                                                if (hostVidStream) {
                                                    return (
                                                        <video 
                                                            ref={el => {
                                                                if(el && el.srcObject !== hostVidStream) el.srcObject = hostVidStream;
                                                                // Handle refs appropriately if needed, but for display this is enough
                                                            }} 
                                                            autoPlay 
                                                            muted={isLocalHost} // Mute if it's us 
                                                            playsInline 
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                        />
                                                    );
                                                } else {
                                                    // Host not sending video or not connected? Show Avatar
                                                    return (
                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B', color: 'white', flexDirection: 'column' }}>
                                                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                                                                {activeCall?.owner?.firstname?.charAt(0).toUpperCase() || 'H'}
                                                            </div>
                                                            <span>L'hôte n'a pas activé sa caméra</span>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                            
                                            <div style={{ position: 'absolute', bottom: '16px', left:'16px', background:'rgba(0,0,0,0.6)', color:'white', padding:'4px 12px', borderRadius:'6px', fontSize:'14px' }}>
                                                Hôte
                                            </div>
                                        </div>

                                        {/* 2. PARTICIPANTS STRIP (Bottom, Avatars Only) */}
                                        <div style={{ height: '80px', background: '#1E293B', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px', overflowX: 'auto' }}>
                                            {/* Me (if not host) */}
                                            {currentUser?._id !== ownerId && (
                                                <div style={{ minWidth: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#334155', border: '2px solid #3B82F6', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                                                        <span style={{color:'white', fontWeight:'600'}}>Moi</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Others (Host excluded) */}
                                            {(() => {
                                                const others = activeCall?.participants?.filter(p => p.userId !== ownerId && p.userId !== currentUser?._id) || [];
                                                const maxDisplay = 9;
                                                const displayOthers = others.slice(0, maxDisplay);
                                                const overflow = others.length - maxDisplay;

                                                return (
                                                    <>
                                                        {displayOthers.map(p => (
                                                            <div key={p.socketId} style={{ minWidth: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#475569', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'600' , overflow:'hidden' }}>
                                                                    {p.user?.picture && !p.user.picture.includes('default') ? (
                                                                         <img src={`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'}/${p.user.picture}`} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                                                    ) : (
                                                                         p.user?.firstname?.charAt(0) || p.firstname?.charAt(0) || '?'
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {overflow > 0 && (
                                                            <div style={{ minWidth: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#64748B', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:'bold' }}>
                                                                    +{overflow}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <div style={{height: '100px'}}></div> {/* Spacer for controls */}
                                    </div>
                                ) : isFullscreen ? (
                                    /* --- DESKTOP FULLSCREEN (Single Focused View) --- */
                                    <div style={{ width: '100%', height: '100%', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isHeroLocal ? (
                                             <video ref={el => { if(el && localStream && el.srcObject !== localStream) el.srcObject = localStream; localVideoRef.current = el; }} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                             <video ref={el => { if (el) { remoteVideoRefs.current[heroSocketId] = el; if (remoteStreams[heroSocketId] && el.srcObject !== remoteStreams[heroSocketId]) el.srcObject = remoteStreams[heroSocketId]; } }} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        )}
                                        <div style={{...nameTagStyle, fontSize: '14px', padding: '6px 12px'}}>
                                            {getParticipantName(heroSocketId, isHeroLocal)} 
                                        </div>
                                    </div>
                                ) : (
                                    /* --- DESKTOP VIEW (Reverted Grid - Uniform) --- */
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', // Standard Grid
                                        gridAutoFlow: 'dense',
                                        gap: '12px', // Slightly larger gap
                                        width: '100%',
                                        height: '100%',
                                        padding: '16px 16px 100px 16px',
                                        overflowY: 'auto',
                                        alignContent: 'center', // Center vertically if few items
                                        justifyContent: 'center' 
                                    }}>
                                        {/* Local Video Tile */}
                                        <div style={{ ...tileStyle, border: pinnedSocketId === 'local' ? '3px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)' }} onClick={() => setPinnedSocketId(pinnedSocketId === 'local' ? null : 'local')}>
                                            <video ref={el => { if(el && localStream && el.srcObject !== localStream) el.srcObject = localStream; localVideoRef.current = el; }} autoPlay muted playsInline style={videoStyle} />
                                            <div style={nameTagStyle}>{getParticipantName('local', true)} (Vous)</div>
                                        </div>

                                        {/* Remote Video Tiles */}
                                        {Object.keys(remoteStreams).map(sid => (
                                            <div key={sid} style={{ ...tileStyle, border: pinnedSocketId === sid ? '3px solid #3B82F6' : '1px solid rgba(255,255,255,0.1)' }} onClick={() => setPinnedSocketId(pinnedSocketId === sid ? null : sid)}>
                                                <video ref={el => { if (el) { remoteVideoRefs.current[sid] = el; if (remoteStreams[sid] && el.srcObject !== remoteStreams[sid]) el.srcObject = remoteStreams[sid]; } }} autoPlay playsInline style={videoStyle} />
                                                <div style={nameTagStyle}>{getParticipantName(sid, false)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Control Bar (Floating) */}
                            <div style={controlBarStyle}>
                                <button onClick={toggleAudio} title="Micro" style={{...buttonStyle(isAudioEnabled), borderRadius: '50%', width: '56px', height: '56px' }}>
                                    {isAudioEnabled ? <IconMic /> : <IconMicOff />}
                                </button>
                                <button onClick={toggleVideo} title="Caméra" style={{...buttonStyle(isVideoEnabled), borderRadius: '50%', width: '56px', height: '56px' }}>
                                    {isVideoEnabled ? <IconCam /> : <IconCamOff />}
                                </button>
                                <button onClick={toggleScreenShare} title="Partager l'écran" style={{
                                    background: isScreenSharing ? '#3B82F6' : '#1E293B',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '50%',
                                    width: '56px',
                                    height: '56px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}>
                                    {isScreenSharing ? <IconScreen /> : <IconScreenOff />}
                                </button>
                                <button onClick={leaveTeamCall} title="Quitter" style={{...hangupButtonStyle, borderRadius: '50%', width: '56px', height: '56px'}}>
                                    <IconHangup />
                                </button>
                                <button onClick={async () => {
                                     // Robust Fullscreen Toggle
                                     if (!isFullscreen) {
                                        try {
                                             await overlayRef.current?.requestFullscreen();
                                        } catch(e) { console.warn("FS API fail", e); }
                                        setIsFullscreen(true);
                                     } else {
                                        try {
                                             await document.exitFullscreen();
                                        } catch(e) {}
                                        setIsFullscreen(false);
                                     }
                                }} title="Plein écran" style={{...buttonStyle(false), background: '#1E293B', color: 'white', borderRadius: '50%', width: '56px', height: '56px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
