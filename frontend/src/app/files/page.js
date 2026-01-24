"use client";
import React, { useEffect, useState, useRef } from 'react';
import styles from './files.module.css';
import { useSocket } from '../context/SocketContext';

export default function FilesPage() {
    const [files, setFiles] = useState([]);
    const [spaces, setSpaces] = useState([]);
    const [currentSpace, setCurrentSpace] = useState(null); // null = "Tous" (Root)
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // States
    const [isDropZoneActive, setIsDropZoneActive] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    
    const [uploadingFile, setUploadingFile] = useState(null);
    const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);
    const [newSpaceName, setNewSpaceName] = useState('');

    const { controleur, isReady } = useSocket();
    const filesCompRef = useRef(null);

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) {
            setCurrentUser(JSON.parse(u));
        }
    }, []);

    useEffect(() => {
        if (!controleur || !isReady || !currentUser) return;

        const filesComp = {
            nomDInstance: "FilesComponent",
            traitementMessage: (msg) => {
                // Support both versions of auth status for safety during transition
                const authMsg = msg['auth_status'] || msg['auth status'];
                if (authMsg && authMsg.success) {
                    const updatedUser = authMsg.user;
                    setCurrentUser(updatedUser);
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
                
                if (msg.files) {
                    setFiles(msg.files.files || []);
                    setLoading(false);
                }

                if (msg.spaces) {
                    setSpaces(msg.spaces.spaces || []);
                }
                
                if (msg.file_uploading_status) {
                    if (msg.file_uploading_status.success) {
                        setFiles(prev => [msg.file_uploading_status.file, ...prev]);
                        handleCloseUploadModal();
                    } else {
                        alert("Erreur upload: " + msg.file_uploading_status.error);
                        setLoading(false);
                    }
                }

                // Standardized name: file_deleting_status
                const delMsg = msg['file_deleting_status'] || msg['file deleting status'];
                if (delMsg) {
                    if (delMsg.success) {
                        setFiles(prev => prev.filter(f => f._id !== delMsg.fileId));
                    }
                    setLoading(false);
                }

                if (msg.space_creating_status) {
                    if (msg.space_creating_status.success) {
                        setSpaces(prev => [...prev, msg.space_creating_status.space]);
                        setIsSpaceModalOpen(false);
                        setNewSpaceName('');
                    } else {
                        alert("Erreur espace: " + msg.space_creating_status.error);
                    }
                    setLoading(false);
                }

                if (msg.space_deleting_status) {
                    if (msg.space_deleting_status.success) {
                        setSpaces(prev => prev.filter(s => s._id !== msg.space_deleting_status.spaceId));
                        setCurrentSpace(prev => (prev?._id === msg.space_deleting_status.spaceId ? null : prev));
                    } else {
                        alert("Erreur suppression espace: " + msg.space_deleting_status.error);
                    }
                    setLoading(false);
                }
            }
        };
        filesCompRef.current = filesComp;
        
        // Listen to BOTH space and underscore versions to be safe
        controleur.inscription(filesComp, 
            ['get_files', 'upload_file', 'delete_file', 'get_spaces', 'create_space', 'delete_space'], 
            ['files', 'file_uploading_status', 'fileDeletingStatus', 'file_deleting_status', 'file deleting status', 'auth status', 'auth_status', 'spaces', 'space_creating_status', 'space_deleting_status']
        );

        controleur.envoie(filesComp, { get_spaces: {} });
        fetchFiles(currentSpace?._id || null);

        return () => {
             controleur.desincription(filesComp, 
                ['get_files', 'upload_file', 'delete_file', 'get_spaces', 'create_space', 'delete_space'], 
                ['files', 'file_uploading_status', 'fileDeletingStatus', 'file_deleting_status', 'file deleting status', 'auth status', 'auth_status', 'spaces', 'space_creating_status', 'space_deleting_status']
            );
        };
    }, [controleur, isReady, !!currentUser]);

    useEffect(() => {
        if (isReady && currentUser) {
            fetchFiles(currentSpace?._id || null);
        }
    }, [currentSpace?._id]);

    const fetchFiles = (spaceId) => {
        if (controleur && filesCompRef.current) {
            setLoading(true);
            controleur.envoie(filesCompRef.current, {
                get_files: { 
                    userId: currentUser?._id,
                    spaceId: spaceId 
                }
            });
        }
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        setUploadingFile(file);
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setUploadPreviewUrl(url);
        } else {
            setUploadPreviewUrl(null);
        }
    };

    // Force reset when modal opens
    useEffect(() => {
        if (isUploadModalOpen) {
            setUploadingFile(null);
            setUploadPreviewUrl(null);
            if (document.getElementById('fIn')) document.getElementById('fIn').value = '';
        }
    }, [isUploadModalOpen]);

    const handleCloseUploadModal = () => {
        setIsUploadModalOpen(false);
        setUploadingFile(null);
        if (uploadPreviewUrl) {
            URL.revokeObjectURL(uploadPreviewUrl);
            setUploadPreviewUrl(null);
        }
        setLoading(false);
    };

    const generateThumbnail = (file, maxWidth = 1000, maxHeight = 1000) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } }
                    else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = () => resolve("#");
                img.src = e.target.result;
            };
            reader.onerror = () => resolve("#");
            reader.readAsDataURL(file);
        });
    };

    const handleUploadSubmit = async () => {
        if (!uploadingFile || !currentUser) return;
        setLoading(true);
        let fileUrl = "#";
        if (uploadingFile.type.startsWith('image/')) {
            fileUrl = await generateThumbnail(uploadingFile);
        }
        controleur.envoie(filesCompRef.current, {
            upload_file: {
                name: uploadingFile.name,
                size: uploadingFile.size,
                type: uploadingFile.type,
                url: fileUrl,
                userId: currentUser._id,
                spaceId: currentSpace?._id || null
            }
        });
    };

    const handleDownload = (file) => {
        if (!file.url || file.url === "#") {
            // For general files that don't have binary content yet, we just show an alert
            alert("Contenu binaire non disponible pour ce fichier exemple.");
            return;
        }
        try {
            const link = document.createElement('a');
            link.href = file.url;
            link.setAttribute('download', file.name);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Download error:", e);
            alert("Erreur lors du téléchargement.");
        }
    };

    const handleCreateSpace = () => {
        if (!newSpaceName.trim() || !currentUser) return;
        setLoading(true);
        controleur.envoie(filesCompRef.current, { create_space: { name: newSpaceName, userId: currentUser._id } });
    };

    const handleDeleteSpace = (e, spaceId) => {
        e.stopPropagation();
        if (confirm("Supprimer cet espace ? Les fichiers seront conservés à la racine.")) {
            setLoading(true);
            controleur.envoie(filesCompRef.current, { delete_space: { spaceId: spaceId, userId: currentUser._id } });
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
    };

    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const canManage = currentUser && (currentUser.role === 'admin' || currentUser.role === 'enseignant');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Dossiers Partagés</h1>
                <div style={{display:'flex', gap:'1rem'}}>
                    {canManage && (
                        <>
                            <button className={styles.createSpaceBtn} onClick={() => setIsSpaceModalOpen(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                                Nouvel Espace
                            </button>
                            <button className={styles.uploadBtn} onClick={() => setIsUploadModalOpen(true)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                Ajouter un fichier
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.controls}>
                <div className={styles.searchWrapper}>
                    <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" placeholder="Rechercher un document..." className={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className={styles.spacesTabs}>
                <button className={`${styles.tab} ${!currentSpace ? styles.active : ''}`} onClick={() => setCurrentSpace(null)}> 🏡 Tous les fichiers </button>
                {spaces.map(s => (
                    <button key={s._id} className={`${styles.tab} ${currentSpace?._id === s._id ? styles.active : ''}`} onClick={() => setCurrentSpace(s)}>
                        📁 {s.name}
                        {canManage && (
                            <div className={styles.deleteSpaceBtn} onClick={(e) => handleDeleteSpace(e, s._id)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className={styles.loading}>
                    <div style={{textAlign:'center'}}>
                        <div className={styles.spinner}></div>
                        <div style={{marginTop:'1rem'}}>Mise à jour du Drive...</div>
                    </div>
                </div>
            ) : (
                <div className={styles.grid}>
                    {filteredFiles.map(file => (
                        <div key={file._id} className={styles.card}>
                            <div className={styles.iconWrapper}>
                                {file.type.startsWith('image/') ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                )}
                            </div>
                            <div className={styles.fileInfo}>
                                <h3 className={styles.name}>{file.name}</h3>
                                <div className={styles.meta}>
                                    <span>{formatSize(file.size)}</span>
                                    <span>•</span>
                                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div style={{fontSize:'10px', color:'#94A3B8', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                                    Par {file.owner?.firstname || "Utilisateur"}
                                    {file.owner?.role && file.owner.role !== 'etudiant' && (
                                        <span style={{
                                            fontSize:'8px', 
                                            padding:'2px 6px', 
                                            borderRadius:'10px', 
                                            background: file.owner.role === 'admin' ? '#DCFCE7' : '#F3E8FF',
                                            color: file.owner.role === 'admin' ? '#166534' : '#7E22CE',
                                            fontWeight: 700,
                                            textTransform: 'uppercase'
                                        }}>
                                            {file.owner.role}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className={styles.actions}>
                                <button className={`${styles.actionBtn} ${styles.viewBtn}`} title="Visualiser" onClick={() => setPreviewFile(file)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </button>
                                <button className={styles.actionBtn} title="Télécharger" onClick={() => handleDownload(file)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                </button>
                                {canManage && (
                                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => { if(confirm("Supprimer ce fichier ?")) { setLoading(true); controleur.envoie(filesCompRef.current, { delete_file: { fileId: file._id, userId: currentUser._id } }); } }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {filteredFiles.length === 0 && <div className={styles.emptyState}>Aucun document trouvé.</div>}
                </div>
            )}

            {isUploadModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Ajouter dans {currentSpace ? `"${currentSpace.name}"` : "le Drive"}</h2>
                        {uploadingFile ? (
                            <div style={{position:'relative', marginBottom:'1.5rem'}}>
                                {uploadPreviewUrl ? (
                                    <img src={uploadPreviewUrl} alt="Preview" style={{width:'100%', borderRadius:'12px', maxHeight:'200px', objectFit:'cover', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                                ) : (
                                    <div style={{width:'100%', height:'150px', background:'#f1f5f9', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b', flexDirection:'column'}}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        <span style={{marginTop:'0.5rem', fontWeight:600}}>Fichier prêt</span>
                                    </div>
                                )}
                                <button onClick={() => { setUploadingFile(null); setUploadPreviewUrl(null); if(document.getElementById('fIn')) document.getElementById('fIn').value = ''; }} style={{position:'absolute', top:'10px', right:'10px', background:'white', color:'#ef4444', border:'none', borderRadius:'50%', width:'30px', height:'30px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', boxShadow:'0 2px 4px rgba(0,0,0,0.2)'}}>✕</button>
                                <div style={{marginTop:'0.75rem', fontSize:'0.9rem', color:'#1e293b', fontWeight:600}}>{uploadingFile.name}</div>
                            </div>
                        ) : (
                            <div className={`${styles.fileDropArea} ${isDropZoneActive ? styles.fileDropAreaActive : ''}`} onClick={() => document.getElementById('fIn').click()}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDropZoneActive(true); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDropZoneActive(false); }}
                                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDropZoneActive(false); if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]); }}
                            >
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{marginBottom: '1rem'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                <p style={{margin: 0, fontWeight: 600, color:'#1e3664'}}>Déposer le fichier ici pour commencer</p>
                                <input type="file" id="fIn" hidden onChange={(e) => handleFileSelect(e.target.files[0])} />
                            </div>
                        )}
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={handleCloseUploadModal}>Annuler</button>
                            <button className={styles.submitBtn} disabled={!uploadingFile} onClick={handleUploadSubmit}>Confirmer l'envoi</button>
                        </div>
                    </div>
                </div>
            )}

            {isSpaceModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Créer un dossier</h2>
                        <input type="text" className={styles.modalInput} placeholder="Nom du dossier..." value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} autoFocus />
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setIsSpaceModalOpen(false)}>Annuler</button>
                            <button className={styles.submitBtn} disabled={!newSpaceName.trim()} onClick={handleCreateSpace}>Créer</button>
                        </div>
                    </div>
                </div>
            )}

            {previewFile && (
                <div className={styles.modalOverlay} onClick={() => setPreviewFile(null)}>
                    <div className={`${styles.modal} ${styles.previewContent}`} onClick={e => e.stopPropagation()}>
                        <div className={styles.previewHeader}>
                            <div style={{overflow:'hidden'}}><h2 className={styles.modalTitle} style={{margin:0, fontSize:'1.4rem'}}>{previewFile.name}</h2></div>
                            <button className={styles.cancelBtn} onClick={() => setPreviewFile(null)}>Fermer</button>
                        </div>
                        <div className={styles.previewBody}>
                            {previewFile.type.startsWith('image/') ? (
                                <div style={{textAlign:'center', width:'100%'}}>
                                    <img src={previewFile.url && previewFile.url !== "#" ? previewFile.url : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5'%3E%3Cpath d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/%3E%3C/svg%3E"} alt="Preview" className={styles.previewImage} />
                                </div>
                            ) : (
                                <div className={styles.previewPlaceholder}><p>Visualisation non disponible.</p></div>
                            )}
                        </div>
                        <div className={styles.modalActions} style={{marginTop:'1.5rem'}}>
                            <button className={styles.previewActionBtn} onClick={() => handleDownload(previewFile)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Télécharger
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
