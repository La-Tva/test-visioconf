"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';
import styles from './messages.module.css';

export default function MessagesPage() {
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { friends: preloadedFriends, refreshData } = usePreload();
    const { controleur, isReady } = useSocket();
    const messagesCompRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if(preloadedFriends && preloadedFriends.length > 0) {
            console.log("MessagesPage received friends:", preloadedFriends.map(f => ({ name: f.firstname, role: f.role })));
            setFriends(preloadedFriends);
        }
    }, [preloadedFriends]);

    useEffect(() => {
        // Auth check
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
                 // Friends list is handled mostly by Preload, but if we get messages for a new friend...
                 // Actually logic is simpler if we rely on Preload for friend list.
                 if (msg.messages) {
                     setMessages(msg.messages.messages);
                 }
                 else if (msg.receive_private_message) {
                     const newMsg = msg.receive_private_message;
                     setMessages(prev => [...prev, newMsg]);
                 }
                else if (msg.friend_removed) {
                     refreshData();
                     setSelectedFriend(null);
                     // alert('Ami retiré.'); // Removed to prevent blocking/issue
                 }
            }
        };
        messagesCompRef.current = msgComp;
        
        // Subscribe
        controleur.inscription(msgComp, 
            ['get messages', 'send message', 'friend_removed'], 
            ['messages', 'receive_private_message']
        );

        // Cleanup
        return () => {
             controleur.desincription(msgComp, 
                ['get messages', 'send message', 'friend_removed'], 
                ['messages', 'receive_private_message']
             );
        };

    }, [controleur, isReady, refreshData]);

    // Filter messages for display based on selectedFriend
    const displayedMessages = messages.filter(m => 
        selectedFriend && (
            (m.sender === currentUser?._id && m.receiver === selectedFriend._id) ||
            (m.sender === selectedFriend._id && m.receiver === currentUser?._id)
        )
    );

    const handleSelectFriend = (friend) => {
        setSelectedFriend(friend);
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
        setInputMessage('');
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
                
                {/* Search Bar */}
                <div style={{padding: '0 20px 20px 20px'}}>
                    <input 
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            outline: 'none',
                            fontSize: '14px'
                        }}
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
                                        <span style={{
                                            fontSize:'9px', 
                                            marginLeft:'6px',
                                            padding:'2px 6px', 
                                            borderRadius:'10px', 
                                            active:'transparent',
                                            background: friend.role === 'admin' ? '#DCFCE7' : (friend.role === 'enseignant' ? '#F3E8FF' : '#DBEAFE'),
                                            color: friend.role === 'admin' ? '#166534' : (friend.role === 'enseignant' ? '#7E22CE' : '#1E40AF'),
                                            fontWeight: 700,
                                            textTransform: 'uppercase'
                                        }}>
                                            {friend.role}
                                        </span>
                                    )}
                                </div>
                                <div className={styles.friendStatus} style={{color: friend.is_online ? '#22C55E' : '#94A3B8'}}>
                                    {friend.is_online ? 'En ligne' : 'Hors ligne'}
                                </div>
                            </div>
                            {friend.unreadCount > 0 && (
                                <div style={{
                                    backgroundColor: '#EF4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    marginLeft: 'auto'
                                }}>
                                    {friend.unreadCount}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredFriends.length === 0 && (
                        <div className={styles.emptyState}>Aucun ami trouvé.</div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={styles.chatArea}>
                {selectedFriend ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.chatTitle}>
                                <img 
                                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${selectedFriend.firstname}`} // Fixed seed to logic
                                    className={styles.headerAvatar}
                                />
                                {selectedFriend.firstname}
                                {selectedFriend.role && selectedFriend.role !== 'etudiant' && (
                                    <span style={{
                                        fontSize:'10px',
                                        marginLeft: '8px', 
                                        padding:'3px 8px', 
                                        borderRadius:'12px', 
                                        background: selectedFriend.role === 'admin' ? '#DCFCE7' : (selectedFriend.role === 'enseignant' ? '#F3E8FF' : '#DBEAFE'),
                                        color: selectedFriend.role === 'admin' ? '#166534' : (selectedFriend.role === 'enseignant' ? '#7E22CE' : '#1E40AF'),
                                        fontWeight: 700,
                                        textTransform: 'uppercase'
                                    }}>
                                        {selectedFriend.role}
                                    </span>
                                )}
                            </div>
                            <button 
                                type="button" 
                                onClick={handleRemoveFriend} 
                                style={{
                                    marginLeft:'auto', 
                                    background:'#FEE2E2', color:'#EF4444', 
                                    border:'none', padding:'6px 12px', borderRadius:'6px',
                                    cursor:'pointer', fontSize: '0.8rem', fontWeight: '600'
                                }}
                            >
                                Retirer l'ami
                            </button>
                        </div>
                        
                        <div className={styles.messagesList}>
                            {displayedMessages.map((msg, index) => {
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

                        <form className={styles.inputArea} onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                className={styles.messageInput}
                                placeholder="Écrivez votre message..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                            />
                            <button type="submit" className={styles.sendBtn}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            </button>
                        </form>
                    </>
                ) : (
                    <div className={styles.noChatSelected}>
                        <p>Sélectionnez un ami pour commencer à discuter</p>
                    </div>
                )}
            </div>
        </div>
    );
}
