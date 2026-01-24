"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Message
 * Description: Handles direct messaging between users.
 */
export default function MessageComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "MessageComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'messages', 'message', 'message_deleting_status', 
                    'message_sending_status', 'message_updating_status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`MessageComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['get messages', 'get message', 'delete message', 'send message', 'update_message'];
        const returnedMessages = [
            'messages', 'message', 'message_deleting_status', 
            'message_sending_status', 'message_updating_status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
