"use client";
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const SoundContext = createContext();

export function useSounds() {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSounds must be used within SoundProvider');
    }
    return context;
}

export function SoundProvider({ children }) {
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.5); // Default volume 50%
    const incomingRingRef = useRef(null);
    const outgoingRingRef = useRef(null);

    // Generic sound player using Audio API
    const playSound = useCallback((filename) => {
        if (isMuted) return;
        
        try {
            const audio = new Audio(`/assets/${filename}`);
            audio.volume = volume;
            
            // Handle promise rejection (common in browsers if not interacted with)
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('Audio play failed:', error);
                });
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }, [isMuted, volume]);

    // Click sound - keep using synth or maybe no sound for now? 
    // User didn't specify click sound file, so I'll leave it as no-op or simple synth if requested to revert.
    // For now I'll just remove the synthesized click to avoid confusion, or keep it if specific file not provided.
    // The user ONLY provided message sounds. I'll stick to what they provided.
    const playClick = useCallback(() => {
        // Optional: keeping empty or implementing if needed
    }, []);

    // Message send
    const playMessageSend = useCallback(() => {
        playSound('messageEnvoie.m4a');
    }, [playSound]);

    // Message receive
    const playMessageReceive = useCallback(() => {
        playSound('messageReçu.mp3');
    }, [playSound]);

    // Notification
    const playNotification = useCallback(() => {
        playSound('notification.mp3');
    }, [playSound]);

    // Ringtone Logic
    const playIncomingCall = useCallback(() => {
        if (isMuted) return;
        try {
            if (!incomingRingRef.current) {
                incomingRingRef.current = new Audio('/assets/sonnerie.mp3');
                incomingRingRef.current.loop = true;
            }
            incomingRingRef.current.volume = volume;
            incomingRingRef.current.play().catch(e => console.warn("Incoming ringtone error", e));
        } catch(e) { console.error(e); }
    }, [isMuted, volume]);

    const playOutgoingCall = useCallback(() => {
        if (isMuted) return;
        try {
            // Generated soft tone for outgoing
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.05 * volume, ctx.currentTime);
            osc.start();
            
            const loop = setInterval(() => {
                if(ctx.state === 'closed') { clearInterval(loop); return; }
                gain.gain.setValueAtTime(0.05 * volume, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            }, 1500);

            outgoingRingRef.current = { ctx, osc, loop };
        } catch(e) { console.error("Outgoing tone error", e); }
    }, [isMuted, volume]);

    const stopRingtone = useCallback(() => {
        // Stop Incoming
        if (incomingRingRef.current) {
            incomingRingRef.current.pause();
            incomingRingRef.current.currentTime = 0;
        }
        // Stop Outgoing
        if (outgoingRingRef.current) {
            clearInterval(outgoingRingRef.current.loop);
            try {
                outgoingRingRef.current.osc.stop();
                outgoingRingRef.current.ctx.close();
            } catch(e) {}
            outgoingRingRef.current = null;
        }
    }, []);

    const playCallStart = useCallback(() => {
        if (isMuted) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // "Ta-da" : 500Hz -> 800Hz
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
            
            gain.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch(e) {}
    }, [isMuted, volume]);

    const playCallEnd = useCallback(() => {
        if (isMuted) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // "Tu-dum" : 400Hz -> 200Hz
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
            
            gain.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) {}
    }, [isMuted, volume]);
    
    const playUserJoin = useCallback(() => {
        playSound('notification.mp3');
    }, [playSound]);

    const playUserLeave = useCallback(() => {
        playSound('notification.mp3');
    }, [playSound]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const value = {
        playClick,
        playMessageSend,
        playMessageReceive,
        playNotification,
        playCallStart,
        playCallEnd,
        playUserJoin,
        playUserLeave,
        playIncomingCall,
        playOutgoingCall,
        stopRingtone,
        isMuted,
        toggleMute,
        volume,
        setVolume
    };

    return (
        <SoundContext.Provider value={value}>
            {children}
        </SoundContext.Provider>
    );
}
