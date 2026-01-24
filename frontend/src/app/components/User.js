"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: User
 * Description: Manages user lists, profiles, friends, and personal status.
 */
export default function UserComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "UserComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'users', 'user', 'user_deleting_status', 'user_creating_status', 
                    'user_updating status', 'friends', 'friend', 'friend_messages', 
                    'last_messages', 'last calls'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`UserComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = [
            'get users', 'get_user', 'delete_user', 'create_user', 
            'update user', 'get friends', 'get friend', 
            'get friend messages', 'get_last_messages', 'get last calls'
        ];
        const returnedMessages = [
            'users', 'user', 'user_deleting_status', 'user_creating_status', 
            'user_updating status', 'friends', 'friend', 'friend_messages', 
            'last_messages', 'last calls'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
