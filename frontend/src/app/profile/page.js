"use client";
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';
import Controleur from '@/controllers/controleur';
import CanalSocketio from '@/controllers/canalsocketio';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newFirstname, setNewFirstname] = useState('');
    const [status, setStatus] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [disturbStatus, setDisturbStatus] = useState('available');

    const controleurRef = useRef(null);
    const profileCompRef = useRef(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/');
            return;
        }
        try {
            const userData = JSON.parse(userStr);
            setUser(userData);
            setNewFirstname(userData.firstname);
            setDisturbStatus(userData.disturb_status || 'available');
        } catch (e) {
            console.error(e);
            router.push('/');
        }

        const ctrl = new Controleur();
        const canal = new CanalSocketio(ctrl, "SocketCanalProfile");
        controleurRef.current = ctrl;

        const profileComp = {
            nomDInstance: "ProfileComponent",
            traitementMessage: (msg) => {
                if (msg['user_updating status']) {
                     const response = msg['user_updating status'];
                     if (response.success) {
                         const updatedUser = response.user;
                         setUser(updatedUser);
                         localStorage.setItem('user', JSON.stringify(updatedUser));
                         setIsEditing(false);
                         setStatus("Mise à jour réussie !");
                         setTimeout(() => setStatus(''), 3000);
                     } else {
                         setStatus("Erreur: " + response.error);
                     }
                }
                if (msg.user_deleting_status) {
                    if (msg.user_deleting_status.success) {
                        localStorage.removeItem('user');
                        router.push('/login');
                    } else {
                        setStatus("Erreur suppression: " + msg.user_deleting_status.error);
                        setShowDeleteModal(false);
                    }
                }
            }
        };
        profileCompRef.current = profileComp;
        ctrl.inscription(profileComp, ['update user', 'delete_user'], ['user_updating status', 'user_deleting_status']);

        return () => {
             if (canal.socket) canal.socket.disconnect();
        };
    }, [router]);

    const handleSave = () => {
        if (!user || !newFirstname.trim()) return;
        if (controleurRef.current && profileCompRef.current) {
            controleurRef.current.envoie(profileCompRef.current, {
                'update user': { _id: user._id, firstname: newFirstname }
            });
            setStatus("Sauvegarde...");
        }
    };

    const confirmDelete = () => {
        if (controleurRef.current && profileCompRef.current) {
            controleurRef.current.envoie(profileCompRef.current, {
                delete_user: { _id: user._id }
            });
        }
    };

    const changeStatus = (newStatus) => {
        setDisturbStatus(newStatus);
        setShowMenu(false);
        if (controleurRef.current && profileCompRef.current) {
            controleurRef.current.envoie(profileCompRef.current, {
                'update user': { _id: user._id, disturb_status: newStatus }
            });
        }
    };

    if (!user) return null;

    return (
        <div className={styles.container}>
            {showDeleteModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div style={{fontSize: '48px', marginBottom: '16px'}}>⚠️</div>
                        <h2 style={{color: '#1E3664', fontWeight: 800, marginBottom: '12px'}}>Supprimer le compte</h2>
                        <p style={{color: '#64748B', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px'}}>
                            Cette action est irréversible. Toutes vos données seront définitivement perdues.
                        </p>
                        <div style={{display:'flex', gap:'12px'}}>
                            <button className={styles.cancelBtn} style={{flex:1}} onClick={() => setShowDeleteModal(false)}>Fermer</button>
                            <button className={styles.saveBtn} style={{flex:1, background: '#EF4444'}} onClick={confirmDelete}>Supprimer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.card}>
                <div className={styles.banner} style={{ backgroundImage: `url(https://api.dicebear.com/9.x/shapes/svg?seed=${user._id})` }}></div>
                <div className={styles.content}>
                    <div className={styles.headerRow}>
                        <div className={styles.avatarContainer}>
                            <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`} alt="Avatar" className={styles.avatar} />
                            <div className={styles.onlineIndicator} style={{
                                backgroundColor: user.disturb_status === 'dnd' ? '#EF4444' : (user.disturb_status === 'away' ? '#F97316' : '#22C55E')
                            }}></div>
                            <button className={styles.editIconBtn} onClick={() => setIsEditing(!isEditing)}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                        </div>

                        <div style={{position:'relative'}}>
                            <button className={styles.moreBtn} onClick={() => setShowMenu(!showMenu)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>
                            </button>
                            {showMenu && (
                                <div className={styles.dropdownMenu}>
                                    <div style={{fontSize: '11px', fontWeight: 800, color: '#94A3B8', padding: '8px 12px', textTransform: 'uppercase'}}>Mon Statut</div>
                                    <button className={styles.dropdownItem} onClick={() => changeStatus('available')}>
                                        <span style={{width:8, height:8, borderRadius:'50%', background:'#22C55E'}}></span> Disponible
                                    </button>
                                    <button className={styles.dropdownItem} onClick={() => changeStatus('dnd')}>
                                        <span style={{width:8, height:8, borderRadius:'50%', background:'#EF4444'}}></span> Occupé
                                    </button>
                                    <button className={styles.dropdownItem} onClick={() => changeStatus('away')}>
                                        <span style={{width:8, height:8, borderRadius:'50%', background:'#F97316'}}></span> Absent
                                    </button>
                                    <div style={{height: 1, background: '#F1F5F9', margin: '4px 0'}}></div>
                                    <button className={styles.dropdownItem} onClick={() => { localStorage.removeItem('user'); router.push('/login'); }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                        Se déconnecter
                                    </button>
                                    <button className={`${styles.dropdownItem} ${styles.danger}`} onClick={() => { setShowMenu(false); setShowDeleteModal(true); }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        Supprimer le profil
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.mainInfo}>
                        {isEditing ? (
                            <div>
                                <input type="text" className={styles.editInput} value={newFirstname} onChange={(e) => setNewFirstname(e.target.value)} autoFocus />
                                <div style={{display:'flex'}}>
                                    <button onClick={handleSave} className={styles.saveBtn}>Confirmer</button>
                                    <button onClick={() => { setIsEditing(false); setNewFirstname(user.firstname); }} className={styles.cancelBtn}>Annuler</button>
                                </div>
                            </div>
                        ) : (
                            <h1 className={styles.nameValue}>{user.firstname}</h1>
                        )}
                        <p className={styles.emailValue}>{user.email}</p>
                        {status && <p style={{color: '#0698D6', fontSize: '12px', fontWeight: 700, marginTop: '8px'}}>{status}</p>}
                    </div>

                    <div className={styles.detailsGrid}>
                         <div className={styles.detailItem}>
                             <span className={styles.label}>Niveau d'accès</span>
                             <div className={`${styles.badge} ${styles[user.role?.toLowerCase() || 'etudiant']}`}>
                                 {user.role || 'Étudiant'}
                             </div>
                         </div>
                         <div className={styles.detailItem}>
                             <span className={styles.label}>Coordonnées</span>
                             <span className={styles.value}>{user.phone || 'Non renseigné'}</span>
                         </div>
                    </div>

                    <div className={styles.footerActions}>
                        <Link href="/home" className={styles.backBtn}>← Retour à l'accueil</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
