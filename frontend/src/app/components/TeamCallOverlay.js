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
        pendingJoinRequests,
        acceptJoinRequest,
        rejectJoinRequest,
        leaveNotification,
    } = useTeamCall();

    const [isMinimized, setIsMinimized] = useState(false);
    const localVideoRef = useRef(null);
    const remoteVideoRefs = useRef({});

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
                remoteVideoRefs.current[socketId].srcObject = stream;
            }
        });
    }, [remoteStreams]);

    // Don't render if not in a call
    if (teamCallStatus !== 'connected' || !currentTeamCallId) {
        return null;
    }

    const hasLocalVideo = localStream?.getVideoTracks().some(t => t.enabled);
    const participantCount = 1 + Object.keys(remoteStreams).length; // Self + remotes

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

    // --- Styles ---
    const containerStyle = isMinimized ? {
        position: 'fixed',
        top: '69px', left: '0', right: '0',
        zIndex: 9999,
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none',
    } : {
        position: 'fixed',
        top: '69px', left: '0', right: '0', bottom: '0',
        zIndex: 9999,
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        pointerEvents: 'none',
        padding: '0 24px',
    };

    const panelStyle = isMinimized ? {
        background: '#FFFFFF',
        borderRadius: '12px',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        pointerEvents: 'auto',
        border: '1px solid #E2E8F0',
    } : {
        background: '#FFFFFF',
        width: '100%',
        maxWidth: '1200px',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
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

    // Control Bar Style
    const controlBarStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        borderTop: '1px solid #F1F5F9',
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

    // --- Render ---
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={containerStyle}
            >
                {/* Leave Notification Toast */}
                {leaveNotification && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: '80px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#FEF3C7',
                            color: '#92400E',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            zIndex: 10000,
                            fontWeight: 500,
                            pointerEvents: 'auto',
                        }}
                    >
                        {leaveNotification.firstname} a quitté l'appel
                    </motion.div>
                )}

                <motion.div layout style={panelStyle}>
                    {isMinimized ? (
                        // --- Minimized View ---
                        <>
                            {/* Thumbnail */}
                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#1E293B' }}>
                                {hasLocalVideo ? (
                                    <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>👤</div>
                                )}
                            </div>
                            
                            {/* Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: 600 }}>Appel d'équipe</span>
                                <span style={{ color: '#64748B', fontSize: '0.75rem' }}>{participantCount} participant{participantCount > 1 ? 's' : ''}</span>
                            </div>

                            {/* Controls */}
                            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                <button onClick={toggleAudio} style={{ ...buttonStyle(isAudioEnabled), width: '36px', height: '36px' }}>
                                    {isAudioEnabled ? <IconMic /> : <IconMicOff />}
                                </button>
                                <button onClick={toggleVideo} style={{ ...buttonStyle(isVideoEnabled), width: '36px', height: '36px' }}>
                                    {isVideoEnabled ? <IconCam /> : <IconCamOff />}
                                </button>
                                <button onClick={leaveTeamCall} style={{ ...hangupButtonStyle, width: '36px', height: '36px' }}>
                                    <IconHangup />
                                </button>
                                <button onClick={() => setIsMinimized(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                    <IconMaximize />
                                </button>
                            </div>
                        </>
                    ) : (
                        // --- Maximized View ---
                        <>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #F1F5F9' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0F172A' }}>Appel d'équipe</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{participantCount} participant{participantCount > 1 ? 's' : ''}</span>
                                </div>
                                <button onClick={() => setIsMinimized(true)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                    <IconMinimize />
                                </button>
                            </div>

                            {/* Pending Join Requests (Host Only) */}
                            {pendingJoinRequests && pendingJoinRequests.length > 0 && (
                                <div style={{ 
                                    background: '#FFFBEB', 
                                    border: '1px solid #FCD34D', 
                                    borderRadius: '8px', 
                                    margin: '16px 24px 0 24px', 
                                    padding: '12px 16px' 
                                }}>
                                    <div style={{ fontWeight: 600, color: '#92400E', marginBottom: '8px' }}>
                                        Demandes en attente ({pendingJoinRequests.length})
                                    </div>
                                    {pendingJoinRequests.map(req => (
                                        <div key={req.socketId} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: '8px 0',
                                            borderTop: '1px solid #FDE68A'
                                        }}>
                                            <span style={{ color: '#78350F' }}>{req.firstname} veut rejoindre</span>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => acceptJoinRequest(req.socketId)}
                                                    style={{
                                                        background: '#10B981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '6px 12px',
                                                        fontSize: '0.85rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✓ Accepter
                                                </button>
                                                <button
                                                    onClick={() => rejectJoinRequest(req.socketId)}
                                                    style={{
                                                        background: '#EF4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '6px 12px',
                                                        fontSize: '0.85rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✗ Refuser
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Video Grid */}
                            <div style={getGridStyle()}>
                                {/* Local Video (You) */}
                                <div style={tileStyle}>
                                    {hasLocalVideo ? (
                                        <video ref={localVideoRef} autoPlay muted playsInline style={videoStyle} />
                                    ) : (
                                        <div style={avatarPlaceholderStyle}>V</div>
                                    )}
                                    <div style={nameTagStyle}>
                                        {!isAudioEnabled && <span style={{ marginRight: '6px' }}>🔇</span>}
                                        Vous
                                    </div>
                                </div>

                                {/* Remote Videos */}
                                {Object.entries(remoteStreams).map(([socketId, stream]) => (
                                    <div key={socketId} style={tileStyle}>
                                        <video
                                            ref={el => { if (el) remoteVideoRefs.current[socketId] = el; }}
                                            autoPlay
                                            playsInline
                                            style={videoStyle}
                                        />
                                        <div style={nameTagStyle}>Participant</div>
                                    </div>
                                ))}
                            </div>

                            {/* Control Bar */}
                            <div style={controlBarStyle}>
                                <button onClick={toggleAudio} title="Micro" style={buttonStyle(isAudioEnabled)}>
                                    {isAudioEnabled ? <IconMic /> : <IconMicOff />}
                                </button>
                                <button onClick={toggleVideo} title="Caméra" style={buttonStyle(isVideoEnabled)}>
                                    {isVideoEnabled ? <IconCam /> : <IconCamOff />}
                                </button>
                                <button onClick={leaveTeamCall} title="Quitter" style={hangupButtonStyle}>
                                    <IconHangup />
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
