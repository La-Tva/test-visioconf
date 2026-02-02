"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';
import { useCall } from '../context/CallContext';
import { useSounds } from '../context/SoundContext';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './messages.module.css';

export default function MessagesPage() {
    const [friends, setFriends] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { friends: preloadedFriends, refreshData, markAsRead, setCurrentChatId } = usePreload();
    const { controleur, isReady } = useSocket();
    const { startCall } = useCall();
    const { playMessageSend, playMessageReceive } = useSounds(); 

    const messagesCompRef = useRef(null);
    const messagesEndRef = useRef(null);
    const selectedFriendRef = useRef(null);

    // Mobile Check
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync Ref
    useEffect(() => {
        selectedFriendRef.current = selectedFriend;
        if(selectedFriend) {
            setCurrentChatId(selectedFriend._id);
        } else {
            setCurrentChatId(null);
        }
        return () => setCurrentChatId(null);
    }, [selectedFriend, setCurrentChatId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if(preloadedFriends) setFriends(preloadedFriends);
    }, [preloadedFriends]);

    // Socket Init
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
             window.location.href = '/login';
             return;
        }
        const user = JSON.parse(userStr);
        setCurrentUser(user);

        if (!controleur || !isReady) return;

        const msgComp = {
            nomDInstance: "MessagesComponent",
            traitementMessage: (msg) => {
                 if (msg.messages) {
                     setMessages(msg.messages.messages);
                 }
                 else if (msg.receive_private_message) {
                     const newMsg = msg.receive_private_message;
                     setMessages(prev => [...prev, newMsg]);
                     playMessageReceive();

                     if (selectedFriendRef.current && selectedFriendRef.current._id === newMsg.sender) {
                         markAsRead(newMsg.sender);
                     }
                 }
                else if (msg.friend_removed) {
                     refreshData();
                     setSelectedFriend(null);
                 }
            }
        };
        messagesCompRef.current = msgComp;
        
        controleur.inscription(msgComp, 
            ['get messages', 'send message', 'remove_friend'], 
            ['messages', 'receive_private_message', 'friend_removed']
        );

        return () => {
             controleur.desincription(msgComp, 
                ['get messages', 'send message', 'remove_friend'], 
                ['messages', 'receive_private_message', 'friend_removed']
             );
        };

    }, [controleur, isReady, refreshData, markAsRead]);

    // --- Helpers ---
    const handleSelectFriend = (friend) => {
        setSelectedFriend(friend);
        markAsRead(friend._id);
        if (controleur && messagesCompRef.current && currentUser) {
            controleur.envoie(messagesCompRef.current, {
                'get messages': {
                    userId: currentUser._id,
                    friendId: friend._id
                }
            });
        }
    };
    
    const handleRemoveFriend = () => {
        if(!selectedFriend || !currentUser) return;
        if(confirm(`Voulez-vous retirer ${selectedFriend.firstname} de vos amis ?`)) {
             controleur.envoie(messagesCompRef.current, {
                remove_friend: {
                     userId: currentUser._id,
                     friendId: selectedFriend._id
                 }
             });
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !selectedFriend || !currentUser) return;

        controleur.envoie(messagesCompRef.current, {
            'send message': {
                senderId: currentUser._id,
                receiverId: selectedFriend._id,
                content: inputMessage
            }
        });
        playMessageSend();
        setInputMessage('');
    };

    const handleStartCall = () => {
        if (selectedFriend && selectedFriend.is_online) {
            startCall(selectedFriend);
        }
    };

    const filteredFriends = friends.filter(friend => 
        friend.firstname.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <h2>Messages</h2>
                </div>
                
                <div className={styles.searchBarWrapper}>
                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                        type="text"
                        placeholder="Rechercher une discussion..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.friendList}>
                    {filteredFriends.map(friend => (
                        <div 
                            key={friend._id} 
                            className={`${styles.friendItem} ${selectedFriend?._id === friend._id ? styles.active : ''}`}
                            onClick={() => handleSelectFriend(friend)}
                        >
                            <img 
                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${friend._id}`}
                                alt={friend.firstname}
                                className={styles.avatar}
                            />
                            <div className={styles.friendInfo}>
                                <div className={styles.friendName}>
                                    {friend.firstname}
                                    {friend.role && friend.role !== 'etudiant' && (
                                        <span className={styles.roleBadge} style={{
                                            background: friend.role === 'admin' ? '#DCFCE7' : '#F3E8FF',
                                            color: friend.role === 'admin' ? '#166534' : '#7E22CE',
                                        }}>
                                            {friend.role}
                                        </span>
                                    )}
                                </div>
                                 <div className={styles.friendStatus} style={{color: friend.isInCall ? '#EF4444' : (friend.is_online ? '#22C55E' : '#94A3B8')}}>
                                    {friend.isInCall ? '• En appel' : (friend.is_online ? '• En ligne' : '• Hors ligne')}
                                </div>
                            </div>
                            {friend.unreadCount > 0 && (
                                <div className={styles.unreadBadge}>
                                    {friend.unreadCount}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredFriends.length === 0 && (
                        <div className={styles.emptyState}>Aucun contact trouvé.</div>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {(selectedFriend || !isMobile) && (
                    <motion.div 
                        key={selectedFriend ? selectedFriend._id : 'no-chat'}
                        className={styles.chatArea}
                        initial={{ x: isMobile ? "100%" : 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: isMobile ? "100%" : -40, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        {selectedFriend ? (
                            <>
                                <div className={styles.chatHeader}>
                                    <button className={styles.mobileBackBtn} onClick={() => setSelectedFriend(null)}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                    </button>

                                    <div className={styles.chatTitle}>
                                        <img 
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${selectedFriend._id}`} 
                                            className={styles.headerAvatar}
                                        />
                                        {selectedFriend.firstname}
                                        <span className={styles.roleBadge} style={{
                                            background: selectedFriend.role === 'admin' ? '#DCFCE7' : (selectedFriend.role === 'enseignant' ? '#F3E8FF' : '#DBEAFE'),
                                            color: selectedFriend.role === 'admin' ? '#166534' : (selectedFriend.role === 'enseignant' ? '#7E22CE' : '#1E40AF'),
                                        }}>
                                            {selectedFriend.role || 'Étudiant'}
                                        </span>
                                    </div>

                                    {/* Call Button SVG */}
                                    {/* Call Button (Updated) */}
                                    <button 
                                        onClick={handleStartCall}
                                        title={selectedFriend.isInCall ? "L'utilisateur est déjà en ligne" : (selectedFriend.is_online ? "Démarrer un appel vocal" : "Utilisateur hors ligne")}
                                        disabled={!selectedFriend.is_online || selectedFriend.isInCall}
                                        style={{ 
                                            opacity: (selectedFriend.is_online && !selectedFriend.isInCall) ? 1 : 0.5, 
                                            cursor: (selectedFriend.is_online && !selectedFriend.isInCall) ? 'pointer' : 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '8px 16px',
                                            background: selectedFriend.isInCall ? '#EF4444' : '#3B82F6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '999px',
                                            fontWeight: '600',
                                            fontSize: '0.9rem',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => (selectedFriend.is_online && !selectedFriend.isInCall) && (e.currentTarget.style.background = '#2563EB')}
                                        onMouseOut={(e) => (selectedFriend.is_online && !selectedFriend.isInCall) && (e.currentTarget.style.background = (selectedFriend.isInCall ? '#EF4444' : '#3B82F6'))}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                                        {selectedFriend.isInCall ? 'Occupé' : 'Appeler'}
                                    </button>

                                    <button type="button" onClick={handleRemoveFriend} className={styles.removeBtn}>
                                        Retirer
                                    </button>
                                </div>
                                
                                <div className={styles.messagesList}>
                                    {messages.filter(m => 
                                        (m.sender === currentUser?._id && m.receiver === selectedFriend._id) ||
                                        (m.sender === selectedFriend._id && m.receiver === currentUser?._id)
                                    ).map((msg, index) => {
                                        const isMe = msg.sender === currentUser._id;
                                        return (
                                            <div key={index} className={`${styles.messageRow} ${isMe ? styles.myMessageRow : styles.friendMessageRow}`}>
                                                <div className={styles.messageBubble}>
                                                    {msg.content}
                                                </div>
                                                <div className={styles.messageTime}>
                                                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className={styles.inputArea}>
                                    <form className={styles.messageForm} onSubmit={handleSendMessage}>
                                        <input
                                            type="text"
                                            className={styles.messageInput}
                                            placeholder="Écrivez un message..."
                                            value={inputMessage}
                                            onChange={(e) => setInputMessage(e.target.value)}
                                        />
                                        <button type="submit" className={styles.sendBtn}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className={styles.noChatSelected}>
                                <div className={styles.noChatIcon}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                </div>
                                <p style={{fontSize:'18px', fontWeight:700, color:'#1E3664', marginBottom:8}}>Vos Conversations</p>
                                <p style={{fontSize:'14px'}}>Sélectionnez un contact pour commencer à discuter.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
