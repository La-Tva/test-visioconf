"use client";
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useSounds } from './SoundContext';
import useSWR, { useSWRConfig } from 'swr';

const PreloadContext = createContext(null);

const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export function PreloadProvider({ children }) {
    const { controleur, isReady } = useSocket();
    const { playMessageReceive } = useSounds();
    const { mutate } = useSWRConfig();
    
    // User from localStorage
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user?._id;

    // SWR Fetching
    const { data: users = [], error: usersError } = useSWR(`${API_URL}/api/users`);
    const { data: friends = [], error: friendsError } = useSWR(userId ? `${API_URL}/api/friends/${userId}` : null);
    const { data: teams = [], error: teamsError } = useSWR(userId ? `${API_URL}/api/teams/${userId}` : null);
    const { data: recentConversations = [], error: convError } = useSWR(userId ? `${API_URL}/api/conversations/recent/${userId}` : null);
    const { data: activeCallsCount = 0, error: callsError } = useSWR(`${API_URL}/api/calls/active/count`);
    
    const loading = userId && !users.length && !usersError;
    
    const preloadCompRef = useRef(null);
    const currentChatIdRef = useRef(null);

    const markAsRead = (friendId) => {
        if (preloadCompRef.current && controleur && userId) {
            controleur.envoie(preloadCompRef.current, {
                mark_messages_read: { userId, friendId }
            });
            // Revalidate friends to update unread counts
            mutate(`${API_URL}/api/friends/${userId}`);
        }
    };

    const setCurrentChatId = (id) => {
        currentChatIdRef.current = id;
    };

    useEffect(() => {
        if (!controleur || !isReady || !userId) return;

        const preloadComp = {
            nomDInstance: "PreloadComponent",
            traitementMessage: (msg) => {
                // Mutate SWR cache on relevant socket messages
                if (msg.friends || msg.friend_removed || msg.friend_request_accepted) {
                    mutate(`${API_URL}/api/friends/${userId}`);
                }
                
                if (msg.users || msg.user_registered || msg.user_deleted || msg.user_status_changed || msg.user_updated || msg.user_call_status_changed) {
                    mutate(`${API_URL}/api/users`);
                }
                
                if (msg.teams || msg.team_creating_status || msg.team_deleting_status || msg.team_updating_status) {
                    mutate(`${API_URL}/api/teams/${userId}`);
                }

                if (msg.receive_private_message || msg.receive_team_message || msg.last_messages) {
                    mutate(`${API_URL}/api/conversations/recent/${userId}`);
                }

                if (msg.active_calls_count !== undefined) {
                    mutate(`${API_URL}/api/calls/active/count`);
                }

                if (msg.receive_private_message) {
                    const msgObj = msg.receive_private_message;
                    const senderId = typeof msgObj.sender === 'object' ? msgObj.sender._id : msgObj.sender;
                    playMessageReceive();
                    if (currentChatIdRef.current !== senderId) {
                        mutate(`${API_URL}/api/friends/${userId}`);
                    }
                }
            }
        };
        preloadCompRef.current = preloadComp;
        
        controleur.inscription(preloadComp, 
            [], // No need to subscribe to 'get_xxx' tags as SWR handles it
            ['friends', 'users', 'teams', 'user_status_changed', 'user_updated', 'user_registered', 'user_deleted', 'receive_private_message', 'receive_team_message', 'friend_request_accepted', 'friend_removed', 'user_call_status_changed', 'team_creating_status', 'team_deleting_status', 'team_updating_status', 'last_messages', 'active_calls_count']
        );

    }, [controleur, isReady, userId, mutate]);

    const refreshData = () => {
        mutate(`${API_URL}/api/users`);
        if (userId) {
            mutate(`${API_URL}/api/friends/${userId}`);
            mutate(`${API_URL}/api/teams/${userId}`);
            mutate(`${API_URL}/api/conversations/recent/${userId}`);
        }
        mutate(`${API_URL}/api/calls/active/count`);
    };

    return (
        <PreloadContext.Provider value={{ friends, users, teams, recentConversations, activeCallsCount, loading: loading && !users.length, refreshData, markAsRead, setCurrentChatId }}>
            {children}
        </PreloadContext.Provider>
    );
}

export const usePreload = () => useContext(PreloadContext);
