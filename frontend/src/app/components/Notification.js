"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Notification
 * Description: Handles internal application notifications.
 */
export default function NotificationComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "NotificationComponent",
            traitementMessage: (msg) => {
                const responses = [
                    'notifications', 'notification_creating_status', 
                    'notification_updating_status', 'notification_deleting_status'
                ];
                responses.forEach(res => {
                    if (msg[res]) console.log(`NotificationComponent received ${res}:`, msg[res]);
                });
            }
        };

        const sentMessages = ['get_notifications', 'create_notification', 'update_notification', 'delete_notification'];
        const returnedMessages = [
            'notifications', 'notification_creating_status', 
            'notification_updating_status', 'notification_deleting_status'
        ];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null;
}
