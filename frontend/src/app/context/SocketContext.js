"use client";
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import Controleur from '@/controllers/controleur';
import CanalSocketio from '@/controllers/canalsocketio';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
    const [controleur, setControleur] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const canalRef = useRef(null);

    useEffect(() => {
        // Initialize Singleton Controller and Socket Canal
        const ctrl = new Controleur();
        const canal = new CanalSocketio(ctrl, "SocketCanalSingleton", () => {
            console.log("Socket Canal Ready");
            ctrl.socketID = canal.socket.id; // Expose socket ID
            setIsReady(true);
        });
        
        setControleur(ctrl);
        canalRef.current = canal;

        return () => {
            if (canal.socket) canal.socket.disconnect();
        };
    }, []);

    const identifyUser = (userId) => {
        if (controleur && isReady) {
             const systemComp = { 
                 nomDInstance: "SystemAuth", 
                 traitementMessage: () => {} 
             };
             // Register SystemAuth to emit 'authenticate'
             controleur.inscription(systemComp, ['authenticate'], []);
             
             // Envoie
             controleur.envoie(systemComp, { authenticate: { _id: userId } });
        }
    };

    return (
        <SocketContext.Provider value={{ controleur, identifyUser, isReady }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
