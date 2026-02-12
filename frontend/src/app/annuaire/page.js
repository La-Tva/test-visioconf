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
    const [selectedUser, setSelectedUser] = useState(null);

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
                 }
            }
        };
        directoryCompRef.current = dirComp;
        controleur.inscription(dirComp, 
            ['friend_removed', 'friend_request', 'remove_friend'], 
            ['friend_removed']
        );
        
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

    // Profile Preview Modal Component
    const ProfilePreviewModal = ({ user: u, onClose }) => {
        if (!u) return null;
        const isMe = currentUser && currentUser._id === u._id;
        const isFriend = users.find(me => me._id === currentUser?._id)?.friends?.includes(u._id);
        const isPending = u.friendRequests && currentUser && u.friendRequests.includes(currentUser._id);

        return (
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={styles.previewModal} onClick={e => e.stopPropagation()}>
                    <button className={styles.closeModal} onClick={onClose}>×</button>
                    
                    <div className={styles.previewHeader}>
                        <div className={styles.previewAvatarWrapper}>
                            <img 
                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${u._id}`}
                                alt={u.firstname}
                                className={styles.previewAvatar}
                            />
                            <div className={styles.previewStatusDot} style={{
                                backgroundColor: u.is_online ? '#22C55E' : '#94A3B8'
                            }}></div>
                        </div>
                        <div className={styles.previewIdentity}>
                            <h2 className={styles.previewName}>{u.firstname}</h2>
                            <p className={styles.previewEmail}>{u.email}</p>
                            <span className={`${styles.roleBadge} ${styles[u.role?.toLowerCase() || 'etudiant']}`}>
                                {u.role === 'admin' ? 'Administrateur' : (u.role === 'enseignant' ? 'Enseignant' : 'Étudiant')}
                            </span>
                        </div>
                    </div>

                    <div className={styles.previewContent}>
                        <div className={styles.previewSection}>
                            <label>Biographie</label>
                            <p className={styles.previewBio}>{u.desc || "Aucune biographie renseignée."}</p>
                        </div>
                        
                        <div className={styles.previewSection} style={{ marginTop: '1.5rem' }}>
                            <label>Coordonnées</label>
                            <div className={styles.contactDetails}>
                                <div className={styles.contactItem}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                    <span>{u.email}</span>
                                </div>
                                {u.phone && (
                                    <div className={styles.contactItem}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        <span>{u.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className={styles.previewMetaGrid}>
                            <div className={styles.metaItem}>
                                <label>Statut</label>
                                <span className={styles.metaValue}>
                                    {u.is_online ? 'En ligne' : 'Hors ligne'}
                                </span>
                            </div>
                            <div className={styles.metaItem}>
                                <label>Appels Vidéo</label>
                                <span className={styles.metaValue}>{u.videoCallsCount || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.previewActions}>
                        {!isMe && (
                            <button 
                                className={styles.previewActionBtn}
                                onClick={() => {
                                    if (isFriend) {
                                        if(confirm('Retirer cet ami ?')) {
                                            controleur.envoie(directoryCompRef.current, {
                                                remove_friend: { userId: currentUser._id, friendId: u._id }
                                            });
                                            onClose();
                                        }
                                    } else if (!isPending) {
                                        controleur.envoie(directoryCompRef.current, {
                                            friend_request: { fromUserId: currentUser._id, toUserId: u._id }
                                        });
                                        onClose();
                                    }
                                }}
                            >
                                {isPending ? 'Demande envoyée' : (isFriend ? 'Retirer des amis' : 'Ajouter comme ami')}
                            </button>
                        )}
                        <button className={styles.secondaryActionBtn} onClick={onClose}>Fermer</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.directoryWrapper}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h1 className={styles.title}>Membres</h1>
                        <p className={styles.subtitle}>{filteredUsers.length} utilisateurs trouvés</p>
                    </div>
                    
                    <div className={styles.searchWrapper}>
                        <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input 
                            type="text" 
                            placeholder="Rechercher..." 
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.ribbonWrapper}>
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
                        <div className={styles.filterDivider}></div>
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
                </div>

                <div className={styles.grid}>
                    {filteredUsers.map(u => {
                        const isMe = currentUser && currentUser._id === u._id;
                        const myFriends = users.find(me => me._id === currentUser?._id)?.friends || [];
                        const isFriend = myFriends.includes(u._id);
                        const isPending = u.friendRequests && currentUser && u.friendRequests.includes(currentUser._id);

                        return (
                            <div key={u._id} className={styles.card} onClick={() => setSelectedUser(u)}>
                                <div className={styles.cardTop}>
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
                                                opacity: u.is_online ? 1 : 0.3
                                            }}
                                        ></div>
                                    </div>
                                    <div className={styles.cardIdentity}>
                                        <h3 className={styles.name}>{u.firstname}</h3>
                                        <p className={styles.email}>{u.email}</p>
                                    </div>
                                </div>
                                
                                <div className={styles.cardFooter}>
                                    <div className={styles.footerLeft}>
                                        <span className={`${styles.roleBadge} ${styles[u.role?.toLowerCase() || 'etudiant']}`}>
                                            {u.role || 'Étudiant'}
                                        </span>
                                        {isFriend && <span className={styles.friendBadge}>Ami</span>}
                                    </div>

                                    {!isMe && !isFriend && (
                                        <button 
                                            className={`${styles.explicitAddBtn} ${isPending ? styles.pendingBtn : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isPending) {
                                                    controleur.envoie(directoryCompRef.current, {
                                                        friend_request: { fromUserId: currentUser._id, toUserId: u._id }
                                                    });
                                                }
                                            }}
                                            disabled={isPending}
                                        >
                                            {isPending ? (
                                                <>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    <span>Invitée</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                    <span>Inviter</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedUser && <ProfilePreviewModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
        </div>
    );
}
