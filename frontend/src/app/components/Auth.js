"use client";
import React, { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * Component: Auth
 * Assigned to: Raph
 * Description: Handles authentication, login, registration, and disconnection.
 */
export default function AuthComponent() {
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const comp = {
            nomDInstance: "AuthComponent",
            traitementMessage: (msg) => {
                if (msg['auth status']) {
                    console.log("Auth Status received:", msg['auth status']);
                }
                if (msg.login_status) {
                    console.log("Login Status received:", msg.login_status);
                }
                if (msg.registration_status) {
                    console.log("Registration Status received:", msg.registration_status);
                }
            }
        };

        const sentMessages = ['authenticate', 'login', 'register', 'disconnect'];
        const returnedMessages = ['auth status', 'login_status', 'registration_status'];

        controleur.inscription(comp, sentMessages, returnedMessages);

        return () => {
            controleur.desincription(comp, sentMessages, returnedMessages);
        };
    }, [controleur, isReady]);

    return null; 
}
