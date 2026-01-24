"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './home.module.css';
import Link from 'next/link';
import { useSocket } from '../context/SocketContext';

export default function Home() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [recentConversations, setRecentConversations] = useState([]);
    
    // Use Socket
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/');
            return;
        }
        try {
            const u = JSON.parse(userStr);
            setUser(u);
        } catch (e) {
            console.error(e);
            router.push('/');
        }
    }, [router]);

    // Socket Subscription for Home Page
    useEffect(() => {
        if (!user || !controleur || !isReady) return;

        const homeComp = {
            nomDInstance: "HomeComponent",
            traitementMessage: (msg) => {
                if (msg.last_messages) {
                    setRecentConversations(msg.last_messages.conversations || []);
                }
                else if (msg['auth status'] && msg['auth status'].success) {
                    const updatedUser = msg['auth status'].user;
                    setUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser)); // Keep synced
                }
                else if (msg['user_updating status'] && msg['user_updating status'].success) {
                     const updatedUser = msg['user_updating status'].user;
                     setUser(updatedUser);
                     localStorage.setItem('user', JSON.stringify(updatedUser));
                }
                // Also listen for NEW messages to update the list live?
                else if (msg.receive_private_message || msg.receive_team_message) {
                    // Optimized: Re-fetch or manually prepend?
                    // For now, let's just trigger a re-fetch to keep it simple and accurate
                    controleur.envoie(homeComp, { get_last_messages: { userId: user._id } });
                }
            }
        };

        controleur.inscription(homeComp, 
            ['get_last_messages'], 
            ['last_messages', 'receive_private_message', 'receive_team_message', 'auth status', 'user_updating status']
        );
        
        // Initial Fetch
        controleur.envoie(homeComp, { get_last_messages: { userId: user._id } });

        return () => {
             controleur.desincription(homeComp, 
                ['get_last_messages'], 
                ['last_messages', 'receive_private_message', 'receive_team_message', 'auth status', 'user_updating status']
            );
        };
    }, [user, controleur, isReady]);

    if (!user) return null;

    // Mock Data for Groups (kept as is)
    const groups = [1, 2, 3, 4, 5]; 

    return (
        <div className={styles.container}>
            {/* Top Right User Header */}
            <div className={styles.topHeader}>
                <Link href="/profile" className={styles.userMenu}>
                    <div style={{position:'relative', marginRight: 10}}>
                        <img 
                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`} 
                            alt="Profile" 
                            className={styles.userAvatarSmall} 
                        />
                         <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            border: '2px solid white',
                            backgroundColor: user.disturb_status === 'dnd' ? '#EF4444' : 
                                            (user.disturb_status === 'away' ? '#F97316' : '#22C55E')
                        }}></div>
                    </div>
                </Link>
            </div>

            {/* Welcome Title */}
            <h1 className={styles.welcomeTitle}>
                Bonjour, <span className={styles.highlightName}>{user.firstname}</span>👋. Prêt pour votre journée ?
            </h1>

            <div className={styles.dashboardGrid}>
                {/* Vos Groupes (Abstract Shapes) */}
                <div>
                    <h2 className={styles.sectionTitle}>Vos groupes :</h2>
                    <div className={styles.groupsRow}>
                        {groups.map((g) => (
                            <img 
                                key={g}
                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=group${g}`}
                                alt="Group"
                                className={styles.groupAvatar}
                                onClick={() => router.push('/team')}
                            />
                        ))}
                    </div>
                </div>

                {/* Historique */}
                <div>
                    <h2 className={styles.sectionTitle}>Historique d'appels :</h2>
                    <div className={styles.historyContainer}>
                        <svg className={styles.historyIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={styles.historyText}>Aucun historique disponible</span>
                    </div>
                </div>
            </div>

            {/* Recent Conversations */}
            <div className={styles.notificationsSection}>
                <div className={styles.notifHeader}>
                    <span className={styles.bellIcon}>🔔</span>
                    <h2 className={styles.notifTitle}>Messages récents</h2>
                </div>

                <div className={styles.notifList}>
                    {recentConversations.filter(c => c.count > 0).length === 0 ? (
                        <p style={{color:'#94A3B8', fontSize:'14px'}}>Aucun message non lu.</p>
                    ) : (
                        recentConversations.filter(c => c.count > 0).map((conv) => (
                            <div 
                                key={conv.id} 
                                className={styles.notifItem}
                                onClick={() => router.push(conv.type === 'team' ? '/team' : '/messages')}
                                style={{cursor: 'pointer'}}
                            >
                                <div className={styles.notifLeft}>
                                    <img 
                                        src={`https://api.dicebear.com/9.x/shapes/svg?seed=${conv.name}`}
                                        alt={conv.name}
                                        className={styles.notifAvatar}
                                    />
                                    <div className={styles.notifContent}>
                                        <span className={styles.notifName}>
                                            {conv.name} 
                                            {conv.type === 'team' && <span style={{fontSize:'10px', backgroundColor:'#E2E8F0', padding:'2px 6px', borderRadius:'10px', marginLeft:'6px'}}>Équipe</span>}
                                        </span>
                                        <span className={styles.notifMessage} style={{fontWeight: 'bold', color:'#0F172A'}}>
                                            {conv.lastMessage}
                                        </span>
                                    </div>
                                </div>
                                <div style={{display:'flex', alignItems:'center'}}>
                                    {conv.count > 0 && (
                                        <div style={{
                                            backgroundColor: '#EF4444', color: 'white', 
                                            borderRadius: '50%', width: '20px', height: '20px', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '11px', fontWeight: 'bold', marginRight: '10px'
                                        }}>
                                            {conv.count}
                                        </div>
                                    )}
                                    <svg className={styles.arrowIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}
