"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: File
 * Description: Handles file uploads, updates, and retrieval.
 */
export default function FileComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "FileComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'files', 'file_uploading_status', 
                    'file_updating_status', 'file deleting status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`FileComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['get_files', 'get file', 'upload_file', 'update file', 'delete file'];
        const returnedMessages = [
            'files', 'file_uploading_status', 
            'file_updating_status', 'file deleting status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
