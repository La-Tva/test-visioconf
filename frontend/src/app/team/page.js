"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './team.module.css';

export default function TeamPage() {
    const [teams, setTeams] = useState([]);
    const [isMobile, setIsMobile] = useState(false); // Mobile detection
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [currentUser, setCurrentUser] = useState(null);
    const [activeTeam, setActiveTeam] = useState(null);
    const [teamMessages, setTeamMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [addMemberIds, setAddMemberIds] = useState([]);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'student', 'admin'
    const [searchTerm, setSearchTerm] = useState('');
    const [showMembersList, setShowMembersList] = useState(false);

    // Get global users (potential team members)
    const { users } = usePreload(); 
    const { controleur, isReady } = useSocket();
    const teamCompRef = useRef(null);
    const messagesEndRef = useRef(null);
    const activeTeamRef = useRef(activeTeam);

    useEffect(() => {
        activeTeamRef.current = activeTeam;
    }, [activeTeam]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [teamMessages, activeTeam]);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
    }, []);

    useEffect(() => {
        if (!controleur || !isReady || !currentUser) return;

        const teamComp = {
            nomDInstance: "TeamComponent",
            traitementMessage: (msg) => {
                const currentActiveTeam = activeTeamRef.current; 

                if (msg.teams) {
                    setTeams(msg.teams.teams);
                    if (currentActiveTeam) {
                        const updated = msg.teams.teams.find(t => t._id === currentActiveTeam._id);
                        if (updated) setActiveTeam(updated);
                    }
                }
                if (msg.team_creating_status) {
                    if (msg.team_creating_status.success) {
                        setIsModalOpen(false);
                        setTeamName('');
                        setSelectedMembers([]);
                         controleur.envoie(teamComp, {
                            'get teams': { userId: currentUser._id }
                        });
                    } else {
                        alert(msg.team_creating_status.error);
                    }
                }
                if (msg.team_updating_status) {
                     if (msg.team_updating_status.success) {
                         setIsAddMemberOpen(false);
                         setAddMemberIds([]);
                     } else {
                         alert("Erreur lors de la mise à jour");
                     }
                }
                if (msg.team_messages) {
                    if (currentActiveTeam && msg.team_messages.teamId === currentActiveTeam._id) {
                         setTeamMessages(msg.team_messages.messages);
                    }
                }
                if (msg.receive_team_message) {
                    const { message, teamId } = msg.receive_team_message;
                    if (currentActiveTeam && teamId === currentActiveTeam._id) {
                        setTeamMessages(prev => [...prev, message]);
                    }
                }
                if (msg.leave_team_status || msg.team_deleting_status) {
                    setActiveTeam(null);
                }
                if (msg.team_updating_status && msg.team_updating_status.removed) {
                     setActiveTeam(null);
                }
            }
        };
        teamCompRef.current = teamComp;

        controleur.inscription(teamComp, 
            ['get teams', 'create team', 'get_team_messages', 'team_message', 'leave_team', 'delete team', 'add_team_member', 'remove_team_member'], 
            ['teams', 'team_creating_status', 'team_messages', 'receive_team_message', 'leave_team_status', 'team_deleting_status', 'team_updating_status']
        );

        // Initial fetch
        controleur.envoie(teamComp, {
            'get teams': { userId: currentUser._id }
        });

        return () => {
             controleur.desincription(teamComp, 
                ['get teams', 'create team', 'get_team_messages', 'team_message', 'leave_team', 'delete team', 'add_team_member', 'remove_team_member'], 
                ['teams', 'team_creating_status', 'get_team_messages_response', 'receive_team_message', 'leave_team_status', 'team_deleting_status', 'team_updating_status']
            );
        };
    }, [controleur, isReady, currentUser]);

    const handleCreateTeam = () => {
        if (!teamName.trim() || selectedMembers.length === 0) {
            alert("Veuillez entrer un nom et choisir au moins un membre.");
            return;
        }

        controleur.envoie(teamCompRef.current, {
            'create team': {
                name: teamName,
                ownerId: currentUser._id,
                memberIds: selectedMembers
            }
        });
    };

    const handleAddMembersSubmit = () => {
         if (addMemberIds.length === 0) return;
         controleur.envoie(teamCompRef.current, {
             add_team_member: {
                 teamId: activeTeam._id,
                 userId: currentUser._id,
                 newMemberIds: addMemberIds
             }
         });
    };

    const handleRemoveMember = (memberId) => {
        if (confirm("Retirer ce membre de l'équipe ?")) {
            controleur.envoie(teamCompRef.current, {
                remove_team_member: {
                    teamId: activeTeam._id,
                    userId: currentUser._id,
                    memberIdToRemove: memberId
                }
            });
        }
    }

    const toggleMember = (userId) => {
        setSelectedMembers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const toggleAddMember = (userId) => {
        setAddMemberIds(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };
    
    const openTeamChat = (team) => {
        console.log("Opening chat for team:", team);
        setActiveTeam(team);
        activeTeamRef.current = team; // Immediate update
        if (controleur && teamCompRef.current) {
             controleur.envoie(teamCompRef.current, {
                get_team_messages: { 
                    teamId: team._id,
                    userId: currentUser._id
                }
            });
        } else {
            console.warn("Controleur or teamCompRef missing in openTeamChat");
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !activeTeam || !currentUser) return;

        controleur.envoie(teamCompRef.current, {
            team_message: {
                senderId: currentUser._id,
                teamId: activeTeam._id,
                content: inputMessage
            }
        });
        setInputMessage('');
    };

    const handleLeaveTeam = (e) => {
        e.preventDefault();
        if (!activeTeam || !currentUser) return;
        if (confirm("Êtes-vous sûr de vouloir quitter ce groupe ?")) {
             controleur.envoie(teamCompRef.current, {
                leave_team: { teamId: activeTeam._id, userId: currentUser._id }
            });
        }
    };

    const handleDeleteTeam = (e) => {
         e.preventDefault();
         if (!activeTeam || !currentUser) return;
         if (confirm("Êtes-vous sûr de vouloir SUPPRIMER ce groupe ? Cette action est irréversible.")) {
            controleur.envoie(teamCompRef.current, {
                'delete team': { teamId: activeTeam._id, userId: currentUser._id }
            });
         }
    };



    // Filter Logic

    // Filter Logic ... (keep existing)
    const filteredTeams = teams.filter(team => {
        const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
        const role = team.owner?.role || 'user';
        
        if (!matchesSearch) return false;

        if (filter === 'all') return true;
        if (filter === 'student') return role !== 'admin';
        if (filter === 'admin') return role === 'admin';
        return true;
    });

    const potentialMembers = users.filter(u => u._id !== currentUser?._id);
    const potentialNewMembers = activeTeam ? users.filter(u => 
        u._id !== currentUser._id && 
        u._id !== activeTeam.owner._id &&
        !activeTeam.members.some(m => m._id === u._id)
    ) : [];

    // Helper for chat view logic (since we merged returns, we need to access isOwner safely)
    const isOwner = activeTeam?.owner?._id === currentUser?._id;

    return (
        <div className={styles.container}>
            {/* List View: Visible if no team selected OR on mobile (background layer) */}
            {(!isMobile || !activeTeam) && (
                <div className={styles.mainContent}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Mes Équipes</h1>
                        <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Créer une équipe
                        </button>
                    </div>

                    <div className={styles.filterContainer}>
                        <div className={styles.filterActions}>
                            <button 
                                className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                Tous
                            </button>
                            <button 
                                className={`${styles.filterBtn} ${filter === 'student' ? styles.filterBtnActive : ''}`}
                                onClick={() => setFilter('student')}
                            >
                                Étudiant
                            </button>
                            <button 
                                className={`${styles.filterBtn} ${filter === 'admin' ? styles.filterBtnActive : ''}`}
                                onClick={() => setFilter('admin')}
                            >
                                Admin
                            </button>
                        </div>
                        
                        <div className={styles.searchWrapper}>
                            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input 
                                type="text" 
                                placeholder="Rechercher une équipe..." 
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.grid}>
                        {filteredTeams.map(team => {
                                const unread = team.unreadCounts && currentUser 
                                            ? (team.unreadCounts[currentUser._id] || 0) 
                                            : 0;
                                
                                return (
                                <div key={team._id} className={styles.teamCard} onClick={() => openTeamChat(team)}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                        <div className={styles.teamName}>{team.name}</div>
                                        {unread > 0 && (
                                            <div style={{
                                                backgroundColor: '#EF4444', color: 'white', 
                                                borderRadius: '50%', width: '20px', height: '20px', 
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '11px', fontWeight: 'bold'
                                            }}>
                                                {unread}
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.memberCount}>{team.members.length + 1} membres</div>
                                    
                                    <div className={styles.cardFooter}>
                                        <div style={{fontSize: '12px', color: '#64748B'}}>
                                            Par <span style={{fontWeight:'600'}}>{team.owner?.firstname}</span> 
                                        </div>
                                        <div className={styles.avatars}>
                                            <img 
                                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${team.owner?._id}`} 
                                                className={styles.avatar} 
                                                alt=""
                                            />
                                            {team.members.slice(0, 3).map(m => (
                                                <img 
                                                    key={m._id}
                                                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${m._id}`}
                                                    className={styles.avatar}
                                                    alt=""
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {teams.length === 0 && (
                            <p style={{color: '#64748B'}}>Vous n'êtes dans aucune équipe.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Chat View */}
            <AnimatePresence mode="wait">
                {activeTeam && (
                    <motion.div 
                        className={styles.chatContainer}
                        key={activeTeam._id}
                        initial={{ x: isMobile ? "100%" : 40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: isMobile ? "100%" : -40, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={isMobile ? { position: 'fixed', top: 0, left: 0, width: '100%', height:'100%', zIndex: 1200, background: 'white' } : {}}
                    >
                         <div className={styles.chatHeader}>
                             <button onClick={() => setActiveTeam(null)} className={styles.backBtn}>
                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                             </button>
                             <h2 className={styles.chatTitle}>{activeTeam.name}</h2>
                             
                             <div className={styles.headerActions}>
                                 <button onClick={() => setShowMembersList(!showMembersList)} className={`${styles.iconBtn} ${showMembersList ? styles.activeIconBtn : ''}`} title="Voir les membres">
                                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                 </button>
                                 {isOwner ? (
                                     <button onClick={handleDeleteTeam} className={`${styles.iconBtn} ${styles.deleteIconBtn}`} title="Supprimer l'équipe">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                     </button>
                                 ) : (
                                     <button onClick={handleLeaveTeam} className={styles.iconBtn} title="Quitter le groupe">
                                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                     </button>
                                 )}
                             </div>
                         </div>
                         
                         <div className={styles.chatBody}>
                            <div className={styles.mainChatArea}>
                                <div className={styles.messagesList}>
                                    {teamMessages.map((msg, index) => {
                                        const isMe = msg.sender._id === currentUser._id;
                                        return (
                                            <div key={index} className={`${styles.messageRow} ${isMe ? styles.myMessageRow : styles.friendMessageRow}`}>
                                                {!isMe && (
                                                    <div className={styles.senderName}>
                                                        {msg.sender.firstname}
                                                        {msg.sender.role && msg.sender.role !== 'etudiant' && (
                                                            <span className={`${styles.roleBadge} ${styles[msg.sender.role]}`}>
                                                                {msg.sender.role}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className={styles.messageBubble}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <form className={styles.inputArea} onSubmit={handleSendMessage}>
                                    <input
                                        type="text"
                                        className={styles.messageInput}
                                        placeholder={`Message à ${activeTeam.name}...`}
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                    />
                                    <button type="submit" className={styles.sendBtn}>Envoyer</button>
                                </form>
                            </div>

                            <div className={`${styles.membersSidebar} ${showMembersList ? styles.showMembers : styles.hideMembers}`}>
                                <div className={styles.sidebarHeader}>
                                    <h3 className={styles.membersTitle}>Membres ({activeTeam.members.length + 1})</h3>
                                    {isOwner && (
                                        <button className={styles.addMemberBtn} onClick={() => setIsAddMemberOpen(true)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                            Inviter
                                        </button>
                                    )}
                                </div>
                                
                                {/* Owner */}
                                <div className={styles.memberItemSmall}>
                                    <img 
                                        src={`https://api.dicebear.com/9.x/shapes/svg?seed=${activeTeam.owner?._id}`} 
                                        className={styles.avatarSmall} 
                                        alt=""
                                    />
                                    <span style={{fontSize: '14px', fontWeight: '600', color: '#0F172A'}}>{activeTeam.owner?.firstname}</span>
                                    <span className={`${styles.ownerBadge} ${styles[activeTeam.owner?.role || 'admin']}`}>
                                        {activeTeam.owner?.role || 'PROPRIO'}
                                    </span>
                                </div>

                                {/* Members */}
                                {activeTeam.members.map(m => (
                                    <div key={m._id} className={styles.memberItemSmall}>
                                        <img 
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${m._id}`}
                                            className={styles.avatarSmall} 
                                            alt=""
                                        />
                                        <span style={{fontSize: '14px', fontWeight: '500', color: '#475569'}}>{m.firstname}</span>
                                        {isOwner && (
                                            <button 
                                                className={styles.removeMemberBtn} 
                                                title="Retirer le membre"
                                                onClick={() => handleRemoveMember(m._id)}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                         </div>
                    
                        {/* Add Member Modal (Scoped to Chat) */}
                        {isAddMemberOpen && (
                            <div className={styles.modalOverlay}>
                                <div className={styles.modal}>
                                    <h2 className={styles.modalTitle}>Ajouter des membres</h2>
                                    <div className={styles.inputGroup} style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                                        <div className={styles.userList}>
                                            {potentialNewMembers.length === 0 ? (
                                                <p style={{color: '#64748B', textAlign:'center'}}>Aucun autre utilisateur disponible.</p>
                                            ) : (
                                                potentialNewMembers.map(user => (
                                                    <label key={user._id} className={styles.userItem}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={addMemberIds.includes(user._id)}
                                                            onChange={() => toggleAddMember(user._id)}
                                                        />
                                                        <img 
                                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`}
                                                            width="24" height="24" 
                                                            style={{borderRadius: '50%', marginRight: '10px'}}
                                                        />
                                                        {user.firstname}
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.modalActions}>
                                        <button className={styles.cancelBtn} onClick={() => setIsAddMemberOpen(false)}>Annuler</button>
                                        <button className={styles.submitBtn} onClick={handleAddMembersSubmit}>Ajouter</button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Modal (Global) */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h2 className={styles.modalTitle}>Nouvelle Équipe</h2>
                        
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>Nom de l'équipe</label>
                            <input 
                                type="text" 
                                className={styles.input} 
                                placeholder="Ex: Projet Alpha"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                            />
                        </div>

                        <div className={styles.inputGroup} style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                            <label className={styles.label}>Inviter des membres ({selectedMembers.length})</label>
                            <div className={styles.userList}>
                                {potentialMembers.map(user => (
                                    <label key={user._id} className={styles.userItem}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedMembers.includes(user._id)}
                                            onChange={() => toggleMember(user._id)}
                                        />
                                        <img 
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`}
                                            width="24" height="24" 
                                            style={{borderRadius: '50%', marginRight: '10px'}}
                                        />
                                        {user.firstname}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Annuler</button>
                            <button className={styles.submitBtn} onClick={handleCreateTeam}>Créer l'équipe</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
