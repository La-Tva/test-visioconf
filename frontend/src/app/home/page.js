"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './home.module.css';
import Link from 'next/link';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';

// --- SVG ICONS ---
const WaveIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.05 18C19.05 18.55 18.6 19 18.05 19C17.5 19 17.05 18.55 17.05 18V13C17.05 12.45 17.5 12 18.05 12C18.6 12 19.05 12.45 19.05 13V18Z" fill="#FBBF24"/>
        <path d="M15 20C15 20.55 14.55 21 14 21C13.45 21 13 20.55 13 20V11C13 10.45 13.45 10 14 10C14.55 10 15 10.45 15 11V20Z" fill="#FBBF24"/>
        <path d="M11 22C11 22.55 10.55 23 10 23C9.45 23 9 22.55 9 22V13C9 12.45 9.45 12 10 12C10.55 12 11 12.45 11 13V22Z" fill="#FBBF24"/>
        <path d="M7 20C7 20.55 6.55 21 6 21C5.45 21 5 20.55 5 20V15C5 14.45 5.45 14 6 14C6.55 14 7 14.45 7 15V20Z" fill="#FBBF24"/>
        <path d="M3 15C3 15.55 2.55 16 2 16C1.45 16 1 15.55 1 15V13C1 12.45 1.45 12 2 12C2.55 12 3 12.45 3 13V15Z" fill="#FBBF24"/>
    </svg>
);

const VideoIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
);

const FolderIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
);

const ShieldIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
);

const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

