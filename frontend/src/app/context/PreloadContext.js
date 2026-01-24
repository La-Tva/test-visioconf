"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSocket } from './SocketContext';

const PreloadContext = createContext(null);

export function PreloadProvider({ children }) {
    const { controleur, isReady } = useSocket();
    const [friends, setFriends] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // We use a persistent component for fetching to avoid unmounting issues
    const preloadCompRef = useRef(null);

    useEffect(() => {
        if (!controleur || !isReady) return;

        const userStr = localStorage.getItem('user');
        if (!userStr) {
            setLoading(false);
            return;
        }
        const user = JSON.parse(userStr);

        const preloadComp = {
            nomDInstance: "PreloadComponent",
            traitementMessage: (msg) => {
                if (msg.friends) {
                     console.log("PreloadContext received friends response", msg.friends.friends?.length);
                     setFriends(msg.friends.friends || []);
                }
                if (msg.users) {
                     setUsers(msg.users.users || []);
                }
                
                // Real-time mutations
                if (msg.user_status_changed) {
                    const { userId, is_online } = msg.user_status_changed;
                    
                    // Update Users List
                    setUsers(prev => prev.map(u => u._id === userId ? { ...u, is_online } : u));
                    
                    // Update Friends List
                    setFriends(prev => prev.map(f => f._id === userId ? { ...f, is_online } : f));
                }
                
                if (msg.user_updated) {
                    const updatedUser = msg.user_updated;
                    setUsers(prev => prev.map(u => u._id === updatedUser._id ? updatedUser : u));
                    setFriends(prev => prev.map(f => f._id === updatedUser._id ? { ...f, ...updatedUser } : f));
                }

                if (msg.user_registered) {
                    setUsers(prev => [...prev, msg.user_registered]);
                }

                if (msg.user_deleted) {
                    const { userId } = msg.user_deleted;
                    setUsers(prev => prev.filter(u => u._id !== userId));
                    setFriends(prev => prev.filter(f => f._id !== userId));
                }

                // When we have both (or at least one if expected), we can say loading is done
                // But since socket is async, let's just expose the data.
                setLoading(false);
            }
        };
        preloadCompRef.current = preloadComp;
        
        controleur.inscription(preloadComp, 
            ['get friends', 'get users'], 
            ['friends', 'users', 'user_status_changed', 'user_updated', 'user_registered', 'user_deleted']
        );

        // Fetch immediately
        controleur.envoie(preloadComp, { 'get friends': { userId: user._id } });
        controleur.envoie(preloadComp, { 'get users': {} });
        
        // Refresh every X seconds? Or rely on updates?
        // Ideally rely on updates. But for now, fetch once is better than nothing.
        
    }, [controleur, isReady]);

    const refreshData = () => {
        if (controleur && isReady && preloadCompRef.current) {
             const userStr = localStorage.getItem('user');
             if(userStr) {
                 const user = JSON.parse(userStr);
                 controleur.envoie(preloadCompRef.current, { 'get friends': { userId: user._id } });
                 controleur.envoie(preloadCompRef.current, { 'get users': {} });
             }
        }
    };

    return (
        <PreloadContext.Provider value={{ friends, users, loading, refreshData }}>
            {children}
        </PreloadContext.Provider>
    );
}

export const usePreload = () => useContext(PreloadContext);
