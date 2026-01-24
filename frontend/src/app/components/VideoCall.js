"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: VideoCall
 * Description: Manages video call sessions and joining.
 */
export default function VideoCallComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "VideoCallComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'video_call_creating_status', 'video_call_joining_status', 'video call_ending status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`VideoCallComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['create video call', 'join_video_call', 'end video call'];
        const returnedMessages = [
            'video_call_creating_status', 'video_call_joining_status', 'video call_ending status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
