const User = require('../models/User');
const Message = require('../models/Message');
const Team = require('../models/Team');

class TeamsService {
    controleur;
    nomDInstance;
    io;

    listeDesMessagesEmis = [
        'team_creating_status', 'teams', 'receive_team_message',
        'team_messages', 'leave_team_status', 'team_deleting_status',
        'team_updating_status'
    ];
    listeDesMessagesRecus = [
        'create team', 'get teams', 'team_message', 'get_team_messages',
        'leave_team', 'delete team', 'add_team_member', 'remove_team_member'
    ];

    // Shared state for active group calls (injected)
    activeGroupCalls;

    constructor(controleur, io, nom, activeGroupCalls) {
        this.controleur = controleur;
        this.io = io;
        this.nomDInstance = nom || 'TeamsService';
        this.activeGroupCalls = activeGroupCalls || new Map();
        this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
        console.log(`[${this.nomDInstance}] Service enregistré auprès du controleur`);
    }

    async traitementMessage(mesg) {
        const socketId = mesg.id;

        if (mesg['create team']) {
            await this.handleCreateTeam(socketId, mesg['create team']);
        }
        else if (mesg['get teams']) {
            await this.handleGetTeams(socketId, mesg['get teams']);
        }
        else if (mesg.team_message) {
            await this.handleTeamMessage(socketId, mesg.team_message);
        }
        else if (mesg.get_team_messages) {
            await this.handleGetTeamMessages(socketId, mesg.get_team_messages);
        }
        else if (mesg.leave_team) {
            await this.handleLeaveTeam(socketId, mesg.leave_team);
        }
        else if (mesg['delete team']) {
            await this.handleDeleteTeam(socketId, mesg['delete team']);
        }
        else if (mesg.add_team_member) {
            await this.handleAddMember(socketId, mesg.add_team_member);
        }
        else if (mesg.remove_team_member) {
            await this.handleRemoveMember(socketId, mesg.remove_team_member);
        }
    }

    async handleCreateTeam(socketId, data) {
        const { name, ownerId, memberIds } = data;
        try {
            const newTeam = new Team({ name, owner: ownerId, members: memberIds, unreadCounts: {} });
            await newTeam.save();
            await newTeam.populate([
                { path: 'members', select: 'firstname email is_online picture role' },
                { path: 'owner', select: 'firstname role picture' }
            ]);

            this.controleur.envoie(this, {
                team_creating_status: { success: true, team: newTeam },
                id: socketId
            });
        } catch (e) {
            console.error('Create team error:', e);
        }
    }

