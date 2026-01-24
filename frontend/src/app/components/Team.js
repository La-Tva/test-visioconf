"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Team
 * Assigned to: Rahnya
 * Description: Handles team management, membership, and managers.
 */
export default function TeamComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "TeamComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'teams', 'team', 'team_creating_status', 
                    'team_updating_status', 'team_deleting_status', 'managers'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`TeamComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['get teams', 'get team', 'create team', 'update team', 'delete team', 'get managers'];
        const returnedMessages = [
            'teams', 'team', 'team_creating_status', 
            'team_updating_status', 'team_deleting_status', 'managers'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
