"use client";
import React, { useEffect, useState, useRef } from 'react';
import styles from './files.module.css';
import { useSocket } from '@/app/context/SocketContext';
import { usePreload } from '@/app/context/PreloadContext';
import { useParams, useRouter, usePathname } from 'next/navigation';

export default function FilesPage() {
    const [files, setFiles] = useState([]);
    const [spaces, setSpaces] = useState([]);
    const [rootSpaces, setRootSpaces] = useState([]); // Top-level folders for the bar
    const [currentSpace, setCurrentSpace] = useState(null); // null = "Tous" (Root)
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [activeTab, setActiveTab] = useState('global'); // 'personal', 'global', 'team'
    const [path, setPath] = useState([]); // Breadcrumbs: [{_id, name}]
    const [targetSilo, setTargetSilo] = useState('personal'); 
    const [isHydrated, setIsHydrated] = useState(false);
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { controleur, isReady } = useSocket();
    const filesCompRef = useRef(null);
    const lastTabChangeRef = useRef(0);

    // Modals & Upload States
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);
    const [newSpaceName, setNewSpaceName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [userSearch, setUserSearch] = useState('');

    const { users: allUsers } = usePreload();

    useEffect(() => {
        const u = localStorage.getItem('user');
        if (u) {
            const parsed = JSON.parse(u);
            setCurrentUser(parsed);
            
            // Re-sync targetSilo for students if tab is global
            const silo = params.slug?.[0];
            const effectiveTab = silo || 'global';
            if (effectiveTab === 'global' && !['admin', 'enseignant'].includes(parsed.role)) {
                setTargetSilo('personal');
            } else {
                setTargetSilo(effectiveTab);
            }
        }
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!controleur || !isReady || !currentUser) return;

        const filesComp = {
            nomDInstance: "FilesComponent",
            traitementMessage: (msg) => {
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
                    const data = msg.spaces;
                    // Always update rootSpaces for the top bar
                    if (data.parentId === null) {
                        setRootSpaces(data.spaces || []);
                    }
                    
                    // Only update the grid if it matches our current level
                    const requestedId = currentSpace?._id || null;
                    if (data.parentId === requestedId) {
                        setSpaces(data.spaces || []);
                    }
                }
                
                if (msg.file_uploading_status) {
                    if (msg.file_uploading_status.success) {
                        const newFile = msg.file_uploading_status.file;
                        // Only add if it belongs to current view (same category and same space/folder)
                        const isSameCategory = newFile.category === targetSilo;
                        
                        // Check space match (handle null/undefined for root)
                        const currentSpaceId = currentSpace?._id || null;
                        const fileSpaceId = newFile.space || null;
                        const isSameSpace = currentSpaceId === fileSpaceId;

                        // CRITICAL: For personal files, check owner!
                        let isAuthorized = true;
                        if (newFile.category === 'personal') {
                            const ownerId = newFile.owner?._id || newFile.owner; // Handle populated or raw ID
                            isAuthorized = ownerId === currentUser._id;
                        }

                        if (isSameCategory && isSameSpace && isAuthorized) {
                            setFiles(prev => [newFile, ...prev]);
                            handleCloseUploadModal();
                        }
                    } else {
                        alert("Erreur upload: " + msg.file_uploading_status.error);
                        setLoading(false);
                    }
                }

                const delMsg = msg['file_deleting_status'] || msg['file deleting status'];
                if (msg.file_deleting_status || msg.fileDeletingStatus) {
                    const status = msg.file_deleting_status || msg.fileDeletingStatus;
                    if (status.success) {
                        setFiles(prev => prev.filter(f => f._id !== status.fileId));
                    }
                    setLoading(false);
                }

                if (msg.space_creating_status) {
                    if (msg.space_creating_status.success) {
                        const newSpace = msg.space_creating_status.space;
                        // Filter by category
                        const isSameCategory = newSpace.category === targetSilo;
                        
                        // Filter by parent (currentSpace)
                        const currentSpaceId = currentSpace?._id || null;
                        const spaceParentId = newSpace.parent || null;
                        const isSameParent = currentSpaceId === spaceParentId;

                        // CRITICAL: For personal spaces, check owner!
                        let isAuthorized = true;
                        if (newSpace.category === 'personal') {
                            const ownerId = newSpace.owner?._id || newSpace.owner;
                            isAuthorized = ownerId === currentUser._id;
                        }

                        if (isSameCategory && isSameParent && isAuthorized) {
                            setSpaces(prev => [...prev, newSpace]);
                            setIsSpaceModalOpen(false);
                            setNewSpaceName('');
                        }
                    } else {
                        alert("Erreur espace: " + msg.space_creating_status.error);
                    }
                    setLoading(false);
                }

                if (msg.space_deleting_status) {
                    if (msg.space_deleting_status.success) {
                        setSpaces(prev => prev.filter(s => s._id !== msg.space_deleting_status.spaceId));
                        if (currentSpace?._id === msg.space_deleting_status.spaceId) {
                            handleBreadcrumbClick(null, -1);
                        }
                    } else {
                        alert("Erreur suppression espace: " + msg.space_deleting_status.error);
                    }
                    setLoading(false);
                }

                if (msg.space_renaming_status) {
                    if (msg.space_renaming_status.success) {
                        setSpaces(prev => prev.map(s => s._id === msg.space_renaming_status.spaceId ? { ...s, name: msg.space_renaming_status.newName } : s));
                    }
                    setLoading(false);
                }
                if (msg.file_updating_status) {
                    if (msg.file_updating_status.success) {
                        setFiles(prev => prev.map(f => f._id === msg.file_updating_status.fileId ? { ...f, name: msg.file_updating_status.newName } : f));
                    }
                    setLoading(false);
                }
                if (msg.resolved_path) {
                    if (msg.resolved_path.success) {
                        setPath(msg.resolved_path.path);
                        const finalSpace = msg.resolved_path.path[msg.resolved_path.path.length - 1];
                        setCurrentSpace(finalSpace);
                        
                        // Sync tab if it was resolved in a different category (e.g. via deep link)
                        if (msg.resolved_path.category && msg.resolved_path.category !== activeTab) {
                            setActiveTab(msg.resolved_path.category);
                            const isStaff = ['admin', 'enseignant'].includes(currentUser?.role);
                            const newTarget = msg.resolved_path.category === 'global' && !isStaff ? 'personal' : msg.resolved_path.category;
                            setTargetSilo(newTarget);
                        }
                        // If path resolution is done and it's root or no files expected immediately, stop loading
                        if (msg.resolved_path.path.length === 0) setLoading(false);
                    } else {
                        setCurrentSpace(null);
                        setPath([]);
                        fetchSpaces(null);
                    }
                }
            }
        };
        filesCompRef.current = filesComp;
        
        controleur.inscription(filesComp, 
            ['get_files', 'upload_file', 'delete_file', 'get_spaces', 'create_space', 'delete_space', 'rename_space', 'resolve_path'], 
            ['files', 'file_uploading_status', 'fileDeletingStatus', 'file_deleting_status', 'file deleting status', 'auth status', 'auth_status', 'spaces', 'space_creating_status', 'space_deleting_status', 'space_renaming_status', 'resolved_path']
        );

        return () => {
             controleur.desincription(filesComp, 
                ['get_files', 'upload_file', 'delete_file', 'get_spaces', 'create_space', 'delete_space', 'rename_space', 'resolve_path'], 
                ['files', 'file_uploading_status', 'fileDeletingStatus', 'file_deleting_status', 'file deleting status', 'auth status', 'auth_status', 'spaces', 'space_creating_status', 'space_deleting_status', 'space_renaming_status', 'resolved_path']
            );
        };
    }, [controleur, isReady, !!currentUser, activeTab, targetSilo, currentSpace?._id, isHydrated]);

    useEffect(() => {
        if (!isReady || !currentUser || !isHydrated) return;

        const silo = params.slug?.[0];
        const actualPath = params.slug?.slice(1) || [];

        if (silo && ['personal', 'global', 'team'].includes(silo)) {
            setActiveTab(silo);
            const isStaff = ['admin', 'enseignant'].includes(currentUser.role);
            setTargetSilo((silo === 'global' && !isStaff) ? 'personal' : silo);
            
            if (actualPath.length > 0) {
                controleur.envoie(filesCompRef.current, {
                    resolve_path: {
                        path: actualPath.map(s => decodeURIComponent(s)),
                        userId: currentUser._id,
                        category: silo, 
                    },
                });
            } else {
                setCurrentSpace(null);
                setPath([]);
                fetchSpaces(null);
            }
        } else if (params.slug?.length > 0) {
            // If someone navigates to /files/FolderA, default to 'global' or 'personal'?
            // User request suggests 3 explicit silos. Let's redirect to /files/personal if no silo
            router.push('/files/personal');
        } else {
            router.push('/files/personal');
        }
    }, [params.slug?.join('/'), isReady, !!currentUser]);

    useEffect(() => {
        if (isReady && currentUser && isHydrated) {
            // Fetch roots for the bar
            fetchSpaces(null);
            // Fetch children for the grid
            fetchSpaces(currentSpace?._id || null);
            fetchFiles(currentSpace?._id || null);
        }
    }, [currentSpace?._id, isReady, !!currentUser, activeTab, isHydrated]);

    const fetchSpaces = (parentId = null) => {
        if (controleur && filesCompRef.current) {
            controleur.envoie(filesCompRef.current, { 
                get_spaces: { 
                    userId: currentUser?._id,
                    parentId: parentId,
                    category: activeTab 
                } 
            });
        }
    };

    const fetchFiles = (spaceId) => {
        if (controleur && filesCompRef.current) {
            setLoading(true);
            controleur.envoie(filesCompRef.current, {
                get_files: { 
                    userId: currentUser?._id,
                    spaceId: spaceId,
                    category: activeTab
                }
            });
        }
    };

    const handleTabChange = (tab) => {
        setFiles([]);
        setSpaces([]);
        setCurrentSpace(null);
        router.push(`/files/${tab}`);
    };

    const handleFolderClick = (space) => {
        const currentSlug = params.slug || [activeTab];
        const newPathArray = [...currentSlug, space.name];
        router.push(`/files/${newPathArray.join('/')}`);
    };

    const handleRootFolderClick = (space) => {
        router.push(`/files/${activeTab}/${space.name}`);
    };

    const handleBreadcrumbClick = (folder, index) => {
        if (index === -1) {
            router.push(`/files/${activeTab}`);
        } else {
            const newPathArr = [activeTab, ...path.slice(0, index + 1).map(p => p.name)];
            router.push(`/files/${newPathArr.join('/')}`);
        }
    };

    const getDisplayTitle = () => {
        if (currentSpace) return currentSpace.name;
        if (activeTab === 'personal') return 'Mes Fichiers';
        if (activeTab === 'global') return 'Espace Commun';
        return 'Espace Collaboratif';
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

    useEffect(() => {
        if (isUploadModalOpen) {
            setUploadingFile(null);
            setUploadPreviewUrl(null);
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
                spaceId: currentSpace?._id || null,
                category: targetSilo
            }
        });
    };

    const handleDownload = (file) => {
        if (!file.url || file.url === "#") {
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
        controleur.envoie(filesCompRef.current, { 
            create_space: { 
                name: newSpaceName, 
                userId: currentUser._id,
                category: targetSilo,
                parentId: currentSpace?._id || null,
                members: targetSilo === 'team' ? selectedMembers : []
            } 
        });
        setSelectedMembers([]);
    };

    const handleRenameSpace = (e, spaceId) => {
        e.stopPropagation();
        const newName = prompt("Nouveau nom du dossier :");
        if (newName && newName.trim()) {
            controleur.envoie(filesCompRef.current, {
                rename_space: { spaceId, newName, userId: currentUser._id }
            });
        }
    };

    const handleRenameFile = (e, fileId) => {
        e.stopPropagation();
        const newName = prompt("Nouveau nom du fichier :");
        if (newName && newName.trim()) {
            controleur.envoie(filesCompRef.current, {
                update_file: { fileId, newName, userId: currentUser._id }
            });
        }
    };

    const toggleMember = (uid) => {
        setSelectedMembers(prev => 
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const filteredUsers = (allUsers || []).filter(u => 
        u._id !== currentUser?._id &&
        (u.firstname.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    );

    const handleDeleteSpace = (e, spaceId) => {
        e.stopPropagation();
        if (confirm("Supprimer cet espace ? Les fichiers seront conservés à la racine.")) {
            setLoading(true);
            controleur.envoie(filesCompRef.current, { delete_space: { spaceId: spaceId, userId: currentUser._id } });
        }
    };

    const handleDeleteFile = (e, fileId) => {
        e.stopPropagation();
        if (confirm("Supprimer ce fichier ?")) {
            setLoading(true);
            controleur.envoie(filesCompRef.current, { delete_file: { fileId: fileId, userId: currentUser._id } });
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
    };

    const filteredSpaces = spaces.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Management Permission:
    // Teachers/Admins: Can manage everything.
    // Students/All: Can manage IF they are the owner.
    const canManageItem = (item) => {
        if (!currentUser) return false;
        
        const isStaff = ['admin', 'enseignant'].includes(currentUser.role);
        if (isStaff) return true;

        // Students can manage in 'personal' and 'team' if they are owner
        if (activeTab === 'global') return false; 
        
        return item.owner?._id === currentUser._id || item.owner === currentUser._id;
    };

    return (
        <div className={styles.layoutWrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarTitle}>Navigation</div>
                <nav className={styles.sidebarNav}>
                    <button 
                        className={`${styles.sidebarNavItem} ${activeTab === 'personal' ? styles.activeNavItem : ''}`}
                        onClick={() => handleTabChange('personal')}
                    >
                        <div className={styles.sidebarIconWrapper}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <span>Privée</span>
                    </button>
                    <button 
                        className={`${styles.sidebarNavItem} ${activeTab === 'global' ? styles.activeNavItem : ''}`}
                        onClick={() => handleTabChange('global')}
                    >
                        <div className={styles.sidebarIconWrapper}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <span>Commun</span>
                    </button>
                    <button 
                        className={`${styles.sidebarNavItem} ${activeTab === 'team' ? styles.activeNavItem : ''}`}
                        onClick={() => handleTabChange('team')}
                    >
                        <div className={styles.sidebarIconWrapper}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
                        </div>
                        <span>Équipe</span>
                    </button>
                </nav>
            </aside>

            <div className={styles.container}>
                {/* Mobile silo tabs - visible only on mobile via CSS */}
                <div className={styles.mobileSiloBar}>
                    <button 
                        className={`${styles.mobileSiloTab} ${activeTab === 'personal' ? styles.mobileSiloActive : ''}`}
                        onClick={() => handleTabChange('personal')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        Privée
                    </button>
                    <button 
                        className={`${styles.mobileSiloTab} ${activeTab === 'global' ? styles.mobileSiloActive : ''}`}
                        onClick={() => handleTabChange('global')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Commun
                    </button>
                    <button 
                        className={`${styles.mobileSiloTab} ${activeTab === 'team' ? styles.mobileSiloActive : ''}`}
                        onClick={() => handleTabChange('team')}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
                        Équipe
                    </button>
                </div>
                <div className={styles.header}>
                    <div className={styles.breadcrumbBar}>
                        <button className={styles.breadcrumbItem} onClick={() => handleBreadcrumbClick(null, -1)}>
                            {activeTab === 'personal' ? 'Privée' : (activeTab === 'global' ? 'Commun' : 'Équipe')}
                        </button>
                        {path.map((folder, idx) => (
                            <React.Fragment key={folder._id}>
                                <span className={styles.breadcrumbSeparator}>/</span>
                                <button className={styles.breadcrumbItem} onClick={() => handleBreadcrumbClick(folder, idx)}>
                                    {folder.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className={styles.headerActions}>
                        {!currentSpace ? (
                            <>
                                {activeTab === 'personal' && (
                                    <button className={`${styles.createSpaceBtn} ${styles.btnPersonal}`} onClick={() => { setIsSpaceModalOpen(true); setTargetSilo('personal'); }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                                        Dossier Privé
                                    </button>
                                )}
                                {activeTab === 'global' && ['admin', 'enseignant'].includes(currentUser?.role) && (
                                    <button className={`${styles.createSpaceBtn} ${styles.btnGlobal}`} onClick={() => { setIsSpaceModalOpen(true); setTargetSilo('global'); }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                                        Dossier Commun
                                    </button>
                                )}
                                {activeTab === 'team' && (
                                    <button className={`${styles.createSpaceBtn} ${styles.btnTeam}`} onClick={() => { setIsSpaceModalOpen(true); setTargetSilo('team'); }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                                        Dossier Équipe
                                    </button>
                                )}
                            </>
                        ) : (
                            !(activeTab === 'global' && !['admin', 'enseignant'].includes(currentUser?.role)) && (
                                <>
                                    <button className={styles.createSpaceBtn} onClick={() => {
                                        setIsSpaceModalOpen(true);
                                        setTargetSilo(activeTab);
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                                        Nouveau dossier
                                    </button>
                                    <button className={styles.uploadBtn} onClick={() => {
                                        setIsUploadModalOpen(true);
                                        setTargetSilo(activeTab);
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                        Ajouter un fichier
                                    </button>
                                </>
                            )
                        )}
                    </div>
                </div>

                <div className={styles.filterContainer}>
                    <div className={styles.filterBar}>
                        <button 
                            className={`${styles.filterBtn} ${!searchTerm ? styles.filterActive : ''}`}
                            onClick={() => setSearchTerm('')}
                        >
                            Tous
                        </button>
                        {rootSpaces.map(s => (
                            <button 
                                key={s._id} 
                                className={`${styles.filterBtn} ${currentSpace?._id === s._id ? styles.filterActive : ''}`}
                                onClick={() => handleRootFolderClick(s)}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>

                    <div className={styles.searchWrapper}>
                        <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input 
                            type="text" 
                            placeholder="Rechercher un dossier ou fichier..." 
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {currentSpace && params.slug?.length > 1 && (
                    <div 
                        className={styles.backButton}
                        onClick={() => {
                            const parentPath = params.slug.slice(0, -1).join('/');
                            router.push(`/files/${parentPath}`);
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        <span>Retour au dossier parent</span>
                    </div>
                )}

                {loading ? (
                    <div className={styles.loading}>SÉCURISATION DE VOS DONNÉES...</div>
                ) : (
                    <div className={styles.grid}>
                        {/* Folders (Spaces) */}
                        {filteredSpaces.map(s => (
                            <div key={s._id} className={`${styles.card} ${styles.folderCard}`} onClick={() => handleFolderClick(s)} style={{ cursor: 'pointer' }}>
                                <div className={styles.iconWrapper}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                </div>
                                <div className={styles.fileInfo}>
                                    <span className={styles.name}>{s.name}</span>
                                    <div className={styles.meta}>
                                        <span>Dossier</span>
                                        {s.members && s.members.length > 0 && (
                                            <>
                                                <span>•</span>
                                                <span>{s.members.length} membre{s.members.length > 1 ? 's' : ''}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {s.owner && (
                                    <div className={styles.ownerInfo}>
                                        <img 
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${s.owner._id}`} 
                                            alt={s.owner.firstname} 
                                            className={styles.userAvatar} 
                                            style={{ width: '24px', height: '24px', marginRight: '8px' }}
                                        />
                                        <span>{s.owner.firstname}</span>
                                        <span className={`${styles.roleBadge} ${s.owner.role === 'admin' ? styles.roleAdmin : (s.owner.role === 'enseignant' ? styles.roleEnseignant : styles.roleStudent)}`}>
                                            {s.owner.role === 'admin' ? 'Admin' : (s.owner.role === 'enseignant' ? 'Prof' : 'Étudiant')}
                                        </span>
                                    </div>
                                )}

                                {canManageItem(s) && (
                                    <div className={styles.folderActions}>
                                        <button className={styles.actionBtn} title="Renommer" onClick={(e) => handleRenameSpace(e, s._id)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        {['admin', 'enseignant'].includes(currentUser?.role) && (
                                            <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={(e) => handleDeleteSpace(e, s._id)}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2 2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Files */}
                        {filteredFiles.map(file => (
                            <div key={file._id} className={styles.card}>
                                <div className={styles.iconWrapper}>
                                    {file.type.startsWith('image/') ? (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 17 16 12 5 21"></polyline></svg>
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                    )}
                                </div>
                                
                                <div className={styles.fileInfo}>
                                    <span className={styles.name}>{file.name}</span>
                                    <div className={styles.meta}>
                                        <span>{formatSize(file.size)}</span>
                                        <span>•</span>
                                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {file.owner && (
                                    <div className={styles.ownerInfo}>
                                        <img 
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${file.owner._id}`} 
                                            alt={file.owner.firstname} 
                                            className={styles.userAvatar} 
                                            style={{ width: '24px', height: '24px', marginRight: '8px' }}
                                        />
                                        <span>{file.owner.firstname}</span>
                                        <span className={`${styles.roleBadge} ${file.owner.role === 'admin' ? styles.roleAdmin : (file.owner.role === 'enseignant' ? styles.roleEnseignant : styles.roleStudent)}`}>
                                            {file.owner.role === 'admin' ? 'Admin' : (file.owner.role === 'enseignant' ? 'Prof' : 'Étudiant')}
                                        </span>
                                    </div>
                                )}

                                {canManageItem(file) && (
                                    <div className={styles.folderActions}>
                                        <button className={styles.actionBtn} title="Renommer" onClick={(e) => handleRenameFile(e, file._id)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button className={styles.actionBtn} title="Télécharger" onClick={(e) => handleDownload(file)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                        </button>
                                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Supprimer" onClick={(e) => handleDeleteFile(e, file._id)}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2 2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredSpaces.length === 0 && filteredFiles.length === 0 && (
                            <div className={styles.emptyState}>Aucun élément trouvé.</div>
                        )}
                    </div>
                )}
            </div>

            {isUploadModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Ajouter un fichier</h2>
                        

                        <div className={styles.fileDropArea} onClick={() => document.getElementById('fIn').click()}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            <p>{uploadingFile ? uploadingFile.name : "Cliquez ou glissez un fichier"}</p>
                            <input type="file" id="fIn" hidden onChange={(e) => handleFileSelect(e.target.files[0])} />
                        </div>
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={handleCloseUploadModal}>Annuler</button>
                            <button className={styles.submitBtn} disabled={!uploadingFile} onClick={handleUploadSubmit}>Envoyer</button>
                        </div>
                    </div>
                </div>
            )}

            {isSpaceModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={`${styles.modal} ${targetSilo === 'personal' ? styles.modalPersonal : (targetSilo === 'global' ? styles.modalGlobal : (targetSilo === 'team' ? styles.modalTeam : ''))}`}>
                        <h2 className={styles.modalTitle}>
                            {targetSilo === 'personal' ? 'Nouveau Dossier Privé' : (targetSilo === 'global' ? 'Nouveau Dossier Commun' : (targetSilo === 'team' ? 'Nouveau Dossier Équipe' : 'Nouveau Dossier'))}
                        </h2>


                        <input type="text" className={styles.modalInput} placeholder="Nom du dossier..." value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} autoFocus />
                        
                        {targetSilo === 'team' && (
                            <div className={styles.memberSelectionArea}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '8px', display: 'block' }}>
                                    Inviter des collaborateurs
                                </label>
                                <input 
                                    type="text" 
                                    className={styles.modalInput} 
                                    placeholder="Rechercher une personne..." 
                                    style={{ padding: '8px 12px', fontSize: '13px', marginBottom: '12px' }}
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />
                                <div className={styles.userListScroll}>
                                    {filteredUsers.map(u => (
                                        <div 
                                            key={u._id} 
                                            className={`${styles.userSelectionItem} ${selectedMembers.includes(u._id) ? styles.selectedUser : ''}`}
                                            onClick={() => toggleMember(u._id)}
                                        >
                                            <img 
                                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${u._id}`} 
                                                alt={u.firstname} 
                                                className={styles.userAvatar} 
                                            />
                                            <div className={styles.userSelectionInfo}>
                                                <span className={styles.userSelectionName}>{u.firstname} {u.lastname}</span>
                                                <span className={`${styles.userSelectionRole} ${u.role === 'admin' ? styles.roleAdminText : (u.role === 'enseignant' ? styles.roleEnseignantText : styles.roleStudentText)}`}>
                                                    {u.role === 'admin' ? 'Administrateur' : (u.role === 'enseignant' ? 'Enseignant' : 'Étudiant')}
                                                </span>
                                            </div>
                                            {selectedMembers.includes(u._id) && (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setIsSpaceModalOpen(false)}>Annuler</button>
                            <button 
                                className={`${styles.submitBtn} ${targetSilo === 'personal' ? styles.btnPersonal : (targetSilo === 'global' ? styles.btnGlobal : (targetSilo === 'team' ? styles.btnTeam : ''))}`} 
                                disabled={!newSpaceName.trim()} 
                                onClick={handleCreateSpace}
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewFile && (
                <div className={styles.modalOverlay} onClick={() => setPreviewFile(null)}>
                    <div className={styles.modal} style={{ maxWidth: '80vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <h2 className={styles.modalTitle} style={{ margin: 0 }}>{previewFile.name}</h2>
                            <button onClick={() => setPreviewFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        <div style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', background: '#F8FAFC', borderRadius: '12px' }}>
                            {previewFile.type.startsWith('image/') ? (
                                <img src={previewFile.url} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                    <p style={{ marginTop: '16px', color: '#64748B' }}>Prévisualisation non disponible pour ce type de fichier.</p>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalActions} style={{ width: '100%', marginTop: '20px' }}>
                            <button className={styles.submitBtn} onClick={() => handleDownload(previewFile)}>Télécharger</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

