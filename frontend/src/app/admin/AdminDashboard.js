"use client";
import React, { useEffect, useState, useRef } from 'react';
import styles from './admin.module.css';
import { useSocket } from '../context/SocketContext';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    
    // Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editRole, setEditRole] = useState('etudiant');

    // Socket
    const { controleur, isReady } = useSocket();
    const adminCompRef = useRef(null);

    useEffect(() => {
        // Load Current Admin User
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
                        alert("Erreur mise à jour: " + status.error);
                    }
                }
                if (msg.user_deleting_status) {
                    if (msg.user_deleting_status.success) {
                        setUsers(prev => prev.filter(u => u._id !== msg.user_deleting_status.userId));
                    } else {
                        alert("Erreur suppression: " + msg.user_deleting_status.error);
                    }
                }
            }
        };
        adminCompRef.current = adminComp;
        
        controleur.inscription(adminComp, 
            ['get users', 'update user', 'delete_user'], 
            ['users', 'user_updating status', 'user_deleting_status']
        );

        // Fetch users
        controleur.envoie(adminComp, { 'get users': {} });

        return () => {
             controleur.desincription(adminComp, 
                ['get users', 'update user', 'delete_user'], 
                ['users', 'user_updating status', 'user_deleting_status']
            );
        };
    }, [controleur, isReady]);

    // Stats
    const connectedUsers = users.filter(u => u.is_online).length;
    const totalUsers = users.length;
    
    // Helpers
    const formatDate = (dateString) => {
        if (!dateString) return '16/11/2005'; // Fallback to mock date if missing
        return new Date(dateString).toLocaleDateString('fr-FR'); 
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        router.push('/login');
    };

    // Actions
    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditRole(user.role || 'etudiant');
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingUser || !controleur || !adminCompRef.current) return;
        
        controleur.envoie(adminCompRef.current, {
            'update user': {
                _id: editingUser._id,
                role: editRole
            }
        });
    };

    const handleDeleteClick = (user) => {
        if (!confirm(`Voulez-vous vraiment supprimer ${user.firstname} ? Cette action est irréversible.`)) return;
        
        if (controleur && adminCompRef.current) {
            controleur.envoie(adminCompRef.current, {
                delete_user: { _id: user._id }
            });
        }
    };

    if (!currentUser) return null; // Loading

    return (
        <div className={styles.layoutContainer}>
            
            {/* Left Sidebar */}
            <div className={styles.leftColumn}>
                
                {/* Profile Card */}
                <div className={styles.profileCard}>
                    <div style={{position:'relative', marginBottom: 12}}>
                        <img 
                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${currentUser._id}`} 
                            alt="Profile" 
                            className={styles.profileAvatar}
                            style={{marginBottom: 0}}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: 14,
                            height: 14,
                            borderRadius: '50%',
                            border: '2px solid white',
                            backgroundColor: currentUser.disturb_status === 'dnd' ? '#EF4444' : 
                                            (currentUser.disturb_status === 'away' ? '#F97316' : '#22C55E')
                        }}></div>
                    </div>
                    <div className={styles.profileName}>
                        {currentUser.firstname} <br/>
                        <span style={{fontWeight:'400', fontSize:'0.9rem', color:'#64748B'}}>Utilisateur</span>
                    </div>
                    <button onClick={handleLogout} className={styles.logoutButton}>
                        DÉCONNEXION
                    </button>
                </div>

                {/* Navigation */}
                <div className={styles.menuNav}>
                    <div className={`${styles.menuItem} ${styles.menuItemActive}`}>Utilisateurs</div>
                    <div className={styles.menuItem}>Rôles</div>
                    <div className={styles.menuItem}>Permissions</div>
                    <div className={styles.menuItem}>Équipes</div>
                </div>

            </div>

            {/* Right Content */}
            <div className={styles.rightColumn}>
                
                {/* Header */}
                <div>
                    <h1 className={styles.headerTitle}>Bonjour {currentUser.firstname}</h1>
                    <div className={styles.headerSubtitle}>Liste des utilisateurs</div>
                </div>

                {/* Stats Row */}
                <div className={styles.statsRow}>
                    
                    {/* Stat 1 */}
                    <div className={styles.statCard}>
                        <div className={styles.statIconContainer} style={{background:'#DCFCE7'}}>
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <div className={styles.statLabel}>Nb utilisateur</div>
                        <div className={styles.statValue}>Utilisateurs connectés : {connectedUsers}</div>
                    </div>

                    {/* Stat 2 */}
                    <div className={styles.statCard}>
                        <div className={styles.statIconContainer} style={{background:'#F3E8FF'}}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7E22CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </div>
                        <div className={styles.statLabel}>Nb appels</div>
                        <div className={styles.statValue}>Appel(s) en cours : 0</div>
                    </div>

                    {/* Stat 3 */}
                    <div className={styles.statCard}>
                        {/* No Icon for the third one per mockup or generic? Assuming generic white layout or simply text */}
                        <div className={styles.statLabel}>Nb utilisateur</div>
                        <div className={styles.statValue}>Utilisateurs au total sont Inscrit : {totalUsers}</div>
                    </div>

                </div>

                {/* Controls */}
                <div className={styles.controlsRow}>
                    <div className={styles.searchWrapper}>
                        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Rechercher une personne" className={styles.searchInput} />
                    </div>
                </div>

                {/* User List */}
                <div className={styles.listContainer}>
                    
                    {/* Headers */}
                    <div className={styles.listHeader}>
                        <div className={styles.headerCol}>identité <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></div>
                        <div className={styles.headerCol} style={{flex:0.5}}>Rôle</div>
                        <div className={styles.headerCol}>numéro <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></div>
                        <div className={styles.headerCol}>Action</div>
                    </div>

                    {/* Rows */}
                    {users.map(u => (
                        <div key={u._id} className={styles.userCard}>
                            <div className={styles.userInfo}>
                                    <div style={{position:'relative'}}>
                                        <img 
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${u._id}`} 
                                            alt="u" 
                                            className={styles.listAvatar}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            right: 0,
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            border: '2px solid white',
                                             backgroundColor: u.disturb_status === 'dnd' ? '#EF4444' : 
                                            (u.disturb_status === 'away' ? '#F97316' : '#22C55E')
                                        }} title={u.disturb_status}></div>
                                    </div>
                                    <div className={styles.userTexts}>
                                        <span className={styles.listName}>{u.firstname}</span>
                                        <span className={styles.listEmail}>{u.email}</span>
                                    </div>
                            </div>
                            <div style={{flex:0.5}}>
                                <span style={{
                                    padding:'2px 8px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'700', textTransform:'uppercase',
                                    background: u.role === 'admin' ? '#DCFCE7' : (u.role === 'enseignant' ? '#F3E8FF' : '#DBEAFE'),
                                    color: u.role === 'admin' ? '#166534' : (u.role === 'enseignant' ? '#7E22CE' : '#1E40AF')
                                }}>{u.role || 'Etudiant'}</span>
                            </div>
                            <div className={styles.listPhone}>
                                {u.phone || '-'}
                            </div>
                            <div className={styles.actions}>
                                <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); handleEditClick(u); }} title="Modifier">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                                <button className={styles.iconBtn} onClick={(e) => { e.stopPropagation(); handleDeleteClick(u); }} title="Supprimer" style={{color:'#EF4444'}}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                    {users.length === 0 && <div style={{textAlign:'center', padding:'20px'}}>Chargement...</div>}

                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <div className={styles.totalCount}>Total : {totalUsers} utilisateurs</div>
                    <button className={styles.nextBtn}>Page Suivante</button>
                </div>

            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div style={{
                    position:'fixed', top:0, left:0, width:'100%', height:'100%',
                    background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
                }}>
                    <div style={{background:'white', padding:'24px', borderRadius:'16px', width:'400px'}}>
                        <h2 style={{marginTop:0, marginBottom:'16px'}}>Modifier Utilisateur</h2>
                        <div style={{marginBottom:'16px'}}>
                            <label style={{display:'block', marginBottom:'8px', fontWeight:'600'}}>Rôle</label>
                            <select 
                                value={editRole} 
                                onChange={(e) => setEditRole(e.target.value)}
                                style={{
                                    width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #E2E8F0', outline:'none'
                                }}
                            >
                                <option value="etudiant">Étudiant</option>
                                <option value="enseignant">Enseignant</option>
                                <option value="admin">Administrateur</option>
                            </select>
                        </div>
                        <div style={{display:'flex', justifyContent:'flex-end', gap:'12px'}}>
                            <button onClick={() => setIsEditModalOpen(false)} style={{
                                padding:'8px 16px', borderRadius:'8px', border:'1px solid #E2E8F0', background:'white', cursor:'pointer'
                            }}>Annuler</button>
                            <button onClick={handleSaveEdit} style={{
                                padding:'8px 16px', borderRadius:'8px', border:'none', background:'#0F172A', color:'white', cursor:'pointer'
                            }}>Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
