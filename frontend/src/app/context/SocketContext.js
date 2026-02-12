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

    const systemCompRef = useRef(null);
    const lastIdentifiedIdRef = useRef(null);

    const identifyUser = (userId) => {
        if (controleur && isReady) {
            if (lastIdentifiedIdRef.current === userId) return;
            
            if (!systemCompRef.current) {
                systemCompRef.current = { 
                    nomDInstance: "SystemAuth", 
                    traitementMessage: () => {} 
                };
                controleur.inscription(systemCompRef.current, ['authenticate'], []);
            }
             
             // Envoie
             controleur.envoie(systemCompRef.current, { authenticate: { _id: userId } });
             lastIdentifiedIdRef.current = userId;
        }
    };

    return (
        <SocketContext.Provider value={{ controleur, identifyUser, isReady }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
