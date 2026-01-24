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
    
    // For Status Change Mockup
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

        // Socket init
        const ctrl = new Controleur();
        const canal = new CanalSocketio(ctrl, "SocketCanalProfile");
        controleurRef.current = ctrl;

        const profileComp = {
            nomDInstance: "ProfileComponent",
            traitementMessage: (msg) => {
                // Update Response
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
                // Delete Response
                if (msg.user_deleting_status) {
                    const response = msg.user_deleting_status;
                    if (response.success) {
                        localStorage.removeItem('user');
                        // Redirect to Login as account is considered "gone" for this session
                        router.push('/login');
                    } else {
                        setStatus("Erreur suppression: " + response.error);
                        setShowDeleteModal(false); // Close modal on error
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
                'update user': {
                    _id: user._id,
                    firstname: newFirstname
                }
            });
            setStatus("Envoi en cours...");
        }
    };

    const confirmDelete = () => {
        if (controleurRef.current && profileCompRef.current) {
            controleurRef.current.envoie(profileCompRef.current, {
                delete_user: {
                    _id: user._id
                }
            });
        }
    };

    const changeStatus = (newStatus) => {
        // Optimistic Update
        setDisturbStatus(newStatus);
        setShowMenu(false); // Close menu after selection

        if (controleurRef.current && profileCompRef.current) {
            controleurRef.current.envoie(profileCompRef.current, {
                'update user': {
                    _id: user._id,
                    disturb_status: newStatus
                }
            });
        }
    };

    if (!user) return null;

    return (
        <div className={styles.container}>
            
            {/* DELETE MODAL */}
            {showDeleteModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h2 className={styles.modalTitle}>
                            Supprimer le compte
                        </h2>
                        <p className={styles.modalText}>
                            Êtes-vous sûr de vouloir supprimer définitivement votre compte ? 
                            Cette action est irréversible et toutes vos données seront perdues.
                        </p>
                        <div className={styles.modalActions}>
                            <button 
                                className={styles.modalBtnSecondary} 
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Annuler
                            </button>
                            <button 
                                className={styles.modalBtnDanger} 
                                onClick={confirmDelete}
                            >
                                Supprimer l’utilisateur
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <div className={styles.card}>
                
                {/* Banner Image (Abstract Style) */}
                <div 
                    className={styles.banner}
                    style={{
                        backgroundImage: `url(https://api.dicebear.com/9.x/shapes/svg?seed=${user._id})`
                    }}
                ></div>

                <div className={styles.content}>
                    
                    {/* Header Row: Avatar & Actions */}
                    <div className={styles.headerRow}>
                        <div className={styles.avatarContainer}>
                            {/* Abstract Avatar */}
                            <img 
                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`} 
                                alt="Avatar" 
                                className={styles.avatar} 
                                style={{objectFit: 'cover', padding: 0, overflow: 'hidden'}}
                            />    
                            {/* Online Indicator (If user is here, they are online) */}
                            <div className={styles.onlineIndicator} title="En ligne"></div>
                            
                            {/* Edit Button on Avatar */}
                            <button 
                                className={styles.editIconBtn} 
                                onClick={() => setIsEditing(!isEditing)}
                                title="Modifier le nom"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                </svg>
                            </button>
                        </div>

                        <div className={styles.topActions}>
                            {/* Three dots 'More' action */}
                            <button 
                                className={styles.moreBtn}
                                onClick={() => setShowMenu(!showMenu)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="12" cy="5" r="1"></circle>
                                    <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <div className={styles.dropdownMenu} onMouseLeave={() => setShowMenu(false)}>
                                    <div className={styles.dropdownHeader}>Définir le statut</div>
                                    
                                    <button className={styles.dropdownItem} onClick={() => changeStatus('available')}>
                                        <span style={{width:10, height:10, borderRadius:'50%', background:'#22C55E'}}></span>
                                        Disponible
                                    </button>
                                    <button className={styles.dropdownItem} onClick={() => changeStatus('dnd')}>
                                        <span style={{width:10, height:10, borderRadius:'50%', background:'#EF4444'}}></span>
                                        Occupé
                                    </button>
                                    <button className={styles.dropdownItem} onClick={() => changeStatus('away')}>
                                        <span style={{width:10, height:10, borderRadius:'50%', background:'#F97316'}}></span>
                                        Absent
                                    </button>

                                    <div className={styles.separator}></div>

                                    <button 
                                        className={styles.dropdownItem} 
                                        onClick={() => {
                                            localStorage.removeItem('user');
                                            router.push('/login');
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                            <polyline points="16 17 21 12 16 7"></polyline>
                                            <line x1="21" y1="12" x2="9" y2="12"></line>
                                        </svg>
                                        Se déconnecter
                                    </button>
                                    <button 
                                        className={`${styles.dropdownItem} ${styles.danger}`} 
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowDeleteModal(true);
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                        </svg>
                                        Supprimer le profil
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Info */}
                    <div className={styles.mainInfo}>
                        <div className={styles.nameSection}>
                            {isEditing ? (
                                <div>
                                    <input 
                                        type="text" 
                                        className={styles.editInput}
                                        value={newFirstname}
                                        onChange={(e) => setNewFirstname(e.target.value)}
                                    />
                                    <div style={{display:'flex'}}>
                                        <button onClick={handleSave} className={styles.saveBtn}>Enregistrer</button>
                                        <button onClick={() => {
                                            setIsEditing(false);
                                            setNewFirstname(user.firstname);
                                        }} className={styles.cancelBtn}>Annuler</button>
                                    </div>
                                </div>
                            ) : (
                                <h1 className={styles.nameValue}>
                                    {user.firstname}
                                </h1>
                            )}
                        </div>
                        <p className={styles.emailValue}>{user.email}</p>
                        {status && <p style={{color: status.includes('Erreur') ? 'red' : 'green', fontSize: '0.9rem', marginTop: '5px'}}>{status}</p>}
                    </div>

                    {/* Details Grid */}
                    <div className={styles.detailsGrid}>
                         
                         {/* Role Badge */}
                         <div className={styles.detailItem}>
                             <div className={`${styles.badge} ${styles[user.role?.toLowerCase() || 'etudiant']}`}>
                                 {user.role || 'Admin'}
                             </div>
                         </div>

                         {/* Phone Number */}
                         <div className={styles.detailItem}>
                             <span className={styles.label}>Téléphone</span>
                             <span className={styles.value}>{user.phone || 'Non renseigné'}</span>
                         </div>

                    </div>

                    {/* Footer / Back */}
                    <div className={styles.footerActions}>
                        <Link href="/home" className={styles.backBtn}>
                            Retour à l'accueil
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}
