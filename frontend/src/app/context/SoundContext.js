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
    const [volume, setVolume] = useState(0.3); // Default volume 30%
    const audioContextRef = useRef(null);

    // Initialize AudioContext lazily
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // Generic tone generator
    const playTone = useCallback((frequency, duration, type = 'sine') => {
        if (isMuted) return;
        
        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (error) {
            console.warn('Sound playback failed:', error);
        }
    }, [isMuted, volume, getAudioContext]);

    // Click sound - short high beep
    const playClick = useCallback(() => {
        playTone(800, 0.05, 'sine');
    }, [playTone]);

    // Message send - single short beep
    const playMessageSend = useCallback(() => {
        playTone(600, 0.06, 'sine');
    }, [playTone]);

    // Message receive - double soft beep
    const playMessageReceive = useCallback(() => {
        if (isMuted) return;
        playTone(500, 0.05, 'sine');
        setTimeout(() => playTone(650, 0.05, 'sine'), 60);
    }, [isMuted, playTone]);

    // Notification - double beep
    const playNotification = useCallback(() => {
        if (isMuted) return;
        playTone(600, 0.1, 'sine');
        setTimeout(() => playTone(600, 0.1, 'sine'), 150);
    }, [isMuted, playTone]);

    // Call start - rising tone
    const playCallStart = useCallback(() => {
        if (isMuted) return;
        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(300, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.3);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(volume * 0.6, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.3);
        } catch (error) {
            console.warn('Sound playback failed:', error);
        }
    }, [isMuted, volume, getAudioContext]);

    // Call end - falling tone
    const playCallEnd = useCallback(() => {
        if (isMuted) return;
        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(700, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.4);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(volume * 0.6, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.4);
        } catch (error) {
            console.warn('Sound playback failed:', error);
        }
    }, [isMuted, volume, getAudioContext]);

    // User join - cheerful beep
    const playUserJoin = useCallback(() => {
        playTone(500, 0.08, 'sine');
        setTimeout(() => playTone(700, 0.12, 'sine'), 100);
    }, [playTone]);

    // User leave - sad beep
    const playUserLeave = useCallback(() => {
        playTone(500, 0.08, 'sine');
        setTimeout(() => playTone(300, 0.12, 'sine'), 100);
    }, [playTone]);

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
