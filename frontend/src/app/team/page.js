"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';
import { useCall } from '../context/CallContext';
import { useTeamCall } from '../context/TeamCallContext';
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
    const { startCall } = useCall();
    const { startTeamCall, joinTeamCall, activeTeamCalls, isBusy, currentTeamCallId, joinRequestStatus } = useTeamCall();
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
            {/* Sidebar */}
            <div className={`${styles.sidebar} ${isMobile && activeTeam ? styles.mobileHidden : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.headerTop}>
                        <h2 className={styles.teamsTitle}>Équipes</h2>
                        <button onClick={() => setIsModalOpen(true)} className={styles.createBtn} title="Créer une équipe">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                    </div>
                    
                    <div className={styles.searchWrapper}>
                        <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input 
                            type="text"
                            placeholder="Rechercher une équipe..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.teamList}>
                    {filteredTeams.map(team => {
                        const bgColors = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#059669', '#0891B2'];
                        const colorIndex = team._id.charCodeAt(team._id.length - 1) % bgColors.length;
                        const bgColor = bgColors[colorIndex];

                        return (
                            <div 
                                key={team._id} 
                                className={`${styles.teamItem} ${activeTeam?._id === team._id ? styles.teamItemActive : ''}`}
                                onClick={() => openTeamChat(team)}
                            >
                                <div className={styles.teamAvatar} style={{background: bgColor}}>
                                    {team.name.substring(0, 1).toUpperCase()}
                                </div>
                                <div className={styles.teamInfo}>
                                    <div className={styles.teamName}>{team.name}</div>
                                    <div className={styles.lastMessage}>
                                        {team.members.length + 1} membre{team.members.length > 0 ? 's' : ''}
                                    </div>
                                    {team.owner && (
                                        <div className={styles.ownerInfo}>
                                            <span>Par {team.owner.firstname}</span>
                                            {team.owner.role && team.owner.role !== 'etudiant' && (
                                                <span className={`${styles.roleBadge} ${styles[team.owner.role]}`} style={{marginLeft: 6}}>
                                                    {team.owner.role}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {activeTeam?._id === team._id && (
                                    <div style={{width:8, height:8, background:'#3B82F6', borderRadius:'50%'}}></div>
                                )}
                            </div>
                        );
                    })}
                    {filteredTeams.length === 0 && (
                        <div style={{textAlign:'center', padding:20, color:'#94A3B8', fontSize:14}}>
                            Aucune équipe trouvée
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <AnimatePresence mode="wait">
                {(activeTeam || !isMobile) && (
                    <div className={styles.chatContainer} style={{display: (isMobile && !activeTeam) ? 'none' : 'flex'}}>
                        {activeTeam ? (
                             <motion.div 
                                key={activeTeam._id}
                                className={styles.chatContainer}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                 <div className={styles.chatHeader}>
                                    <div className={styles.headerActions}>
                                        <button className={`${styles.backBtn} ${!isMobile ? styles.mobileHidden : ''}`} onClick={() => setActiveTeam(null)}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                        </button>
                                        
                                        <div style={{display:'flex', flexDirection:'column'}}>
                                             <h2 className={styles.chatTitle}>{activeTeam.name}</h2>
                                             <span style={{fontSize:12, color:'#64748B'}}>{activeTeam.members.length + 1} membres</span>
                                        </div>
                                    </div>

                                     <div className={styles.headerActions}>
                                        {/* Join Call Button */}
                                         {activeTeamCalls[activeTeam._id]?.active ? (
                                            <button 
                                                className={styles.joinCallBtn}
                                                onClick={() => joinTeamCall(activeTeam._id)}
                                                disabled={isBusy || joinRequestStatus === 'pending'}
                                                title={joinRequestStatus === 'pending' ? "En attente..." : "Rejoindre l'appel"}
                                                style={{
                                                    background: joinRequestStatus === 'pending' ? '#F59E0B' : '#10B981', 
                                                    color: 'white', 
                                                    padding: '0 20px', 
                                                    borderRadius: '20px',
                                                    border: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    height: '40px',
                                                    fontWeight: 600,
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    animation: 'pulse 2s infinite'
                                                }}
                                            >
                                                {joinRequestStatus === 'pending' ? 'EN ATTENTE...' : 'REJOINDRE'}
                                                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4"></path></svg>
                                            </button>
                                         ) : (
                                             currentUser._id === activeTeam.owner._id && (
                                                 <button onClick={() => startTeamCall(activeTeam._id)} className={styles.iconBtn} title="Lancer un appel de groupe" style={{color:'#3B82F6'}}>
                                                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                                 </button>
                                             )
                                         )}
                                         
                                         <button onClick={() => setShowMembersList(!showMembersList)} className={`${styles.iconBtn} ${showMembersList ? styles.activeIconBtn : ''}`} title="Voir les membres">
                                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                         </button>
                                         
                                         {currentUser._id === activeTeam.owner._id ? (
                                             <button onClick={handleDeleteTeam} className={`${styles.iconBtn} ${styles.deleteIconBtn}`} title="Supprimer l'équipe">
                                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                             </button>
                                         ) : (
                                             <button onClick={handleLeaveTeam} className={styles.iconBtn} title="Quitter l'équipe" style={{color:'#EF4444'}}>
                                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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
                                        
                                        <div style={{overflowY:'auto', flex:1}}>
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
                                                            <div style={{display:'flex', flexDirection:'column', marginLeft:10}}>
                                                                <span style={{fontSize: '14px', fontWeight: '600', color: '#0F172A'}}>{owner.firstname}</span>
                                                                <span className={`${styles.ownerBadge} ${styles[owner.role || 'admin']}`}>PROPRIÉTAIRE</span>
                                                            </div>
                                                        </div>
                                                        {!isMe && (
                                                            <button 
                                                                onClick={() => realOwner?.is_online && startCall(realOwner)}
                                                                className={styles.iconBtn}
                                                                title={realOwner?.is_online ? "Appeler" : "Hors ligne"}
                                                                style={{opacity: realOwner?.is_online ? 1 : 0.3, color: '#3B82F6'}}
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : null;
                                            })()}

                                            {/* Members list logic reuse... */}
                                            {activeTeam.members.map(m => {
                                                const realMember = users.find(u => u._id === m._id) || m;
                                                const isMe = m._id === currentUser?._id;

                                                return (
                                                    <div key={m._id} className={styles.memberItemSmall}>
                                                        <div style={{display:'flex', alignItems:'center', flex:1}}>
                                                            <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${m._id}`} className={styles.avatarSmall} alt=""/>
                                                            <span style={{fontSize: '14px', fontWeight: '500', color: '#475569', marginLeft:10}}>{m.firstname}</span>
                                                        </div>
                                                        {currentUser._id === activeTeam.owner._id && (
                                                            <button className={styles.removeMemberBtn} onClick={() => handleRemoveMember(m._id)}>
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                 </div>
                            </motion.div>
                        ) : (
                            <div className={styles.emptyStateContainer} style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, color:'#94A3B8'}}>
                                <div style={{background:'#F1F5F9', padding:24, borderRadius:'50%', marginBottom:16}}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                </div>
                                <h3 style={{fontSize:18, fontWeight:700, color:'#1E3664', margin:0}}>Aucune équipe sélectionnée</h3>
                                <p style={{fontSize:14, margin:'8px 0'}}>Sélectionnez une équipe dans le menu pour voir les messages.</p>
                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>

            {/* Modals reuse existing logic */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Créer une équipe</h2>
                        </div>
                        <div className={styles.modalBody}>
                           <div className={styles.inputGroup}>
                                <label className={styles.label}>Nom de l'équipe</label>
                                <input type="text" className={styles.input} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Ex: Projet Web Dev" />
                           </div>
                           <div className={styles.inputGroup}>
                                <label className={styles.label}>Ajouter des membres</label>
                                <input type="text" className={styles.modalSearchInput} placeholder="Rechercher un étudiant..." value={modalSearchTerm} onChange={(e) => setModalSearchTerm(e.target.value)} />
                                <div className={styles.memberGrid}>
                                    {users.filter(u => u._id !== currentUser._id && u.firstname.toLowerCase().includes(modalSearchTerm.toLowerCase())).map(u => (
                                        <div key={u._id} className={`${styles.memberCard} ${selectedMembers.includes(u._id) ? styles.memberCardActive : ''}`} onClick={() => toggleMember(u._id)}>
                                            <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${u._id}`} className={styles.avatarSmall} alt=""/>
                                            <span style={{fontSize:13, fontWeight:600}}>{u.firstname}</span>
                                            <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                    ))}
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
            
            {/* Add Member Modal (Scoped to Chat) */}
             {isAddMemberOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                         <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Ajouter des membres</h2>
                        </div>
                        <div className={styles.modalBody}>
                            <input type="text" className={styles.modalSearchInput} placeholder="Rechercher..." value={addMemberSearchTerm} onChange={(e) => setAddMemberSearchTerm(e.target.value)} />
                            <div className={styles.memberGrid}>
                                 {potentialNewMembers.filter(u => u.firstname.toLowerCase().includes(addMemberSearchTerm.toLowerCase())).map(u => (
                                    <div key={u._id} className={`${styles.memberCard} ${addMemberIds.includes(u._id) ? styles.memberCardActive : ''}`} onClick={() => toggleAddMember(u._id)}>
                                        <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${u._id}`} className={styles.avatarSmall} alt=""/>
                                        <span style={{fontSize:13, fontWeight:600}}>{u.firstname}</span>
                                        <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setIsAddMemberOpen(false)}>Annuler</button>
                            <button className={styles.submitBtn} onClick={handleAddMembersSubmit}>Ajouter</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