    async handleGetTeams(socketId, data) {
        const { userId } = data;
        try {
            const teams = await Team.find({
                $or: [{ owner: userId }, { members: userId }]
            }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role picture');

            this.controleur.envoie(this, {
                teams: { teams },
                id: socketId
            });
        } catch (e) {
            console.error('Get my teams error:', e);
        }
    }

    async handleTeamMessage(socketId, data) {
        const { senderId, teamId, content } = data;
        try {
            const newMessage = new Message({ sender: senderId, team: teamId, content, read: true });
            await newMessage.save();
            await newMessage.populate('sender', 'firstname picture role');

            const team = await Team.findById(teamId).populate('members');
            if (team) {
                const recipientIds = new Set([team.owner._id.toString(), ...team.members.map(m => m._id.toString())]);

                // Update unread counts
                let updated = false;
                for (const userId of recipientIds) {
                    if (userId !== senderId) {
                        let currentCount = 0;
                        if (typeof team.unreadCounts.get === 'function') {
                            currentCount = team.unreadCounts.get(userId) || 0;
                            team.unreadCounts.set(userId, currentCount + 1);
                        } else {
                            currentCount = team.unreadCounts[userId] || 0;
                            team.unreadCounts[userId] = currentCount + 1;
                        }
                        updated = true;
                    }
                }
                if (updated) await team.save();

                for (const userId of recipientIds) {
                    const user = await User.findById(userId);
                    if (user && user.is_online && user.socket_id) {
                        // Send message
                        this.controleur.envoie(this, {
                            receive_team_message: { message: newMessage, teamId },
                            id: user.socket_id
                        });

                        // Send updated team list for unread badges (skip sender)
                        if (userId !== senderId) {
                            const myTeams = await Team.find({
                                $or: [{ owner: userId }, { members: userId }]
                            }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role picture');
                            this.controleur.envoie(this, {
                                teams: { teams: myTeams },
                                id: user.socket_id
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Team message error:', e);
        }
    }

    async handleGetTeamMessages(socketId, data) {
        const { teamId, userId } = data;
        try {
            // Join socket room (we need io directly for room management)
            const sockets = await this.io.fetchSockets();
            const targetSocket = sockets.find(s => s.id === socketId);
            if (targetSocket) targetSocket.join(teamId);
            console.log(`Socket ${socketId} joined room ${teamId} via get_team_messages`);

            const messages = await Message.find({ team: teamId })
                .sort({ createdAt: 1 })
                .populate('sender', 'firstname picture role');

            // Clear unread count for this user
            if (userId) {
                const team = await Team.findById(teamId);
                if (team && team.unreadCounts) {
                    if (typeof team.unreadCounts.set === 'function') {
                        team.unreadCounts.set(userId, 0);
                    } else {
                        team.unreadCounts[userId] = 0;
                    }
                    await team.save();

                    // Send updated team list (to clear bubble in sidebar)
                    const myTeams = await Team.find({
                        $or: [{ owner: userId }, { members: userId }]
                    }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role picture');
                    this.controleur.envoie(this, {
                        teams: { teams: myTeams },
                        id: socketId
                    });
                }
            }

            // Check if there's an active call for this team
            if (this.activeGroupCalls.has(teamId)) {
                const participants = this.activeGroupCalls.get(teamId);
                this.controleur.envoie(this, {
                    'team-call-status': {
                        teamId, active: true,
                        participants: Array.from(participants)
                    },
                    id: socketId
                });
            }

            this.controleur.envoie(this, {
                team_messages: { teamId, messages },
                id: socketId
            });
        } catch (e) {
            console.error('Get team messages error:', e);
        }
    }

    async handleLeaveTeam(socketId, data) {
        const { teamId, userId } = data;
        try {
            const team = await Team.findById(teamId);
            if (team) {
                team.members = team.members.filter(m => m.toString() !== userId);
                team.unreadCounts.delete(userId);
                await team.save();

                // Notify the leaver
                const user = await User.findById(userId);
                if (user && user.is_online && user.socket_id) {
                    const myTeams = await Team.find({
                        $or: [{ owner: userId }, { members: userId }]
                    }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
                    this.controleur.envoie(this, {
                        teams: { teams: myTeams },
                        leave_team_status: { success: true, teamId },
                        id: user.socket_id
                    });
                }

                // Notify remaining members
                const remainingIds = [team.owner.toString(), ...team.members.map(m => m.toString())];
                for (const rid of remainingIds) {
                    const rUser = await User.findById(rid);
                    if (rUser && rUser.is_online && rUser.socket_id) {
                        const rTeams = await Team.find({
                            $or: [{ owner: rid }, { members: rid }]
                        }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
                        this.controleur.envoie(this, {
                            teams: { teams: rTeams },
                            id: rUser.socket_id
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Leave team error:', e);
        }
    }

    async handleDeleteTeam(socketId, data) {
        const { teamId, userId } = data;
        try {
            const team = await Team.findById(teamId);
            if (team && team.owner.toString() === userId) {
                const allMemberIds = [team.owner.toString(), ...team.members.map(m => m.toString())];
                await Team.findByIdAndDelete(teamId);
                await Message.deleteMany({ team: teamId });

                for (const memberId of allMemberIds) {
                    const user = await User.findById(memberId);
                    if (user && user.is_online && user.socket_id) {
                        const myTeams = await Team.find({
                            $or: [{ owner: memberId }, { members: memberId }]
                        }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
                        this.controleur.envoie(this, {
                            teams: { teams: myTeams },
                            team_deleting_status: { success: true, teamId },
                            id: user.socket_id
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Delete team error:', e);
        }
    }

    async handleAddMember(socketId, data) {
        const { teamId, userId, newMemberIds } = data;
        try {
            const team = await Team.findById(teamId);
            if (team && team.owner.toString() === userId) {
                const existingMembers = team.members.map(m => m.toString());
                const toAdd = newMemberIds.filter(id => !existingMembers.includes(id) && id !== team.owner.toString());

                if (toAdd.length > 0) {
                    team.members.push(...toAdd);
                    toAdd.forEach(id => team.unreadCounts.set(id, 0));
                    await team.save();

                    const allMemberIds = [team.owner.toString(), ...team.members.map(m => m.toString())];
                    for (const memberId of allMemberIds) {
                        const user = await User.findById(memberId);
                        if (user && user.is_online && user.socket_id) {
                            const myTeams = await Team.find({
                                $or: [{ owner: memberId }, { members: memberId }]
                            }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
                            this.controleur.envoie(this, {
                                teams: { teams: myTeams },
                                team_updating_status: { success: true, teamId },
                                id: user.socket_id
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Add team member error:', e);
        }
    }

    async handleRemoveMember(socketId, data) {
        const { teamId, userId, memberIdToRemove } = data;
        try {
            const team = await Team.findById(teamId);
            if (team && team.owner.toString() === userId) {
                if (team.members.map(m => m.toString()).includes(memberIdToRemove)) {
                    const removedUser = await User.findById(memberIdToRemove);

                    team.members = team.members.filter(m => m.toString() !== memberIdToRemove);
                    team.unreadCounts.delete(memberIdToRemove);
                    await team.save();

                    // Notify removed user
                    if (removedUser && removedUser.is_online && removedUser.socket_id) {
                        const rTeams = await Team.find({
                            $or: [{ owner: memberIdToRemove }, { members: memberIdToRemove }]
                        }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
                        this.controleur.envoie(this, {
                            teams: { teams: rTeams },
                            team_updating_status: { success: true, teamId, removed: true },
                            id: removedUser.socket_id
                        });
                    }

                    // Notify remaining members
                    const allMemberIds = [team.owner.toString(), ...team.members.map(m => m.toString())];
                    for (const memberId of allMemberIds) {
                        const user = await User.findById(memberId);
                        if (user && user.is_online && user.socket_id) {
                            const myTeams = await Team.find({
                                $or: [{ owner: memberId }, { members: memberId }]
                            }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
                            this.controleur.envoie(this, {
                                teams: { teams: myTeams },
                                team_updating_status: { success: true, teamId },
                                id: user.socket_id
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Remove team member error:', e);
        }
    }
}

module.exports = TeamsService;
