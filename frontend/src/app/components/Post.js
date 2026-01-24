"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Post
 * Description: Handles posts and answers within a channel.
 */
export default function PostComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "PostComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'posts', 'user_post', 'post publishing status', 
                    'post_updating_status', 'post_deleting_status', 'post_answering_status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`PostComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['get posts', 'get_user_post', 'publish post', 'update post', 'delete_post', 'answer_post'];
        const returnedMessages = [
            'posts', 'user_post', 'post publishing status', 
            'post_updating_status', 'post_deleting_status', 'post_answering_status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
