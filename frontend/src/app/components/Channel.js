"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Channel
 * Description: Manages channels within a team.
 */
export default function ChannelComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "ChannelComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'channels', 'channel', 'channel_creating_status', 
                    'channel_updating_status', 'channel_deleting_status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`ChannelComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['get channels', 'get_channel', 'create_channel', 'update_channel', 'delete channel'];
        const returnedMessages = [
            'channels', 'channel', 'channel_creating_status', 
            'channel_updating_status', 'channel_deleting_status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
