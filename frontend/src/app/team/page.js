"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';
import { useCall } from '../context/CallContext';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './team.module.css';

export default function TeamPage() {
    const [teams, setTeams] = useState([]);
    const [isMobile, setIsMobile] = useState(false); // Mobile detection
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [modalSearchTerm, setModalSearchTerm] = useState('');

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
    const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'student', 'admin'
    const [searchTerm, setSearchTerm] = useState('');
    const [showMembersList, setShowMembersList] = useState(false);

    const { users } = usePreload(); 
    const { controleur, isReady } = useSocket();
    const { startCall, startGroupCall } = useCall();
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
        setModalSearchTerm(''); // Reset search
        setTeamName('');
        setSelectedMembers([]);
        setIsModalOpen(false);
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
         setAddMemberSearchTerm('');
         setIsAddMemberOpen(false);
         setAddMemberIds([]);
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
            <AnimatePresence mode="wait">
                {!activeTeam ? (
                    <motion.div 
                        key="team-list"
                        className={styles.mainContent}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                    >
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
                    </motion.div>
                ) : (
                    <motion.div 
                        className={styles.chatContainer}
                        key={activeTeam._id}
                        initial={{ x: isMobile ? "100%" : 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: isMobile ? "100%" : 20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        style={isMobile ? { position: 'fixed', top: 0, left: 0, width: '100%', height:'100%', zIndex: 1200, background: 'white' } : {}}
                    >
                         <div className={styles.chatHeader}>
                             <button onClick={() => setActiveTeam(null)} className={styles.backBtn}>
                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                             </button>
                             <h2 className={styles.chatTitle}>{activeTeam.name}</h2>
                             
                             <div className={styles.headerActions}>
                                 <button onClick={() => startGroupCall(activeTeam)} className={styles.iconBtn} title="Lancer un appel de groupe" style={{color:'#3B82F6', marginRight:4}}>
                                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                                 </button>
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
                                {(() => {
                                    const owner = activeTeam.owner;
                                    const realOwner = users.find(u => u._id === owner?._id) || owner;
                                    const isMe = owner?._id === currentUser?._id;
                                    
                                    return owner ? (
                                        <div className={styles.memberItemSmall}>
                                            <div style={{display:'flex', alignItems:'center', flex:1}}>
                                                <img 
                                                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${owner._id}`} 
                                                    className={styles.avatarSmall} 
                                                    alt=""
                                                />
                                                <div style={{display:'flex', flexDirection:'column'}}>
                                                    <span style={{fontSize: '14px', fontWeight: '600', color: '#0F172A'}}>{owner.firstname}</span>
                                                    <span className={`${styles.ownerBadge} ${styles[owner.role || 'admin']}`}>
                                                        {owner.role || 'PROPRIO'}
                                                    </span>
                                                </div>
                                            </div>
                                            {!isMe && (
                                                <button 
                                                    onClick={() => realOwner?.is_online && startCall(realOwner)}
                                                    className={styles.iconBtn}
                                                    title={realOwner?.is_online ? "Appeler" : "Hors ligne"}
                                                    style={{ 
                                                        opacity: realOwner?.is_online ? 1 : 0.3, 
                                                        cursor: realOwner?.is_online ? 'pointer' : 'not-allowed',
                                                        color: '#3B82F6',
                                                        marginRight: '8px'
                                                    }}
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                                                </button>
                                            )}
                                        </div>
                                    ) : null;
                                })()}

                                {/* Members */}
                                {activeTeam.members.map(m => {
                                    const realMember = users.find(u => u._id === m._id) || m;
                                    const isMe = m._id === currentUser?._id;

                                    return (
                                        <div key={m._id} className={styles.memberItemSmall}>
                                            <div style={{display:'flex', alignItems:'center', flex:1}}>
                                                <img 
                                                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${m._id}`}
                                                    className={styles.avatarSmall} 
                                                    alt=""
                                                />
                                                <span style={{fontSize: '14px', fontWeight: '500', color: '#475569'}}>{m.firstname}</span>
                                            </div>
                                            
                                            <div style={{display:'flex', alignItems:'center'}}>
                                                {!isMe && (
                                                    <button 
                                                        onClick={() => realMember?.is_online && startCall(realMember)}
                                                        className={styles.iconBtn} 
                                                        title={realMember?.is_online ? "Appeler" : "Hors ligne"}
                                                        style={{ 
                                                            opacity: realMember?.is_online ? 1 : 0.3, 
                                                            cursor: realMember?.is_online ? 'pointer' : 'not-allowed',
                                                            color: '#3B82F6',
                                                            marginRight: '4px'
                                                        }}
                                                    >
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                                                    </button>
                                                )}
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
                                        </div>
                                    );
                                })}
                            </div>
                         </div>
                    
                        {/* Add Member Modal (Scoped to Chat) */}
                        {isAddMemberOpen && (
                            <div className={styles.modalOverlay}>
                                <div className={styles.modal}>
                                    <div className={styles.modalHeader}>
                                        <h2 className={styles.modalTitle}>Ajouter des membres</h2>
                                    </div>
                                    
                                    <div className={styles.modalBody}>
                                        <div className={styles.inputGroup} style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                                             <div style={{position:'relative', marginBottom: 12}}>
                                                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{left: 12}}>
                                                    <circle cx="11" cy="11" r="8"></circle>
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                </svg>
                                                <input 
                                                    type="text" 
                                                    className={styles.modalSearchInput}
                                                    placeholder="Rechercher un membre..."
                                                    value={addMemberSearchTerm}
                                                    onChange={(e) => setAddMemberSearchTerm(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>

                                            <div className={styles.memberGrid}>
                                                {potentialNewMembers.filter(u => u.firstname.toLowerCase().includes(addMemberSearchTerm.toLowerCase())).map(user => {
                                                    const isSelected = addMemberIds.includes(user._id);
                                                    return (
                                                        <div 
                                                            key={user._id} 
                                                            className={`${styles.memberCard} ${isSelected ? styles.memberCardActive : ''}`}
                                                            onClick={() => toggleAddMember(user._id)}
                                                        >
                                                            <img 
                                                                src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`}
                                                                width="32" height="32" 
                                                                style={{borderRadius: '10px'}}
                                                            />
                                                            <div style={{display:'flex', flexDirection:'column'}}>
                                                                <span style={{fontSize:14, fontWeight:600, color:'#0F172A'}}>{user.firstname}</span>
                                                                <span style={{fontSize:11, color: '#64748B', textTransform:'uppercase', fontWeight:700}}>{user.role || 'Membre'}</span>
                                                            </div>
                                                            <div className={styles.checkIcon}>
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {potentialNewMembers.filter(u => u.firstname.toLowerCase().includes(addMemberSearchTerm.toLowerCase())).length === 0 && (
                                                    <div className={styles.emptyState}>
                                                        {potentialNewMembers.length === 0 ? "Aucun autre membre à ajouter." : `Aucun résultat pour "${addMemberSearchTerm}"`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.modalFooter}>
                                        <button className={styles.cancelBtn} onClick={() => { setIsAddMemberOpen(false); setAddMemberSearchTerm(''); }}>Annuler</button>
                                        <button className={styles.submitBtn} onClick={handleAddMembersSubmit} disabled={addMemberIds.length === 0}>Ajouter</button>
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
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Nouvelle Équipe</h2>
                        </div>
                        
                        <div className={styles.modalBody}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Nom de l'équipe</label>
                                <input 
                                    type="text" 
                                    className={styles.input} 
                                    placeholder="Ex: Projet Alpha"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className={styles.inputGroup} style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                                    <label className={styles.label} style={{marginBottom:0}}>Inviter des membres ({selectedMembers.length})</label>
                                </div>
                                
                                <div style={{position:'relative', marginBottom: 12}}>
                                    <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{left: 12}}>
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                    </svg>
                                    <input 
                                        type="text" 
                                        className={styles.modalSearchInput}
                                        placeholder="Rechercher un membre..."
                                        value={modalSearchTerm}
                                        onChange={(e) => setModalSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className={styles.memberGrid}>
                                    {potentialMembers.filter(u => u.firstname.toLowerCase().includes(modalSearchTerm.toLowerCase())).map(user => {
                                        const isSelected = selectedMembers.includes(user._id);
                                        return (
                                            <div 
                                                key={user._id} 
                                                className={`${styles.memberCard} ${isSelected ? styles.memberCardActive : ''}`}
                                                onClick={() => toggleMember(user._id)}
                                            >
                                                <img 
                                                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`}
                                                    width="32" height="32" 
                                                    style={{borderRadius: '10px'}}
                                                />
                                                <div style={{display:'flex', flexDirection:'column'}}>
                                                    <span style={{fontSize:14, fontWeight:600, color:'#0F172A'}}>{user.firstname}</span>
                                                    <span style={{fontSize:11, color: '#64748B', textTransform:'uppercase', fontWeight:700}}>{user.role || 'Membre'}</span>
                                                </div>
                                                
                                                <div className={styles.checkIcon}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {potentialMembers.filter(u => u.firstname.toLowerCase().includes(modalSearchTerm.toLowerCase())).length === 0 && (
                                        <div className={styles.emptyState}>
                                            Aucun membre trouvé pour "{modalSearchTerm}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => { setIsModalOpen(false); setModalSearchTerm(''); }}>Annuler</button>
                            <button className={styles.submitBtn} onClick={handleCreateTeam} disabled={!teamName.trim() || selectedMembers.length === 0}>
                                Créer l'équipe
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
