"use client";
import { useState, useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function CallOverlay() {
    const { callStatus, incomingCall, remoteStream, localStream, answerCall, endCall, rejectCall, callDuration, remoteUser, toggleVideo, toggleAudio, isAudioEnabled } = useCall();
    const [isMinimized, setIsMinimized] = useState(false);
    const audioRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localVideoRef = useRef(null);

    // Mobile Check
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Audio Output Logic
    const [audioOutputs, setAudioOutputs] = useState([]);
    const [activeOutputId, setActiveOutputId] = useState('default');

    useEffect(() => {
        const getDevices = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
                const devices = await navigator.mediaDevices.enumerateDevices();
                const outputs = devices.filter(d => d.kind === 'audiooutput');
                setAudioOutputs(outputs);
            } catch(e) { console.error("Device enumeration error:", e); }
        };
        getDevices();
        if (navigator.mediaDevices) {
             navigator.mediaDevices.ondevicechange = getDevices;
        }
        return () => { 
            if (navigator.mediaDevices) navigator.mediaDevices.ondevicechange = null; 
        };
    }, []);

    const toggleAudioOutput = async () => {
        if (audioOutputs.length < 2) return;
        
        const currentIndex = audioOutputs.findIndex(d => d.deviceId === activeOutputId);
        const indexToUse = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex = (indexToUse + 1) % audioOutputs.length;
        const nextDevice = audioOutputs[nextIndex];

        setActiveOutputId(nextDevice.deviceId);
        
        try {
            if (audioRef.current && typeof audioRef.current.setSinkId === 'function') {
                await audioRef.current.setSinkId(nextDevice.deviceId);
            }
            if (remoteVideoRef.current && typeof remoteVideoRef.current.setSinkId === 'function') {
                await remoteVideoRef.current.setSinkId(nextDevice.deviceId);
            }
        } catch(e) { 
            console.error("Error setting sinkId:", e); 
        }
    };

    // Auto-play remote audio/video
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        } else if (audioRef.current && remoteStream) {
            audioRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, remoteVideoRef.current]);

    // Local video
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, localVideoRef.current]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    if (callStatus === 'idle') return null;

    const getDisplayName = () => {
        if (remoteUser?.firstname) return remoteUser.firstname;
        return "Inconnu";
    }

    const getImageSrc = () => {
        if (remoteUser?.picture) {
            return `/assets/avatars/${remoteUser.picture}`;
        }
        const seed = remoteUser?._id || incomingCall?.socket || 'user';
        return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}`;
    }

    const hasRemoteVideo = remoteStream?.getVideoTracks().length > 0;
    const hasLocalVideo = localStream?.getVideoTracks().length > 0;



    // --- Panel Design Styles ---
    const panelContainerStyle = isMinimized ? {
        position: 'fixed',
        top: '24px', left: '0', right: '0',
        width: 'auto', height: 'auto',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex', justifyContent: 'center',
    } : {
        position: 'fixed',
        top: isMobile ? '0' : '24px', 
        left: isMobile ? '0' : '0', 
        right: isMobile ? '0' : '0', 
        bottom: isMobile ? '0' : undefined,
        display: 'flex', justifyContent: 'center', alignItems: isMobile ? 'center' : 'flex-start',
        zIndex: 9999,
        pointerEvents: 'none', 
        padding: isMobile ? '0' : '0 24px' 
    };

    const panelCardStyle = isMinimized ? {
        background: '#FFFFFF', // Light Theme Minimized
        width: 'auto',
        minWidth: '220px',
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        pointerEvents: 'auto',
        border: '1px solid #E2E8F0'
    } : {
        background: isMobile ? '#000' : '#FFFFFF', 
        width: isMobile ? '100vw' : '100%', 
        maxWidth: isMobile ? '100vw' : '900px', 
        height: isMobile ? '100vh' : 'auto',
        borderRadius: isMobile ? '0' : '24px', 
        overflow: 'hidden',
        boxShadow: isMobile ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.15)', 
        pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column',
        border: isMobile ? 'none' : '1px solid #F1F5F9'
    };

    // Header Controls (Right side of panel)
    const HeaderControls = () => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {callStatus === 'receiving' ? (
                <>
                     {/* Answer */}
                    <button onClick={answerCall} title="Décrocher" style={{ background: '#22C55E', border: 'none', borderRadius: '8px', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                    </button>
                     {/* Decline */}
                    <button onClick={rejectCall} title="Refuser" style={{ background: '#EF4444', border: 'none', borderRadius: '8px', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </>
            ) : (
                <>
                    {/* Toggle Video */}
                    <button onClick={toggleVideo} title="Caméra" style={{ background: hasLocalVideo ? '#EFF6FF' : '#FEF2F2', border: 'none', borderRadius: '8px', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', color: hasLocalVideo ? '#3B82F6' : '#EF4444', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {hasLocalVideo ? 
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                            : 
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        }
                    </button>
                    {/* Mute */}
                    <button onClick={toggleAudio} title="Micro" style={{ background: isAudioEnabled ? '#EFF6FF' : '#FEF2F2', border: 'none', borderRadius: '8px', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', color: isAudioEnabled ? '#3B82F6' : '#EF4444', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {isAudioEnabled ? 
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                            :
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                        }
                    </button>
                    {/* Hangup */}
                    <button onClick={endCall} title="Raccrocher" style={{ background: '#FEF2F2', border: 'none', borderRadius: '8px', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', color: '#EF4444', cursor: 'pointer' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                    </button>
                </>
            )}
             {/* Minimize/Maximize */}
             <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', marginLeft: '8px' }}>
                {isMinimized ? 
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                    :
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg> 
                }
            </button>
        </div>
    );

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
                style={panelContainerStyle}
            >
                {/* Audio Fallback */}
                {!hasRemoteVideo && <audio ref={audioRef} autoPlay />}

                <motion.div 
                    layout 
                    drag 
                    dragMomentum={false}
                    dragConstraints={{ left: 0, top: 0, right: 0, bottom: 0 }} 
                    dragListener={true}
                    style={panelCardStyle}
                >
                    {isMinimized ? (
                        // --- Minimized View (Strip) ---
                        <>
                             {/* Thumbnail (Video or Avatar) */}
                             <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#F1F5F9', flexShrink: 0, position: 'relative' }}>
                                 {hasRemoteVideo ? (
                                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                 ) : (
                                    <img 
                                        src={getImageSrc()} 
                                        onError={(e) => e.target.src = `https://api.dicebear.com/9.x/shapes/svg?seed=${remoteUser?._id || incomingCall?.socket || 'user'}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                 )}
                             </div>

                             {/* Info */}
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '8px' }}>
                                 <span style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{getDisplayName()}</span>
                                 <span style={{ color: '#64748B', fontSize: '0.75rem' }}>{formatTime(callDuration)}</span>
                             </div>

                             {/* Controls */}
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {callStatus === 'receiving' ? (
                                    <>
                                        {/* Answer Minimized */}
                                       <button onClick={answerCall} title="Décrocher" style={{ background: '#22C55E', border: 'none', borderRadius: '6px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(34, 197, 94, 0.3)' }}>
                                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                                       </button>
                                        {/* Decline Minimized */}
                                       <button onClick={rejectCall} title="Refuser" style={{ background: '#EF4444', border: 'none', borderRadius: '6px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', color: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)' }}>
                                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                       </button>
                                    </>
                                ) : (
                                    <>
                                        {/* Camera Minimized */}
                                        <button onClick={toggleVideo} style={{ background: hasLocalVideo ? '#EFF6FF' : '#FEF2F2', border: 'none', borderRadius: '6px', width: '32px', height: '32px', display:'flex', alignItems:'center', justifyContent:'center', color: hasLocalVideo ? '#3B82F6' : '#EF4444', cursor: 'pointer' }}>
                                            {hasLocalVideo ? 
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                                : 
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                            }
                                        </button>
                                        
                                        {/* Mic Minimized */}
                                        <button onClick={toggleAudio} style={{ background: isAudioEnabled ? '#EFF6FF' : '#FEF2F2', border: 'none', borderRadius: '6px', width: '32px', height: '32px', display:'flex', alignItems:'center', justifyContent:'center', color: isAudioEnabled ? '#3B82F6' : '#EF4444', cursor: 'pointer' }}>
                                            {isAudioEnabled ? 
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                                :
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                            }
                                        </button>

                                        {/* Audio Output Toggle (Only if multiple devices) */}
                                        {audioOutputs.length > 1 && (
                                            <button onClick={toggleAudioOutput} title="Changer de sortie audio" style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                            </button>
                                        )}
                                        
                                        <button onClick={endCall} style={{ background: '#FEE2E2', border: 'none', borderRadius: '6px', width: '32px', height: '32px', display:'flex', alignItems:'center', justifyContent:'center', color: '#EF4444', cursor: 'pointer' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                                        </button>
                                    </>
                                )}

                                <button onClick={() => setIsMinimized(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                                </button>
                             </div>
                        </>
                    ) : (
                        // --- Full Panel View ---
                        isMobile ? (
                            // --- Mobile Fullscreen View ---
                            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
                                {/* Remote Video (Background) */}
                                {hasRemoteVideo ? (
                                    <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1E293B' }}>
                                         <img 
                                            src={getImageSrc()} 
                                            onError={(e) => e.target.src = `https://api.dicebear.com/9.x/shapes/svg?seed=${remoteUser?._id || incomingCall?.socket || 'user'}`}
                                            style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '16px', border: '4px solid rgba(255,255,255,0.1)' }} 
                                        />
                                        <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>{getDisplayName()}</span>
                                        <span style={{ color: '#94A3B8', marginTop: '8px' }}>{callStatus === 'receiving' ? 'Appel entrant...' : formatTime(callDuration)}</span>
                                    </div>
                                )}

                                {/* Local Video (Small PIP Top Right) */}
                                {hasLocalVideo && hasRemoteVideo && (
                                     <div style={{ position: 'absolute', top: '80px', right: '16px', width: '80px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 10 }}>
                                        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                     </div>
                                )}

                                {/* Controls Overlay (Bottom) */}
                                <div style={{ position: 'absolute', bottom: '48px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '24px', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 20 }}>
                                    <HeaderControls />
                                </div>
                                
                                {/* Top Info Overlay */}
                                {hasRemoteVideo && (
                                    <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>{getDisplayName()}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>{formatTime(callDuration)}</div>
                                    </div>
                                )}

                                {/* Minimize Button (Top Right) */}
                                <div style={{ position: 'absolute', top: '24px', right: '16px', zIndex: 20 }}>
                                     <button onClick={() => setIsMinimized(true)} style={{ background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', width:'40px', height:'40px', color: 'white', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter: 'blur(4px)' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
                                     </button>
                                </div>
                            </div>
                        ) : (
                            // --- Desktop Normal View ---
                            <>
                                {/* Panel Header */}
                                <div style={{ 
                                    height: '72px', 
                                    background: '#FFFFFF', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0 32px',
                                    borderBottom: '1px solid #F1F5F9'
                                }}>
                                {/* Left: User Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <img 
                                            src={getImageSrc()} 
                                            onError={(e) => e.target.src = `https://api.dicebear.com/9.x/shapes/svg?seed=${remoteUser?._id || incomingCall?.socket || 'user'}`}
                                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} 
                                        />
                                        <div style={{ position: 'absolute', bottom: 1, right: 1, width: '12px', height: '12px', borderRadius: '50%', background: '#22C55E', border: '2px solid white' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ color: '#0F172A', fontWeight: 'bold', fontSize: '1.1rem', fontFamily: 'var(--font-bricolage)' }}>{getDisplayName()}</span>
                                        <span style={{ color: '#64748B', fontSize: '0.9rem' }}>{formatTime(callDuration)}</span>
                                    </div>
                                </div>

                                {/* Right: Controls */}
                                <HeaderControls />
                            </div>

                            {/* Panel Body (Video Grid) */}
                            <div style={{ 
                                padding: '32px', 
                                display: 'flex', gap: '32px', 
                                height: '420px', 
                                alignItems: 'center', justifyContent: 'center',
                                background: '#FFFFFF'
                            }}>
                                {/* Remote Video */}
                                <div style={{ 
                                    flex: 1, height: '100%', 
                                    background: '#F8FAFC', borderRadius: '24px', overflow: 'hidden', 
                                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
                                }}>
                                    {hasRemoteVideo ? (
                                        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                            <img 
                                                src={getImageSrc()} 
                                                onError={(e) => e.target.src = `https://api.dicebear.com/9.x/shapes/svg?seed=${remoteUser?._id || incomingCall?.socket || 'user'}`}
                                                style={{ width: '96px', height: '96px', borderRadius: '50%', opacity: 1 }} 
                                            />
                                            <span style={{ color: '#94A3B8', fontWeight: '500' }}>Caméra désactivée</span>
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '8px', color: '#0F172A', fontSize: '0.85rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        {getDisplayName()}
                                    </div>
                                </div>

                                {/* Local Video */}
                                <div style={{ 
                                    flex: 1, height: '100%', 
                                    background: '#F8FAFC', borderRadius: '24px', overflow: 'hidden', 
                                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
                                }}>
                                    {hasLocalVideo ? (
                                        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect><line x1="1" y1="1" x2="23" y2="23" stroke="white" strokeWidth="3"></line></svg>
                                            </div>
                                            <span style={{ color: '#94A3B8', fontWeight: '500' }}>Caméra désactivée</span>
                                        </div>
                                    )}
                                     <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '8px', color: '#0F172A', fontSize: '0.85rem', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        Moi
                                    </div>
                                </div>
                            </div>
                        </>
                    ))}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
