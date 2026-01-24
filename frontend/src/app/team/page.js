"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { usePreload } from '../context/PreloadContext';
import styles from './team.module.css';

export default function TeamPage() {
    const [teams, setTeams] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTeam, setActiveTeam] = useState(null);
    const [teamMessages, setTeamMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [addMemberIds, setAddMemberIds] = useState([]);
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'student', 'admin'
    const [searchTerm, setSearchTerm] = useState('');

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
    // Filter Logic
    const filteredTeams = teams.filter(team => {
        const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
        const role = team.owner?.role || 'user';
        
        if (!matchesSearch) return false;

        if (filter === 'all') return true;
        if (filter === 'student') return role !== 'admin';
        if (filter === 'admin') return role === 'admin';
        return true;
    });

    // Filter out current user from potential members
    const potentialMembers = users.filter(u => u._id !== currentUser?._id);

    // For Add Member Modal: Filter out existing members
    const potentialNewMembers = activeTeam ? users.filter(u => 
        u._id !== currentUser._id && 
        u._id !== activeTeam.owner._id &&
        !activeTeam.members.some(m => m._id === u._id)
    ) : [];

    console.log("Render TeamPage. ActiveTeam:", activeTeam?._id);

    if (activeTeam) {
        console.log("Rendering Chat View for", activeTeam.name);
        const isOwner = activeTeam.owner?._id === currentUser?._id;

        return (
            <div className={styles.container}>
                <div className={styles.chatContainer}>
                     <div className={styles.chatHeader}>
                         <button onClick={() => setActiveTeam(null)} className={styles.backBtn}>← Retour</button>
                         <h2 className={styles.chatTitle}>{activeTeam.name}</h2>
                         
                         <div style={{marginRight: '15px'}}>
                             {isOwner ? (
                                 <button onClick={handleDeleteTeam} className={styles.deleteBtn}>
                                     Supprimer
                                 </button>
                             ) : (
                                 <button onClick={handleLeaveTeam} className={styles.leaveBtn}>
                                     Quitter
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
                                                <div className={styles.senderName} style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                                    {msg.sender.firstname}
                                                    {msg.sender.role && msg.sender.role !== 'etudiant' && (
                                                        <span style={{
                                                            fontSize:'8px', 
                                                            padding:'1px 5px', 
                                                            borderRadius:'8px', 
                                                            background: msg.sender.role === 'admin' ? '#DCFCE7' : (msg.sender.role === 'enseignant' ? '#F3E8FF' : '#DBEAFE'),
                                                            color: msg.sender.role === 'admin' ? '#166534' : (msg.sender.role === 'enseignant' ? '#7E22CE' : '#1E40AF'),
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase'
                                                        }}>
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

                        <div className={styles.membersSidebar}>
                            <div className={styles.sidebarHeader}>
                                <div className={styles.membersTitle} style={{margin:0}}>Membres ({activeTeam.members.length + 1})</div>
                                {isOwner && (
                                    <button className={styles.addMemberBtn} onClick={() => setIsAddMemberOpen(true)}>
                                        Ajouter
                                    </button>
                                )}
                            </div>
                            
                            {/* Owner */}
                            <div className={styles.memberItemSmall}>
                                <img 
                                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${activeTeam.owner?.firstname || 'Owner'}`} 
                                    className={styles.avatarSmall} 
                                />
                                <span style={{fontSize: '14px', fontWeight: '500'}}>{activeTeam.owner?.firstname}</span>
                                <span className={styles.ownerBadge} style={{
                                     background: activeTeam.owner?.role === 'admin' ? '#DCFCE7' : (activeTeam.owner?.role === 'enseignant' ? '#F3E8FF' : '#DBEAFE'),
                                     color: activeTeam.owner?.role === 'admin' ? '#166534' : (activeTeam.owner?.role === 'enseignant' ? '#7E22CE' : '#1E40AF'),
                                }}>{activeTeam.owner?.role || 'PROPRIO'}</span>
                            </div>

                            {/* Members */}
                            {activeTeam.members.map(m => (
                                <div key={m._id} className={styles.memberItemSmall}>
                                    <img 
                                        src={`https://api.dicebear.com/9.x/shapes/svg?seed=${m.firstname}`}
                                        className={styles.avatarSmall} 
                                    />
                                    <span style={{fontSize: '14px', fontWeight: '500'}}>{m.firstname}</span>
                                    {m.role && m.role !== 'etudiant' && (
                                        <span style={{
                                            fontSize:'10px', marginLeft:'5px', padding:'2px 6px', borderRadius:'10px',
                                            background: m.role === 'admin' ? '#DCFCE7' : (m.role === 'enseignant' ? '#F3E8FF' : '#DBEAFE'),
                                            color: m.role === 'admin' ? '#166534' : (m.role === 'enseignant' ? '#7E22CE' : '#1E40AF'),
                                            fontWeight: 700, textTransform: 'uppercase'
                                        }}>
                                            {m.role}
                                        </span>
                                    )}
                                    {isOwner && (
                                        <button 
                                            className={styles.removeMemberBtn} 
                                            title="Retirer le membre"
                                            onClick={() => handleRemoveMember(m._id)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2 2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                     </div>
                </div>

                {/* Add Member Modal */}
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
                                                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user.firstname}`}
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
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.mainContent}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Mes Équipes</h1>
                    <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
                        + Créer une équipe
                    </button>
                </div>

                <div className={styles.filterContainer}>
                    <div className={styles.filterActions}>
                        <span style={{marginRight: '10px', color:'#64748B', fontSize:'14px'}}>Filtrer par créateur:</span>
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
                    
                    <input 
                        type="text" 
                        placeholder="Rechercher une équipe..." 
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className={styles.grid}>
                    {filteredTeams.map(team => {
                         const unread = team.unreadCounts && currentUser 
                                        ? (team.unreadCounts[currentUser._id] || 0) 
                                        : 0;
                         const roleLabel = (team.owner?.role === 'admin') ? 'Admin' : 'Étudiant';
                         
                         return (
                            <div key={team._id} className={styles.teamCard} onClick={() => openTeamChat(team)}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                    <div className={styles.teamName}>{team.name}</div>
                                    {unread > 0 && (
                                        <div style={{
                                            backgroundColor: '#EF4444', color: 'white', 
                                            borderRadius: '50%', width: '20px', height: '20px', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: 'bold'
                                        }}>
                                            {unread}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.memberCount}>{team.members.length + 1} membres</div>
                                
                                <div style={{fontSize: '12px', color: '#64748B', marginBottom: '15px'}}>
                                    Créé par : <span style={{fontWeight:'600'}}>{team.owner?.firstname || 'Inconnu'}</span> 
                                    <span style={{
                                        marginLeft: '6px', 
                                        background: team.owner?.role === 'admin' ? '#DCFCE7' : (team.owner?.role === 'enseignant' ? '#F3E8FF' : '#DBEAFE'),
                                        color: team.owner?.role === 'admin' ? '#166534' : (team.owner?.role === 'enseignant' ? '#7E22CE' : '#2563EB'),
                                        padding: '2px 6px', borderRadius: '4px', fontSize:'10px', fontWeight:'700',
                                        textTransform: 'uppercase'
                                    }}>
                                        {team.owner?.role || 'USER'}
                                    </span>
                                </div>

                                <div className={styles.avatars}>
                                    {/* Owner Avatar */}
                                    <img 
                                        src={`https://api.dicebear.com/9.x/shapes/svg?seed=${team.owner?.firstname || 'Owner'}`} 
                                        className={styles.avatar} 
                                        title={`Propriétaire: ${team.owner?.firstname}`}
                                    />
                                    {team.members.map(m => (
                                        <img 
                                            key={m._id}
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${m.firstname}`}
                                            className={styles.avatar}
                                            title={m.firstname}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {teams.length === 0 && (
                        <p style={{color: '#64748B'}}>Vous n'êtes dans aucune équipe.</p>
                    )}
                </div>
            </div>

            {/* Create Modal */}
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
                                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user.firstname}`}
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
                            <button className={styles.submitBtn} onClick={handleCreateTeam}>Créer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
