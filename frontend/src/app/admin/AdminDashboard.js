"use client";
import React, { useEffect, useState, useRef } from 'react';
import styles from './admin.module.css';
import { useSocket } from '../context/SocketContext';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [activeCallsCount, setActiveCallsCount] = useState(0);
    
    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editRole, setEditRole] = useState('etudiant');
    const [searchTerm, setSearchTerm] = useState('');

    const { controleur, isReady } = useSocket();
    const adminCompRef = useRef(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }

        if (!controleur || !isReady) return;

        const adminComp = {
            nomDInstance: "AdminComponent",
            traitementMessage: (msg) => {
                if (msg.users) {
                    if (msg.users.success) {
                        setUsers(msg.users.users);
                    }
                }
                if (msg['user_updating status']) {
                    const status = msg['user_updating status'];
                    if (status.success) {
                        setUsers(prev => prev.map(u => u._id === status.user._id ? status.user : u));
                        setIsEditModalOpen(false);
                        setEditingUser(null);
                    } else {
                        alert("Erreur: " + status.error);
                    }
                }
                if (msg.user_deleting_status) {
                    if (msg.user_deleting_status.success) {
                        setUsers(prev => prev.filter(u => u._id !== msg.user_deleting_status.userId));
                    } else {
                        alert("Erreur: " + msg.user_deleting_status.error);
                    }
                }
                if (msg.active_calls_count !== undefined) {
                    setActiveCallsCount(msg.active_calls_count);
                }
            }
        };
        adminCompRef.current = adminComp;
        
        controleur.inscription(adminComp, 
            ['get users', 'update user', 'delete_user', 'get_active_calls'], 
            ['users', 'user_updating status', 'user_deleting_status', 'active_calls_count']
        );

        controleur.envoie(adminComp, { 'get users': {} });
        controleur.envoie(adminComp, { 'get_active_calls': {} });

        return () => {
             controleur.desincription(adminComp, 
                ['get users', 'update user', 'delete_user', 'get_active_calls'], 
                ['users', 'user_updating status', 'user_deleting_status', 'active_calls_count']
            );
        };
    }, [controleur, isReady]);

    const connectedUsers = users.filter(u => u.is_online).length;
    const totalUsers = users.length;
    
    const filteredUsers = users.filter(u => 
        u.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const handleLogout = () => {
        localStorage.removeItem('user');
        router.push('/login');
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditRole(user.role || 'etudiant');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingUser || !controleur || !adminCompRef.current) return;
        controleur.envoie(adminCompRef.current, {
            'update user': { _id: editingUser._id, role: editRole }
        });
    };

    const handleDeleteClick = (user) => {
        if (!confirm(`Supprimer ${user.firstname} ?`)) return;
        if (controleur && adminCompRef.current) {
            controleur.envoie(adminCompRef.current, { delete_user: { _id: user._id } });
        }
    };

    if (!currentUser) return null;

    return (
        <div className={styles.layoutContainer}>
            <div className={styles.leftColumn}>
                <div className={styles.profileCard}>
                    <div style={{position:'relative', display:'inline-block'}}>
                        <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${currentUser._id}`} className={styles.profileAvatar} />
                        <div style={{
                            position: 'absolute', bottom: 4, right: 4, width: 14, height: 14,
                            borderRadius: '50%', border: '3px solid #F8FAFC',
                            backgroundColor: currentUser.disturb_status === 'dnd' ? '#EF4444' : (currentUser.disturb_status === 'away' ? '#F97316' : '#22C55E')
                        }}></div>
                    </div>
                    <div className={styles.profileName}>{currentUser.firstname}</div>
                    <button onClick={handleLogout} className={styles.logoutButton}>Quitter</button>
                </div>

                <div className={styles.menuNav}>
                    <div className={`${styles.menuItem} ${styles.menuItemActive}`}>Utilisateurs</div>
                    <div className={styles.menuItem}>Rôles</div>
                    <div className={styles.menuItem}>Équipes</div>
                </div>
            </div>

            <div className={styles.rightColumn}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.headerTitle}>Administration</h1>
                    <div className={styles.headerSubtitle}>Gérez les accès et les utilisateurs.</div>

                    <div className={styles.statsRow}>
                        <div className={styles.statCard}>
                            <div className={styles.statIconContainer} style={{background:'#DBEAFE'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E40AF" strokeWidth="2.5"><circle cx="9" cy="7" r="4"></circle><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
                            <div className={styles.statLabel}>En Ligne</div>
                            <div className={styles.statValue}>{connectedUsers} connectés</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={`${styles.statIconContainer} ${activeCallsCount > 0 ? styles.pulse : ''}`} style={{background:'#F3E8FF'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7E22CE" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></div>
                            <div className={styles.statLabel}>Appels</div>
                            <div className={styles.statValue}>{activeCallsCount} actif(s)</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIconContainer} style={{background:'#DCFCE7'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></div>
                            <div className={styles.statLabel}>Total</div>
                            <div className={styles.statValue}>{totalUsers} membres</div>
                        </div>
                    </div>

                    <div className={styles.controlsRow}>
                        <div className={styles.searchWrapper}>
                            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input 
                                type="text" 
                                placeholder="Chercher un membre (nom, email)..." 
                                className={styles.searchInput} 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.listContainer}>
                        <div className={styles.listHeader}>
                            <div className={styles.headerCol}>Identité</div>
                            <div className={styles.headerCol} style={{flex:0.6}}>Rôle</div>
                            <div className={styles.headerCol}>Coordonnées</div>
                            <div className={styles.actions} style={{width: 100}}></div>
                        </div>

                        {filteredUsers.map(u => (
                            <div key={u._id} className={styles.userCard}>
                                <div className={styles.userInfo}>
                                    <div style={{position:'relative'}}>
                                        <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${u._id}`} className={styles.listAvatar} />
                                        <div style={{
                                            position: 'absolute', bottom: 2, right: 2, width: 12, height: 12,
                                            borderRadius: '50%', border: '2.5px solid #FFFFFF',
                                            backgroundColor: u.is_online ? '#22C55E' : '#94A3B8'
                                        }}></div>
                                    </div>
                                    <div className={styles.userTexts}>
                                        <span className={styles.listName}>{u.firstname}</span>
                                        <span className={styles.listEmail}>{u.email}</span>
                                    </div>
                                </div>
                                <div style={{flex:0.6}}><span className={`${styles.badge} ${styles[u.role?.toLowerCase() || 'etudiant']}`}>{u.role || 'Étudiant'}</span></div>
                                <div className={styles.listPhone}>{u.phone || '-'}</div>
                                <div className={styles.actions}>
                                    <button className={styles.iconBtn} onClick={() => handleEditClick(u)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                                    <button className={styles.iconBtn} style={{color:'#EF4444'}} onClick={() => handleDeleteClick(u)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.totalCount}>{totalUsers} membres au total</div>
                        <button className={styles.nextBtn}>Page Suivante</button>
                    </div>
                </div>
            </div>

            {isEditModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 style={{color: '#1E3664', fontWeight: 800, marginBottom: '20px', marginTop: 0}}>Modifier le rôle</h2>
                        <div style={{marginBottom:'24px'}}>
                            <label style={{display:'block', marginBottom:'8px', fontSize:'12px', fontWeight:800, textTransform:'uppercase', color:'#94A3B8'}}>Privilèges</label>
                            <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:'12px', border:'1.5px solid #E2E8F0', outline:'none', fontWeight: 700, color: '#1E3664'}}>
                                <option value="etudiant">Étudiant</option>
                                <option value="enseignant">Enseignant</option>
                                <option value="admin">Administrateur</option>
                            </select>
                        </div>
                        <div style={{display:'flex', justifyContent:'flex-end', gap:'12px'}}>
                            <button onClick={() => setIsEditModalOpen(false)} style={{padding:'10px 18px', borderRadius:'12px', border:'none', background:'#F1F5F9', color:'#64748B', fontWeight:700, cursor:'pointer'}}>Annuler</button>
                            <button onClick={handleSaveEdit} style={{padding:'10px 18px', borderRadius:'12px', border:'none', background:'#1E3664', color:'white', fontWeight:700, cursor:'pointer'}}>Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
