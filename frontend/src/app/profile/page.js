"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './profile.module.css';
import { useSocket } from '../context/SocketContext';

// --- SVG ICONS ---
const EditIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);

const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

const LogoutIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

const SettingsIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstname: '',
        phone: '',
        desc: ''
    });
    const [status, setStatus] = useState('');
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Use Socket
    const { controleur, isReady } = useSocket();

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/');
            return;
        }
        try {
            const userData = JSON.parse(userStr);
            setUser(userData);
            setFormData({
                firstname: userData.firstname || '',
                phone: userData.phone || '',
                desc: userData.desc || ''
            });
        } catch (e) {
            console.error(e);
            router.push('/');
        }
    }, [router]);

    useEffect(() => {
        if (!user || !controleur || !isReady) return;

        const profileComp = {
            nomDInstance: "ProfileComponent",
            traitementMessage: (msg) => {
                if (msg['user_updating status']) {
                    const response = msg['user_updating status'];
                    if (response.success) {
                        const updatedUser = response.user;
                        setUser(updatedUser);
                        setFormData({
                            firstname: updatedUser.firstname || '',
                            phone: updatedUser.phone || '',
                            desc: updatedUser.desc || ''
                        });
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                        setIsEditing(false);
                        setStatus("Profil mis à jour !");
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

        const sent = ['update user', 'delete_user'];
        const received = ['user_updating status', 'user_deleting_status'];

        controleur.inscription(profileComp, sent, received);

        return () => {
            controleur.desincription(profileComp, sent, received);
        };
    }, [user, controleur, isReady, router]);

    const handleSave = () => {
        if (!user || !formData.firstname.trim()) return;
        controleur.envoie({ nomDInstance: "ProfileComponent" }, {
            'update user': { 
                _id: user._id, 
                firstname: formData.firstname,
                phone: formData.phone,
                desc: formData.desc
            }
        });
        setStatus("Sauvegarde...");
    };

    const confirmDelete = () => {
        controleur.envoie({ nomDInstance: "ProfileComponent" }, {
            delete_user: { _id: user._id }
        });
    };

    const changeStatus = (newStatus) => {
        setShowMenu(false);
        controleur.envoie({ nomDInstance: "ProfileComponent" }, {
            'update user': { _id: user._id, disturb_status: newStatus }
        });
    };

    if (!user) return null;

    return (
        <div className={styles.container}>
            {showDeleteModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.warningIcon}>⚠️</div>
                        <h2>Supprimer le profil ?</h2>
                        <p>Cette action est irréversible. Toutes vos données seront définitivement effacées.</p>
                        <div className={styles.modalActions}>
                            <button className={styles.secondaryBtn} onClick={() => setShowDeleteModal(false)}>Annuler</button>
                            <button className={styles.dangerBtn} onClick={() => controleur.envoie({ nomDInstance: "ProfileComponent" }, { 'delete_user': { _id: user._id } })}>Confirmer la suppression</button>
                        </div>
                    </div>
                </div>
            )}

            {!user ? (
                <div className={styles.loading}>Chargement...</div>
            ) : (
                <div className={styles.profileWrapper}>
                    <div className={styles.profileContent}>
                        <div className={styles.cardHeader}>
                             <div className={styles.avatarRow}>
                                 <div className={styles.avatarContainer}>
                                     <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`} alt="Avatar" className={styles.avatar} />
                                     <div className={styles.statusPulse} style={{ 
                                         backgroundColor: user.disturb_status === 'dnd' ? '#EF4444' : (user.disturb_status === 'away' ? '#F97316' : '#22C55E'),
                                         color: user.disturb_status === 'dnd' ? '#EF4444' : (user.disturb_status === 'away' ? '#F97316' : '#22C55E')
                                     }}></div>
                                 </div>

                                 <div className={styles.userCoreInfo}>
                                     <h1 className={styles.userName}>{user.firstname}</h1>
                                     <div className={styles.userEmail}>{user.email}</div>
                                     <div className={styles.userMetaRow}>
                                        <span className={`${styles.roleBadge} ${styles[user.role] || ''}`}>{user.role === 'admin' ? 'Administrateur' : (user.role === 'enseignant' ? 'Enseignant' : 'Étudiant')}</span>
                                        <span className={styles.memberSince}>Membre depuis le {new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
                                     </div>
                                     {status && <div className={styles.toastStatus}>{status}</div>}
                                 </div>

                                 <div className={styles.headerActions}>
                                     <button className={styles.glassCircleBtn} onClick={() => setShowMenu(!showMenu)}>
                                         <SettingsIcon />
                                     </button>
                                     {showMenu && (
                                         <div className={styles.glassDropdown}>
                                             <div className={styles.dropdownTitle}>Réglages</div>
                                             <button className={styles.dropdownBtn} onClick={() => changeStatus('available')}>
                                                 <span className={styles.statusDot} style={{background:'#22C55E'}}></span> Disponible
                                             </button>
                                             <button className={styles.dropdownBtn} onClick={() => changeStatus('away')}>
                                                 <span className={styles.statusDot} style={{background:'#F97316'}}></span> Absent
                                             </button>
                                             <button className={styles.dropdownBtn} onClick={() => changeStatus('dnd')}>
                                                 <span className={styles.statusDot} style={{background:'#EF4444'}}></span> Occupé
                                             </button>
                                             <div className={styles.divider}></div>
                                             <button className={styles.dropdownBtn} onClick={() => { localStorage.removeItem('user'); router.push('/login'); }}>
                                                 <LogoutIcon /> Se déconnecter
                                             </button>
                                             <button className={`${styles.dropdownBtn} ${styles.red}`} onClick={() => { setShowMenu(false); setShowDeleteModal(true); }}>
                                                 <TrashIcon /> Supprimer le profil
                                             </button>
                                         </div>
                                     )}
                                 </div>
                             </div>
                        </div>

                        <div className={styles.profileBody}>
                            <div className={styles.mainGrid}>
                                {/* Edit/View Section */}
                                <div className={`${styles.glassCard} ${styles.editSection}`}>
                                    <div className={styles.cardTitleRow}>
                                        <h2>Informations personnelles</h2>
                                        <button className={styles.editToggleBtn} onClick={() => setIsEditing(!isEditing)}>
                                            {isEditing ? "Annuler" : "Modifier"}
                                        </button>
                                    </div>

                                    <div className={styles.fieldsContainer}>
                                        <div className={styles.fieldGroup}>
                                            <label>Prénom</label>
                                            {isEditing ? (
                                                <input 
                                                    type="text" 
                                                    value={formData.firstname} 
                                                    onChange={(e) => setFormData({...formData, firstname: e.target.value})}
                                                    placeholder="Votre prénom"
                                                />
                                            ) : (
                                                <div className={styles.staticValue}>{user.firstname}</div>
                                            )}
                                        </div>

                                        <div className={styles.fieldGroup}>
                                            <label>Téléphone</label>
                                            {isEditing ? (
                                                <input 
                                                    type="text" 
                                                    value={formData.phone} 
                                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                                    placeholder="+33 6 00 00 00 00"
                                                />
                                            ) : (
                                                <div className={styles.staticValue}>{user.phone || 'Non renseigné'}</div>
                                            )}
                                        </div>

                                        <div className={styles.fieldGroup}>
                                            <label>Biographie</label>
                                            {isEditing ? (
                                                <textarea 
                                                    value={formData.desc} 
                                                    onChange={(e) => setFormData({...formData, desc: e.target.value})}
                                                    placeholder="Dites-nous en plus sur vous..."
                                                />
                                            ) : (
                                                <div className={styles.staticValue}>{user.desc || 'Aucun descriptif pour le moment.'}</div>
                                            )}
                                        </div>

                                        {isEditing && (
                                            <button className={styles.premiumSaveBtn} onClick={handleSave}>
                                                <CheckIcon /> Enregistrer les modifications
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
