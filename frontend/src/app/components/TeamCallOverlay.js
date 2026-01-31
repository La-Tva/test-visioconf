"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useTeamCall } from '../context/TeamCallContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeamCallOverlay() {
    const { 
        teamCallStatus, 
        activeTeamCalls, 
        currentTeamCallId,
        localStream, 
        remoteStreams, 
        leaveTeamCall, 
        toggleAudio, 
        toggleVideo, 
        isAudioEnabled, 
        isVideoEnabled 
    } = useTeamCall();

    const [isMinimized, setIsMinimized] = useState(false);
    const localVideoRef = useRef(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isMinimized]); // Re-attach on resize

    if (teamCallStatus !== 'connected' || !currentTeamCallId) return null;

    const currentCall = activeTeamCalls[currentTeamCallId];
    // We need to map socketIds to participants to get names
    const getParticipantInfo = (socketId) => {
        if (!currentCall || !currentCall.participants) return {};
        const p = currentCall.participants.find(p => p.socketId === socketId);
        return p ? p.user : {};
    };

    const backdropStyle = isMinimized ? {

        position: 'fixed',
        top: '120px', // Near top, just below header
        left: '50%',
        transform: 'translateX(-50%)', // Centered horizontally only
        width: '800px',
        height: '160px', // Horizontal strip
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        zIndex: 9999,
        borderRadius: '24px',
        boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'row', // Horizontal layout
        alignItems: 'center',
        padding: '0 16px',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
    } : {
        position: 'fixed',
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        width: '70%',
        height: '70%',
        background: '#ffffff', // Pure White
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.05)'
    };

    const gridStyle = isMinimized ? {
        display: 'flex',
        flexDirection: 'row', // Horizontal stack
        gap: '12px',
        padding: '0 16px',
        overflowX: 'auto', // Scroll horizontally
        overflowY: 'hidden',
        alignItems: 'center',
        flex: 1,
        height: '100%'
    } : {
        flex: 1, 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '24px',
        padding: '40px',
        alignContent: 'center',
        justifyContent: 'center',
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
    };

    const floatingControlBarStyle = isMinimized ? {
        display: 'flex',
        flexDirection: 'row',
        gap: '12px',
        padding: '0 0 0 16px',
        borderLeft: '1px solid rgba(0,0,0,0.05)', // Separator
        height: '60%',
        alignItems: 'center'
    } : {
        position: 'absolute',
        bottom: '32px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '24px',
        background: 'transparent',
        zIndex: 10
    };

    return (
        <div style={backdropStyle}>
            {/* Header / Top Bar */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: isMinimized ? '16px' : '24px 32px',
                color: '#1e293b', // Dark Text
                background: isMinimized ? 'transparent' : 'rgba(255,255,255,0.5)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     {!isMinimized && <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', color:'#0f172a' }}>Appel d'équipe</h2>}
                     <div style={{ background: 'rgba(0,0,0,0.05)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', border:'1px solid rgba(0,0,0,0.05)' }}>
                        <span style={{width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow:'0 0 10px rgba(16, 185, 129, 0.4)'}}></span>
                        <span style={{fontWeight:500, color:'#334155'}}>{Object.keys(remoteStreams).length + 1} participant(s)</span>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsMinimized(!isMinimized)} 
                    style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: '#334155', cursor: 'pointer', padding: 8, borderRadius: '12px', transition:'background 0.2s' }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(0,0,0,0.1)'}
                    onMouseOut={(e) => e.target.style.background = 'rgba(0,0,0,0.05)'}
                >
                    {isMinimized ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg> // Expand
                    ) : ( 
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/></svg> // Minimize
                    )}
                </button>
            </div>

            {/* Grid */}
            <div style={gridStyle}>
                {/* Local Video */}
                <div style={{ 
                    position: 'relative', 
                    borderRadius: isMinimized ? '12px' : '24px', 
                    overflow: 'hidden', 
                    background: '#1E293B', 
                    aspectRatio: '16/9',
                    width: isMinimized ? '48%' : 'auto',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <video 
                        ref={localVideoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                    />
                     <div style={{ position: 'absolute', bottom: isMinimized ? '6px' : '16px', left: isMinimized ? '6px' : '16px', background: 'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', color: 'white', padding: isMinimized ? '2px 6px' : '6px 12px', borderRadius: '8px', fontSize: isMinimized ? '0.65rem' : '0.85rem', fontWeight: 500 }}>
                        Moi {isMinimized ? '' : '(Vous)'}
                    </div>
                </div>

                {/* Remote Videos */}
                {Object.entries(remoteStreams).map(([socketId, stream]) => {
                    const user = getParticipantInfo(socketId);
                    return (
                        <div key={socketId} style={{ 
                            position: 'relative', 
                            borderRadius: isMinimized ? '12px' : '24px', 
                            overflow: 'hidden', 
                            background: '#1E293B', 
                            aspectRatio: '16/9',
                            width: isMinimized ? '48%' : 'auto',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {isMinimized ? (
                                <RemoteParticipantMinimized stream={stream} user={user} />
                            ) : (
                                <RemoteParticipant stream={stream} user={user} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Controls */}
            <div style={floatingControlBarStyle}>
                <ControlButton onClick={toggleAudio} active={isAudioEnabled} isMinimized={isMinimized} iconOn={
                   <svg width={isMinimized ? 18 : 24} height={isMinimized ? 18 : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                } iconOff={
                    <svg width={isMinimized ? 18 : 24} height={isMinimized ? 18 : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                } danger={!isAudioEnabled} />

                <ControlButton onClick={toggleVideo} active={isVideoEnabled} isMinimized={isMinimized} iconOn={
                    <svg width={isMinimized ? 18 : 24} height={isMinimized ? 18 : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                } iconOff={
                    <svg width={isMinimized ? 18 : 24} height={isMinimized ? 18 : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                } danger={!isVideoEnabled} />

                <ControlButton onClick={leaveTeamCall} active={true} isMinimized={isMinimized} iconOn={
                    <svg width={isMinimized ? 18 : 24} height={isMinimized ? 18 : 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                } danger={true} />
            </div>
        </div>
    );
}

function ControlButton({ onClick, active, isMinimized, iconOn, iconOff, danger }) {
    return (
        <button onClick={onClick} style={{ 
            width: isMinimized ? '48px' : '60px', 
            height: isMinimized ? '48px' : '60px', 
            borderRadius: '50%', 
            border: 'none', 
            background: danger ? '#ea4335' : '#3c4043', // Meet Colors: Red / Grey
            color: 'white', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        >
            {danger && !iconOff ? iconOn : (active ? iconOn : iconOff)}
        </button>
    )
}

function RemoteParticipant({ stream, user }) {
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (audioRef.current) audioRef.current.srcObject = stream;
    }, [stream]);

    const getImageSrc = () => {
        if (user?.picture) return `/assets/avatars/${user.picture}`;
        const seed = user?._id || 'user';
        return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}`;
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <audio ref={audioRef} autoPlay /> 
            
            <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={getImageSrc()} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)' }} />
                {user?.firstname || "Participant"}
            </div>
        </div>
    );
}

function RemoteParticipantMinimized({ stream, user }) {
    const videoRef = useRef(null);
    const audioRef = useRef(null); 

    useEffect(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (audioRef.current) audioRef.current.srcObject = stream;
    }, [stream]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            <audio ref={audioRef} autoPlay />
             <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 500 }}>
                {user?.firstname || "P."}
            </div>
        </div>
    );
}
