"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Directory
 * Description: Handles the directory/annuaire for display.
 */
export default function DirectoryComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "DirectoryComponent",
            traitementMessage: (msg) => {
                if (msg.directory) {
                    console.log("DirectoryComponent received directory:", msg.directory);
                }
            }
        };

        const sentMessages = ['get_directory'];
        const returnedMessages = ['directory'];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
