"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSocket } from './SocketContext';

const PreloadContext = createContext(null);

export function PreloadProvider({ children }) {
    const { controleur, isReady } = useSocket();
    const [friends, setFriends] = useState([]);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // We use a persistent component for fetching to avoid unmounting issues
    const preloadCompRef = useRef(null);
    const currentChatIdRef = useRef(null);

    const markAsRead = (friendId) => {
        // Optimistic update
        setFriends(prev => prev.map(f => f._id === friendId ? { ...f, unreadCount: 0 } : f));
        
        // Persist to backend
        if (preloadCompRef.current && controleur) {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                controleur.envoie(preloadCompRef.current, {
                    mark_messages_read: {
                        userId: user._id,
                        friendId: friendId
                    }
                });
            }
        }
    };

    const markTeamAsRead = (teamId) => {
        // Optimistic update
        setTeams(prev => prev.map(t => {
            if(t._id === teamId) {
                // We need to clone the Map if it existed, but here unreadCounts is likely an object or Map from JSON?
                // Mongoose Map becomes object in JSON usually.
                // Let's assume we just want to clear the count for CURRENT user.
                // But unreadCounts in JSON is usually { userId: count }.
                // Waiting for server refresh is safer, but optimistic:
                // We don't have easy access to userId here to zero IT out specifically in the object without parsing user again.
                // Simpler: Just rely on 'get_team_messages' from TeamPage clearing it on server and sending back 'teams' update.
                // So maybe we don't need explicit markTeamAsRead here if TeamPage handles it via socket interaction.
                return t;
            }
            return t;
        }));
    };

    const setCurrentChatId = (id) => {
        currentChatIdRef.current = id;
    };

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
                     let newFriends = msg.friends.friends || [];
                     // FORCE override: If we are chatting with someone, their unread count IS 0 visually
                     if (currentChatIdRef.current) {
                         newFriends = newFriends.map(f => {
                             if (f._id === currentChatIdRef.current) {
                                 return { ...f, unreadCount: 0 };
                             }
                             return f;
                         });
                     }
                     setFriends(newFriends);
                }
                if (msg.users) {
                     setUsers(msg.users.users || []);
                }
                
                if (msg.teams) {
                    setTeams(msg.teams.teams || []);
                }
                
                // Real-time mutations
                if (msg.user_status_changed) {
                    const { userId, is_online } = msg.user_status_changed;
                    setUsers(prev => prev.map(u => u._id === userId ? { ...u, is_online } : u));
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

                if (msg.user_deleted || msg.friend_removed) {
                    const userId = msg.user_deleted?.userId || msg.friend_removed.friendId;
                    if (msg.friend_removed) {
                        refreshData(); 
                    } else {
                        setUsers(prev => prev.filter(u => u._id !== userId));
                        setFriends(prev => prev.filter(f => f._id !== userId));
                    }
                }

                if (msg.friend_request_accepted) {
                    refreshData();
                }

                if (msg.receive_private_message) {
                    const msgObj = msg.receive_private_message;
                    const senderId = typeof msgObj.sender === 'object' ? msgObj.sender._id : msgObj.sender;
                    
                    if (currentChatIdRef.current !== senderId) {
                        setFriends(prev => prev.map(f => {
                            if (f._id === senderId) {
                                return { ...f, unreadCount: (f.unreadCount || 0) + 1 };
                            }
                            return f;
                        }));
                    }
                }

                if (msg.user_call_status_changed) {
                    const { userId, isInCall } = msg.user_call_status_changed;
                    setUsers(prev => prev.map(u => u._id === userId ? { ...u, isInCall } : u));
                    setFriends(prev => prev.map(f => f._id === userId ? { ...f, isInCall } : f));
                }

                setLoading(false);
            }
        };
        preloadCompRef.current = preloadComp;
        
        controleur.inscription(preloadComp, 
            ['get friends', 'get users', 'get teams'], 
            ['friends', 'users', 'teams', 'user_status_changed', 'user_updated', 'user_registered', 'user_deleted', 'receive_private_message', 'friend_request_accepted', 'friend_removed', 'user_call_status_changed']
        );

        // Fetch immediately
        controleur.envoie(preloadComp, { 'get friends': { userId: user._id } });
        controleur.envoie(preloadComp, { 'get users': {} });
        controleur.envoie(preloadComp, { 'get teams': { userId: user._id } });
        
    }, [controleur, isReady]);

    const refreshData = () => {
        if (controleur && isReady && preloadCompRef.current) {
             const userStr = localStorage.getItem('user');
             if(userStr) {
                 const user = JSON.parse(userStr);
                 controleur.envoie(preloadCompRef.current, { 'get friends': { userId: user._id } });
                 controleur.envoie(preloadCompRef.current, { 'get users': {} });
                 controleur.envoie(preloadCompRef.current, { 'get teams': { userId: user._id } });
             }
        }
    };

    return (
        <PreloadContext.Provider value={{ friends, users, teams, loading, refreshData, markAsRead, setCurrentChatId }}>
            {children}
        </PreloadContext.Provider>
    );
}

export const usePreload = () => useContext(PreloadContext);
