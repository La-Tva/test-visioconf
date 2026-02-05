"use client";
import React, { useEffect, useState, useRef } from 'react';
import styles from './directory.module.css';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';

export default function DirectoryPage() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if(u) {
            setCurrentUser(JSON.parse(u));
        }
    }, []);

    const { users: preloadedUsers, refreshData } = usePreload();
    const { controleur, isReady } = useSocket();
    const directoryCompRef = useRef(null);

    useEffect(() => {
        if (preloadedUsers.length > 0) {
            setUsers(preloadedUsers);
            setFilteredUsers(preloadedUsers);
        }
    }, [preloadedUsers]);
    
    useEffect(() => {
        if (!controleur || !isReady) return;
        
        const dirComp = {
            nomDInstance: "DirectoryComponent",
            traitementMessage: (msg) => {
                 if (msg.friend_removed) {
                     refreshData();
                     alert('Ami retiré.');
                 }
            }
        };
        directoryCompRef.current = dirComp;
        controleur.inscription(dirComp, ['friend_removed'], []);
        
    }, [controleur, isReady, refreshData]);

    useEffect(() => {
        let result = users || [];

        if (searchTerm) {
            result = result.filter(u => 
                u.firstname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                u.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (roleFilter === 'friends') {
            const me = users.find(u => u._id === currentUser?._id);
            const myFriends = me?.friends || [];
            result = result.filter(u => myFriends.includes(u._id));
        } else if (roleFilter !== 'all') {
            result = result.filter(u => (u.role || 'etudiant') === roleFilter);
        }

        setFilteredUsers(result);
    }, [searchTerm, roleFilter, users, currentUser]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Annuaire</h1>
                <p className={styles.subtitle}>Retrouvez tous les membres de la plateforme.</p>
            </div>

            <div className={styles.filterContainer}>
                <div className={styles.filterActions}>
                    <button 
                        className={`${styles.filterBtn} ${roleFilter === 'all' ? styles.filterBtnActive : ''}`}
                        onClick={() => setRoleFilter('all')}
                    >
                        Tous
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${roleFilter === 'friends' ? styles.filterBtnActive : ''}`}
                        onClick={() => setRoleFilter('friends')}
                    >
                        Amis
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${roleFilter === 'etudiant' ? styles.filterBtnActive : ''}`}
                        onClick={() => setRoleFilter('etudiant')}
                    >
                        Étudiants
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${roleFilter === 'enseignant' ? styles.filterBtnActive : ''}`}
                        onClick={() => setRoleFilter('enseignant')}
                    >
                        Enseignants
                    </button>
                    <button 
                        className={`${styles.filterBtn} ${roleFilter === 'admin' ? styles.filterBtnActive : ''}`}
                        onClick={() => setRoleFilter('admin')}
                    >
                        Admins
                    </button>
                </div>

                <div className={styles.searchWrapper}>
                    <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                        type="text" 
                        placeholder="Rechercher par nom ou email..." 
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.grid}>
                {filteredUsers.map(u => {
                    const isFriend = users.find(me => me._id === currentUser?._id)?.friends?.includes(u._id);
                    return (
                    <div key={u._id} className={styles.card}>
                        <div className={styles.avatarWrapper}>
                            <img 
                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${u._id}`}
                                alt={u.firstname}
                                className={styles.avatar}
                            />
                            <div 
                                className={styles.statusDot}
                                style={{
                                    backgroundColor: u.isInCall ? '#EF4444' : (u.disturb_status === 'dnd' ? '#EF4444' : 
                                            (u.disturb_status === 'away' ? '#F97316' : '#22C55E')),
                                    opacity: u.is_online ? 1 : 0.3,
                                    boxShadow: u.isInCall ? '0 0 0 2px #FFF, 0 0 0 4px #EF4444' : 'none'
                                }}
                            ></div>
                        </div>
                        
                        <div className={styles.info}>
                            <h3 className={styles.name}>{u.firstname}</h3>
                            <p className={styles.email}>{u.email}</p>
                            
                            <span className={`${styles.roleBadge} ${styles[u.role?.toLowerCase() || 'etudiant']}`}>
                                {u.role || 'Etudiant'}
                            </span>
                        </div>

                        <div className={styles.actions}>
                            {(() => {
                                const isFriend = users.find(me => me._id === currentUser?._id)?.friends?.includes(u._id);
                                const isPending = u.friendRequests && currentUser && u.friendRequests.includes(currentUser._id);
                                const isMe = currentUser && currentUser._id === u._id;

                                return (
                                    <button 
                                        className={styles.contactBtn}
                                        disabled={isMe || isPending}
                                        style={
                                            isMe ? { backgroundColor: '#CBD5E1', color: 'white' } : 
                                            (isPending ? { backgroundColor: '#F59E0B', color: 'white', cursor: 'default' } :
                                            (isFriend ? { backgroundColor: '#FF4D4D', color: 'white' } : {}))
                                        }
                                        onClick={() => {
                                            if(controleur && directoryCompRef.current) {
                                                if (isFriend) {
                                                    if(confirm('Retirer cet ami ?')) {
                                                        controleur.envoie(directoryCompRef.current, {
                                                            remove_friend: { userId: currentUser._id, friendId: u._id }
                                                        });
                                                    }
                                                } else if (!isPending) {
                                                    controleur.envoie(directoryCompRef.current, {
                                                        friend_request: { fromUserId: currentUser._id, toUserId: u._id }
                                                    });
                                                    alert('Demande envoyée !'); 
                                                    // Optimistic update could go here, but waiting for server refresh via socket is safer/standard
                                                }
                                            }
                                        }}
                                    >
                                        {isMe ? 'Vous' : (isPending ? 'En attente' : (isFriend ? "Retirer l'ami" : 'Ajouter'))}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
}
