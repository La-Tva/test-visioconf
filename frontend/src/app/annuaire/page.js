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
            console.log("Annuaire loaded user from storage:", JSON.parse(u));
            setCurrentUser(JSON.parse(u));
        }
    }, []);

    const { users: preloadedUsers, loading, refreshData } = usePreload();
    const { controleur, isReady } = useSocket();
    const directoryCompRef = useRef(null);

    useEffect(() => {
        if (preloadedUsers.length > 0) {
            setUsers(preloadedUsers);
            setFilteredUsers(preloadedUsers);
        }
    }, [preloadedUsers]);
    
    // Cleanup or additional listeners if needed (e.g. for friend_removed)
    useEffect(() => {
        if (!controleur || !isReady) return;
        
        const dirComp = {
            nomDInstance: "DirectoryComponent",
            traitementMessage: (msg) => {
                 // We can rely on PreloadContext for updates, or handle specific events here
                 if (msg.friend_removed) {
                     refreshData(); // Trigger global refresh
                     alert('Ami retiré.');
                 }
            }
        };
        directoryCompRef.current = dirComp;
        controleur.inscription(dirComp, ['friend_removed'], []);
        
    }, [controleur, isReady, refreshData]);

    // Filter Logic
    useEffect(() => {
        let result = users || [];

        // Search
        if (searchTerm) {
            result = result.filter(u => 
                u.firstname.toLowerCase().includes(searchTerm.toLowerCase()) || 
                u.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Role & Friends Filter
        if (roleFilter === 'friends') {
            const me = users.find(u => u._id === currentUser?._id);
            const myFriends = me?.friends || [];
            result = result.filter(u => myFriends.includes(u._id));
        } else if (roleFilter !== 'all') {
            result = result.filter(u => (u.role || 'etudiant') === roleFilter);
        }

        setFilteredUsers(result);
    }, [searchTerm, roleFilter, users]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Annuaire</h1>
                <p className={styles.subtitle}>Retrouvez tous les membres de l'équipe.</p>
            </div>

            <div className={styles.controls}>
                {/* Search */}
                <div className={styles.searchWrapper}>
                    <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input 
                        type="text" 
                        placeholder="Rechercher par nom ou email..." 
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <select 
                    className={styles.filterSelect}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                >
                    <option value="all">Tous les rôles</option>
                    <option value="friends">Mes Amis</option>
                    <option value="etudiant">Étudiant</option>
                    <option value="enseignant">Enseignant</option>
                    <option value="admin">Administrateur</option>
                </select>
            </div>

            <div className={styles.grid}>
                {filteredUsers.map(u => {
                    const isMe = currentUser && currentUser._id === u._id;
                    // console.log(`Rendering user ${u.firstname} (${u._id}). CurrentUser: ${currentUser?._id}. IsMe: ${isMe}`);
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
                                    backgroundColor: u.disturb_status === 'dnd' ? '#EF4444' : 
                                            (u.disturb_status === 'away' ? '#F97316' : '#22C55E')
                                }}
                                title={!u.is_online ? 'Hors ligne' : u.disturb_status}
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
                            <button 
                                className={styles.contactBtn}
                                disabled={
                                    (currentUser && currentUser._id === u._id)
                                }
                                style={
                                    ((currentUser && currentUser._id === u._id)) 
                                    ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#94A3B8' } : 
                                    (users.find(me => me._id === currentUser?._id)?.friends?.includes(u._id))
                                    ? { backgroundColor: '#EF4444' } : {}
                                }
                                onClick={() => {
                                    const userStr = localStorage.getItem('user');
                                    if(userStr && controleur && directoryCompRef.current) {
                                        const me = JSON.parse(userStr);
                                        // Basic check to avoid self-request (UI should handle this too)
                                        if(me._id === u._id) return;
                                        
                                        const isFriend = users.find(meUser => meUser._id === me._id)?.friends?.includes(u._id);

                                        if (isFriend) {
                                            if(confirm('Voulez-vous retirer cet ami ?')) {
                                                controleur.envoie(directoryCompRef.current, {
                                                    remove_friend: {
                                                        userId: me._id,
                                                        friendId: u._id
                                                    }
                                                });
                                            }
                                        } else {
                                            controleur.envoie(directoryCompRef.current, {
                                                friend_request: {
                                                    fromUserId: me._id,
                                                    toUserId: u._id
                                                }
                                            });
                                            alert('Demande envoyée !'); 
                                        }
                                    }
                                }}
                            >
                                {
                                    currentUser && currentUser._id === u._id ? 'Vous' : 
                                    (users.find(me => me._id === currentUser?._id)?.friends?.includes(u._id) ? 'Retirer l\'ami' : 'Contacter')
                                }
                            </button>
                        </div>
                    </div>
                    );
                })}

                {filteredUsers.length === 0 && (
                    <div style={{gridColumn: '1/-1', textAlign:'center', padding:'2rem', color:'#64748B'}}>
                        Aucun utilisateur trouvé.
                    </div>
                )}
            </div>
        </div>
    );
}
