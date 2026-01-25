"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';
import { usePathname, useRouter } from 'next/navigation';
import styles from './GlobalRequestHandler.module.css';

export default function GlobalRequestHandler() {
    const [request, setRequest] = useState(null);
    const [msgNotification, setMsgNotification] = useState(null);
    const globalCompRef = useRef(null);
    const { controleur, identifyUser, isReady } = useSocket();
    const { refreshData, users } = usePreload();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!controleur || !isReady) return;

        const globalComp = {
            nomDInstance: "GlobalHandler",
            traitementMessage: (msg) => {
                console.log("GlobalHandler received raw msg:", msg);
                if (msg.receive_friend_request) {
                    setRequest(msg.receive_friend_request.fromUser);
                }
                else if (msg.friend_request_accepted) {
                    console.log("Friend request accepted", msg.friend_request_accepted);
                    refreshData(); 
                }
                else if (msg['auth status'] && msg['auth status'].success) {
                    // Check for pending requests
                    const user = msg['auth status'].user;
                    if (user.friendRequests && user.friendRequests.length > 0) {
                        // For now, just show the first one. Stack them if needed?
                        // Or show a list? The current UI handles one 'request' state.
                        // Let's pick the last one.
                        const lastRequest = user.friendRequests[user.friendRequests.length - 1];
                        // If populated, lastRequest is an object.
                        setRequest(lastRequest);
                    }
                }

                else if (msg.receive_private_message) {
                    if (pathname !== '/messages') {
                        const newMsg = msg.receive_private_message;
                        const senderId = typeof newMsg.sender === 'object' ? newMsg.sender._id : newMsg.sender;
                        
                        // Check if I am the sender
                        const userStr = localStorage.getItem('user');
                        let currentUserId = null;
                        if (userStr) {
                             try {
                                 const u = JSON.parse(userStr);
                                 currentUserId = u._id;
                             } catch(e) {}
                        }

                        if (currentUserId && currentUserId === senderId) {
                            return;
                        }

                        setMsgNotification({
                            content: newMsg.content,
                            senderId: senderId
                        });
                        
                        // Auto hide
                        setTimeout(() => setMsgNotification(null), 5000);
                    }
                }
            }
        };
        globalCompRef.current = globalComp;
        controleur.inscription(globalComp, ['friend_response'], ['receive_friend_request', 'friend_request_accepted', 'auth status', 'receive_private_message']);

        // Identify global handler
        const userStr = localStorage.getItem('user');
        if (userStr) {
             const u = JSON.parse(userStr);
             // We can use the context helper to identify globally
             identifyUser(u._id);
        }

        return () => {
             controleur.desincription(globalComp, ['friend_response'], ['receive_friend_request', 'friend_request_accepted', 'auth status', 'receive_private_message']);
        };

    }, [controleur, isReady]);

    const handleResponse = (accepted) => {
        if (!request || !controleur) return;
        
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const u = JSON.parse(userStr);
            const comp = globalCompRef.current;
            
            controleur.envoie(comp, {
                friend_response: {
                    userId: u._id,
                    requesterId: request._id,
                    accepted: accepted
                }
            });
            
            // If accepted locally, we might want to optimistic update? 
            // The socket 'friend_request_accepted' event should come back and trigger refreshData.
            // But if we initiated it, maybe we don't receive 'friend_request_accepted' (usually sent to the requester)?
            // If I accept, the backend should notify ME too or I should just refresh.
            if(accepted) {
                 setTimeout(() => refreshData(), 500); // Safety delay for DB update
            }
        }
        setRequest(null);
    };

    // Render Notifications
    return (
        <>
            {request && (
                <div style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 9999,
                    border: '1px solid #e2e8f0'
                }}>
                    <h4 style={{margin: '0 0 10px 0', fontSize:'16px'}}>Demande d'ami</h4>
                    <p style={{margin: '0 0 15px 0', color:'#64748B'}}>
                        <strong>{request.firstname}</strong> souhaite vous ajouter.
                    </p>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button 
                            onClick={() => handleResponse(true)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#22C55E',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Accepter
                        </button>
                        <button 
                            onClick={() => handleResponse(false)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#EF4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Refuser
                        </button>
                    </div>
                </div>
            )}

            {msgNotification && (
                <div 
                    className={styles.toast}
                    onClick={() => {
                        setMsgNotification(null);
                        router.push('/messages');
                    }}
                >
                    <img 
                        src={`https://api.dicebear.com/9.x/shapes/svg?seed=${msgNotification.senderId}`} 
                        alt="Avatar" 
                        className={styles.avatar}
                    />
                    <div className={styles.content}>
                        <div className={styles.header}>
                            <span className={styles.senderName}>
                                {users.find(u => u._id === msgNotification.senderId)?.firstname || 'Nouveau message'}
                            </span>
                            <span className={styles.time}>Maintenant</span>
                        </div>
                        <p className={styles.messagePreview}>
                            {msgNotification.content}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
