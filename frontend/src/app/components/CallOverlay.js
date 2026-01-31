"use client";
import React, { useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';
import { AnimatePresence, motion } from 'framer-motion';

export default function CallOverlay() {
    const { callStatus, incomingCall, remoteStream, answerCall, endCall, rejectCall, callDuration, remoteUser } = useCall();
    const audioRef = useRef(null);

    // Auto-play remote audio when stream is available
    useEffect(() => {
        if (audioRef.current && remoteStream) {
            audioRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

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
            // Assuming pictures are in /uploads/ or assuming they are just filenames?
            // If they are local files or URLs. In User.js schema it seems to be just filename likely.
            // Let's assume /assets/avatars/ or /uploads/.
            // Checking previous files, it seems "default_profile_picture.png" is used.
            // Let's try /assets/avatars/ + picture first or just / + picture if simpler
            // Actually, let's look at how other components render pictures.
            // Profile page usually does: src={`/assets/avatars/${user.picture}`}
            return `/assets/avatars/${remoteUser.picture}`;
        }
        return `https://api.dicebear.com/9.x/shapes/svg?seed=${incomingCall?.socket || 'user'}`;
    }

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 9999,
                    pointerEvents: 'none', // Allow clicking through if minimized? For now blocking overlay.
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)'
                }}
            >
                {/* Audio Element (Hidden) */}
                <audio ref={audioRef} autoPlay />

                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{
                        background: 'white',
                        padding: '40px',
                        borderRadius: '32px',
                        width: '320px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}
                >
                    {/* --- Visuals --- */}
                    <div style={{ position: 'relative', marginBottom: '24px' }}>
                        {/* Pulse Effect */}
                        {(callStatus === 'receiving' || callStatus === 'calling') && (
                            <div style={{
                                position: 'absolute', inset: -10, borderRadius: '50%',
                                border: '2px solid #3B82F6', opacity: 0.5,
                                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                            }} />
                        )}
                        <img 
                            src={getImageSrc()} 
                            onError={(e) => e.target.src = `https://api.dicebear.com/9.x/shapes/svg?seed=${remoteUser?._id || 'user'}`}
                            style={{ width: '96px', height: '96px', borderRadius: '50%', background: '#F1F5F9', position:'relative', zIndex:2, objectFit: 'cover' }}
                        />
                    </div>

                    {/* --- Status Text --- */}
                    <h3 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-bricolage)', fontSize: '1.5rem', color: '#0F172A', textAlign: 'center' }}>
                        {callStatus === 'receiving' ? `${getDisplayName()} appelle...` : 
                         callStatus === 'calling' ? `Appel vers ${getDisplayName()}...` : 
                         getDisplayName()}
                    </h3>
                    
                    <p style={{ margin: '0 0 32px 0', color: '#64748B' }}>
                        {callStatus === 'connected' ? formatTime(callDuration) : 'Audio Only'}
                    </p>

                    {/* --- Controls --- */}
                    <div style={{ display: 'flex', gap: '24px' }}>
                        {callStatus === 'receiving' && (
                            <button 
                                onClick={answerCall}
                                style={{
                                    width: '64px', height: '64px', borderRadius: '50%', border: 'none',
                                    background: '#22C55E', color: 'white', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                            </button>
                        )}
                        
                        <button 
                            onClick={callStatus === 'receiving' ? rejectCall : endCall}
                            style={{
                                width: '64px', height: '64px', borderRadius: '50%', border: 'none',
                                background: '#EF4444', color: 'white', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'transform 0.2s', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                        </button>
                    </div>

                    <style jsx>{`
                        @keyframes ping {
                            75%, 100% { transform: scale(1.5); opacity: 0; }
                        }
                    `}</style>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
