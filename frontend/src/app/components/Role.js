"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Role
 * Assigned to: Bilel
 * Description: Manages user roles and their associated statuses.
 */
export default function RoleComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "RoleComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'roles', 'role', 'role_creating_status', 
                    'role_updating_status', 'role deleting status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`RoleComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['get roles', 'get_role', 'create_role', 'update role', 'delete role'];
        const returnedMessages = [
            'roles', 'role', 'role_creating_status', 
            'role_updating_status', 'role deleting status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