export default function Home() {
    const router = useRouter();
    const { friends, users, teams, recentConversations, activeCallsCount, controleur, isReady } = usePreload();
    const [user, setUser] = useState(null);
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    
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

    const handleStatusChange = (status) => {
        if (!user || !controleur || !isReady) return;
        controleur.envoie({ nomDInstance: "HomeComponent" }, {
            'update user': {
                _id: user._id,
                disturb_status: status
            }
        });
        setIsStatusMenuOpen(false);
    };

    if (!user) return null;

    // REAL DATA AUDIT: No more artificial limits on teams list
    const myTeams = teams;

    // REAL DATA AUDIT: Show top 5 active conversations (unread or not)
    const activeConversations = recentConversations.slice(0, 5);

    // RESTORED: These are needed for the badges and online list
    const totalPrivateUnread = recentConversations
        .filter(c => c.type === 'private')
        .reduce((sum, c) => sum + (c.count || 0), 0);
    const totalTeamUnread = recentConversations
        .filter(c => c.type === 'team')
        .reduce((sum, c) => sum + (c.count || 0), 0);
    const onlineFriends = users.filter(u => 
        u._id !== user._id && 
        u.is_online && 
        user.friends?.includes(u._id)
    );

    return (
        <div className={styles.container}>
            {/* Top Right User Header */}
            <div className={styles.topHeader}>
                <div className={styles.liveStats}>
                    <div className={styles.liveBadge} style={{backgroundColor: totalPrivateUnread > 0 ? '#FEF2F2' : '#F8FAFC', color: totalPrivateUnread > 0 ? '#EF4444' : '#64748B', borderColor: totalPrivateUnread > 0 ? '#FEE2E2' : '#F1F5F9'}}>
                        <span className={styles.pulseDot} style={{backgroundColor: totalPrivateUnread > 0 ? '#EF4444' : '#94A3B8'}}></span>
                        {totalPrivateUnread} {totalPrivateUnread > 1 ? 'Messages' : 'Message'}
                    </div>
                    <div className={styles.liveBadge} style={{backgroundColor: totalTeamUnread > 0 ? '#EFF6FF' : '#F8FAFC', color: totalTeamUnread > 0 ? '#2563EB' : '#64748B', borderColor: totalTeamUnread > 0 ? '#DBEAFE' : '#F1F5F9'}}>
                        <span className={styles.pulseDot} style={{backgroundColor: totalTeamUnread > 0 ? '#3B82F6' : '#94A3B8'}}></span>
                        {totalTeamUnread} {totalTeamUnread > 1 ? 'Équipes' : 'Équipe'}
                    </div>
                </div>

                <div className={styles.userContainer}>
                    <div className={styles.statusSwitcher}>
                        <button className={styles.currentStatusBtn} onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}>
                            <div className={styles.statusPreview} style={{
                                backgroundColor: user.disturb_status === 'dnd' ? '#EF4444' : 
                                                (user.disturb_status === 'away' ? '#F97316' : '#22C55E'),
                                color: user.disturb_status === 'dnd' ? '#EF4444' : 
                                       (user.disturb_status === 'away' ? '#F97316' : '#22C55E')
                            }}></div>
                            <span className={styles.statusLabelText}>
                                {user.disturb_status === 'available' ? 'Disponible' : (user.disturb_status === 'away' ? 'Absent' : 'Ne pas déranger')}
                            </span>
                        </button>
                        
                        {isStatusMenuOpen && (
                            <div className={styles.statusDropdown}>
                                <button onClick={() => handleStatusChange('available')}>
                                    <span className={styles.dot} style={{backgroundColor: '#22C55E'}}></span> Disponible
                                </button>
                                <button onClick={() => handleStatusChange('away')}>
                                    <span className={styles.dot} style={{backgroundColor: '#F97316'}}></span> Absent
                                </button>
                                <button onClick={() => handleStatusChange('dnd')}>
                                    <span className={styles.dot} style={{backgroundColor: '#EF4444'}}></span> Ne pas déranger
                                </button>
                            </div>
                        )}
                    </div>

                    <Link href="/profile" className={styles.userMenu}>
                        <img 
                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`} 
                            alt="Profile" 
                            className={styles.userAvatarSmall} 
                        />
                    </Link>
                </div>
            </div>

            {/* Quick Action Ribbon */}
            <div className={styles.actionRibbon}>
                <button className={styles.ribbonBtn} onClick={() => router.push('/messages')}>
                    <div className={`${styles.ribbonIcon} ${styles.blue}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <span>Chat</span>
                </button>
                <button className={styles.ribbonBtn} onClick={() => router.push('/team')}>
                    <div className={`${styles.ribbonIcon} ${styles.purple}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                    </div>
                    <span>Équipe</span>
                </button>
                <button className={styles.ribbonBtn} onClick={() => router.push('/messages')}>
                    <div className={`${styles.ribbonIcon} ${styles.orange}`}>
                        <VideoIcon />
                    </div>
                    <span>Appel</span>
                </button>
                <button className={styles.ribbonBtn} onClick={() => router.push('/files')}>
                    <div className={`${styles.ribbonIcon} ${styles.green}`}>
                        <FolderIcon />
                    </div>
                    <span>Fichiers</span>
                </button>
                {user.role === 'admin' && (
                    <button className={`${styles.ribbonBtn} ${styles.adminBtn}`} onClick={() => router.push('/admin')}>
                        <div className={`${styles.ribbonIcon} ${styles.red}`}>
                            <ShieldIcon />
                        </div>
                        <span>Admin</span>
                    </button>
                )}
            </div>

            {/* Welcome Title */}
            <h1 className={styles.welcomeTitle}>
                Bonjour, <span className={styles.highlightName}>{user.firstname}</span> <WaveIcon />
            </h1>

            <div className={styles.bentoGrid}>
                {/* Left Column: Teams & Space */}
                <div className={styles.bentoLeft}>
                    <div className={styles.bentoSection}>
                        <h2 className={styles.sectionTitle}>Mes équipes</h2>
                        <div className={styles.teamsGrid}>
                            {myTeams.length > 0 ? (
                                myTeams.map((team) => (
                                    <div key={team._id} className={styles.teamCard} onClick={() => router.push('/team')}>
                                        <img 
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${team._id}`}
                                            alt={team.name}
                                            className={styles.teamAvatar}
                                        />
                                        <span className={styles.listName}>{team.name}</span>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.emptyText}>Aucune équipe configurée</p>
                            )}
                        </div>
                    </div>

                    <div className={styles.bentoBottom}>
                        <h2 className={styles.sectionTitle}>Conversations récentes</h2>
                        <div className={styles.notifList}>
                            {activeConversations.length === 0 ? (
                                <div className={styles.emptyRecent}>
                                    <div className={styles.checkCircle}>
                                        <CheckIcon />
                                    </div>
                                    <p className={styles.emptyText}>Aucune activité récente</p>
                                </div>
                            ) : (
                                activeConversations.map((conv) => (
                                    <div key={conv.id} className={styles.notifItem} onClick={() => router.push(conv.type === 'team' ? '/team' : '/messages')}>
                                        <div className={styles.notifLeft}>
                                            <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${conv.id}`} alt={conv.name} className={styles.notifAvatar} />
                                            <div className={styles.notifContent}>
                                                <span className={styles.notifName}>{conv.name}</span>
                                                <span className={styles.notifMessage}>{conv.lastMessage || 'Aucun message'}</span>
                                            </div>
                                        </div>
                                        {conv.count > 0 && <span className={styles.badgeCount}>{conv.count}</span>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Online Users */}
                <div className={styles.bentoRight}>
                    <div className={styles.bentoSection}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>Contacts en ligne</h2>
                            <span className={styles.onlineCount}>{onlineFriends.length}</span>
                        </div>
                        <div className={styles.onlineList}>
                            {onlineFriends.length > 0 ? (
                                onlineFriends.map((u) => (
                                    <div key={u._id} className={styles.onlineUserItem} onClick={() => router.push('/messages')}>
                                        <div className={styles.avatarWrapper}>
                                            <img 
                                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${u._id}`}
                                                alt={u.firstname}
                                                className={styles.smallAvatar}
                                            />
                                            <span className={styles.onlineDot}></span>
                                        </div>
                                        <span className={styles.listNameSmall}>{u.firstname}</span>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.emptyText}>Aucun ami connecté</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



