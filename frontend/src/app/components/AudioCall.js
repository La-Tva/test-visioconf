"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: AudioCall
 * Assigned to: BENJAMIN
 * Description: Manages audio call lifecycle.
 */
export default function AudioCallComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "AudioCallComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'call_creating_status', 'call_joining_status', 'call ending status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`AudioCallComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['create call', 'join_call', 'end call'];
        const returnedMessages = [
            'call_creating_status', 'call_joining_status', 'call ending status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
