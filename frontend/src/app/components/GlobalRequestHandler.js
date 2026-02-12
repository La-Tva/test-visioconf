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
                <div className={styles.glassToast}>
                    <div className={styles.toastHeader}>
                        <div className={styles.toastIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                        </div>
                        <div className={styles.toastTitleGroup}>
                            <h4 className={styles.toastTitle}>Demande d'invitation</h4>
                            <p className={styles.toastMessage}>
                                <strong>{request.firstname || users.find(u => u._id === (request._id || request))?.firstname || 'Un utilisateur'}</strong> souhaite vous ajouter.
                            </p>
                        </div>
                    </div>
                    <div className={styles.toastActions}>
                        <button 
                            className={styles.acceptBtn}
                            onClick={() => handleResponse(true)}
                        >
                            Accepter
                        </button>
                        <button 
                            className={styles.declineBtn}
                            onClick={() => handleResponse(false)}
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
