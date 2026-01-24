"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Chat
 * Assigned to: Miriame
 * Description: Handles high-level discussion/group chat management.
 */
export default function ChatComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "ChatComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'chats', 'chat', 'chat_creating_status', 
                    'chat_updating_status', 'chat_deleting_status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`ChatComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['get_chats', 'get_chat', 'create_chat', 'update_chat', 'delete chat'];
        const returnedMessages = [
            'chats', 'chat', 'chat_creating_status', 
            'chat_updating_status', 'chat_deleting_status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
