const User = require('../models/User');
const Team = require('../models/Team');

class CallsService {
    controleur;
    nomDInstance;
    io;

    // Shared state (injected from server.js)
    activeCalls;       // Map: socketId -> Set of targetSocketIds
    activeGroupCalls;  // Map: teamId -> Set of { socketId, userId, user }
    pendingJoinRequests; // Map: teamId -> Set of { socketId, userId, user, timestamp }

    listeDesMessagesEmis = [
        'call-made', 'answer-made', 'ice-candidate', 'call-rejected', 'call-ended',
        'active_calls_count', 'user_call_status_changed',
        'call-made-group', 'answer-made-group', 'ice-candidate-group-relay',
        'team-call-status', 'notify-new-joiner', 'participant-left',
        'team-call-ended', 'join-request-received', 'join-request-status',
        'participant-left-notification'
    ];
    listeDesMessagesRecus = [
        'call-user', 'make-answer', 'ice-candidate', 'reject-call', 'hang-up',
        'call-team', 'get_active_calls',
        'call-peer-group', 'make-answer-group', 'ice-candidate-group',
        'leave-group-call', 'join-request-response',
        'client_deconnexion'
    ];

    constructor(controleur, io, nom, activeCalls, activeGroupCalls, pendingJoinRequests) {
        this.controleur = controleur;
        this.io = io;
        this.nomDInstance = nom || 'CallsService';
        this.activeCalls = activeCalls;
        this.activeGroupCalls = activeGroupCalls;
        this.pendingJoinRequests = pendingJoinRequests;
        this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
        console.log(`[${this.nomDInstance}] Service enregistré auprès du controleur`);
    }

    getActiveCallsCount() {
        try {
            let totalPairs = 0;
            this.activeCalls.forEach(targets => {
                if (targets && targets.size) totalPairs += targets.size;
            });
            return Math.floor(totalPairs / 2);
        } catch (e) { return 0; }
    }

    broadcastCallCount() {
        const count = this.getActiveCallsCount();
        this.controleur.envoie(this, { active_calls_count: count });
    }

    async broadcastUserCallStatus(socketId) {
        try {
            let isInCall = this.activeCalls.has(socketId);
            if (!isInCall) {
                for (const [teamId, participants] of this.activeGroupCalls) {
                    if (participants && [...participants].some(p => p.socketId === socketId)) {
                        isInCall = true;
                        break;
                    }
                }
            }
            const user = await User.findOne({ socket_id: socketId });
            if (user) {
                this.controleur.envoie(this, {
                    user_call_status_changed: { userId: user._id, isInCall }
                });
            }
        } catch (e) {
            console.error('Error in broadcastUserCallStatus:', e);
        }
    }

    async traitementMessage(mesg) {
        const socketId = mesg.id;

        if (mesg['call-user']) await this.handleCallUser(socketId, mesg['call-user']);
        else if (mesg['make-answer']) await this.handleMakeAnswer(socketId, mesg['make-answer']);
        else if (mesg['ice-candidate']) await this.handleIceCandidate(socketId, mesg['ice-candidate']);
        else if (mesg['reject-call']) await this.handleRejectCall(socketId, mesg['reject-call']);
        else if (mesg['hang-up']) await this.handleHangUp(socketId, mesg['hang-up']);
        else if (mesg['call-team']) await this.handleCallTeam(socketId, mesg['call-team']);
        else if (mesg['join-request-response']) await this.handleJoinRequestResponse(socketId, mesg['join-request-response']);
        else if (mesg['leave-group-call']) await this.handleLeaveGroupCall(socketId, mesg['leave-group-call']);
        else if (mesg['call-peer-group']) await this.handleCallPeerGroup(socketId, mesg['call-peer-group']);
        else if (mesg['make-answer-group']) await this.handleMakeAnswerGroup(socketId, mesg['make-answer-group']);
        else if (mesg['ice-candidate-group']) await this.handleIceCandidateGroup(socketId, mesg['ice-candidate-group']);
        else if (mesg.get_active_calls) await this.handleGetActiveCalls(socketId);
        else if (mesg.client_deconnexion) await this.handleDisconnect(mesg.client_deconnexion);
    }

    // --- 1-on-1 Call Handlers ---

    async handleCallUser(socketId, data) {
        const { to, offer } = data;
        try {
            const caller = await User.findOne({ socket_id: socketId });
            let targetSocketId = null;

            if (typeof to === 'string' && to.match(/^[0-9a-fA-F]{24}$/)) {
                const targetUser = await User.findById(to);
                if (targetUser && targetUser.socket_id && targetUser.is_online) {
                    targetSocketId = targetUser.socket_id;
                }
            } else {
                targetSocketId = to;
            }

            if (targetSocketId) {
                if (this.activeCalls.has(targetSocketId) && !this.activeCalls.get(targetSocketId).has(socketId)) {
                    return this.controleur.envoie(this, {
                        'call-rejected': { socket: targetSocketId, reason: 'busy' },
                        id: socketId
                    });
                }
                console.log(`Forwarding call offer from ${caller ? caller.firstname : socketId} to ${targetSocketId}`);
                this.controleur.envoie(this, {
                    'call-made': {
                        offer,
                        socket: socketId,
                        user: caller ? { firstname: caller.firstname, picture: caller.picture, _id: caller._id } : socketId
                    },
                    id: targetSocketId
                });
            }
        } catch (e) {
            console.error('Call user error:', e);
        }
    }

    async handleMakeAnswer(socketId, data) {
        const { to, answer } = data;
        try {
            const answerer = await User.findOne({ socket_id: socketId });
            console.log(`Forwarding call answer to ${to}`);

            if (!this.activeCalls.has(socketId)) this.activeCalls.set(socketId, new Set());
            if (!this.activeCalls.has(to)) this.activeCalls.set(to, new Set());
            this.activeCalls.get(socketId).add(to);
            this.activeCalls.get(to).add(socketId);
            this.broadcastCallCount();
            this.broadcastUserCallStatus(socketId);
            this.broadcastUserCallStatus(to);

            this.controleur.envoie(this, {
                'answer-made': {
                    socket: socketId,
                    answer,
                    user: answerer ? { firstname: answerer.firstname, picture: answerer.picture, _id: answerer._id } : socketId
                },
                id: to
            });
        } catch (e) {
            console.error('Make answer error:', e);
        }
    }

    async handleIceCandidate(socketId, data) {
        const { to, candidate } = data;
        if (!to) return;
        try {
            if (typeof to === 'string' && to.match(/^[0-9a-fA-F]{24}$/)) {
                const targetUser = await User.findById(to);
                if (targetUser && targetUser.socket_id) {
                    this.controleur.envoie(this, {
                        'ice-candidate': { candidate, socket: socketId },
                        id: targetUser.socket_id
                    });
                }
            } else {
                this.controleur.envoie(this, {
                    'ice-candidate': { candidate, socket: socketId },
                    id: to
                });
            }
        } catch (e) {
            console.error('ICE candidate error:', e);
        }
    }

    async handleRejectCall(socketId, data) {
        const { to } = data;
        if (!to) return;
        this.controleur.envoie(this, {
            'call-rejected': { socket: socketId },
            id: to
        });
    }

    async handleHangUp(socketId, data) {
        const { to } = data;
        if (!to) return;
        try {
            if (this.activeCalls.has(socketId)) {
                this.activeCalls.get(socketId).delete(to);
                if (this.activeCalls.get(socketId).size === 0) this.activeCalls.delete(socketId);
            }
            if (this.activeCalls.has(to)) {
                this.activeCalls.get(to).delete(socketId);
                if (this.activeCalls.get(to).size === 0) this.activeCalls.delete(to);
            }
            this.broadcastCallCount();
            this.broadcastUserCallStatus(socketId);
            this.broadcastUserCallStatus(to);

            if (typeof to === 'string' && to.match(/^[0-9a-fA-F]{24}$/)) {
                const targetUser = await User.findById(to);
                if (targetUser && targetUser.socket_id) {
                    this.controleur.envoie(this, {
                        'call-ended': { socket: socketId },
                        id: targetUser.socket_id
                    });
                }
            } else {
                this.controleur.envoie(this, {
                    'call-ended': { socket: socketId },
                    id: to
                });
            }
        } catch (e) {
            console.error('Hang up error:', e);
        }
    }

    async handleGetActiveCalls(socketId) {
        const count = this.getActiveCallsCount();
        this.controleur.envoie(this, {
            active_calls_count: count,
            id: socketId
        });
    }

    // --- Group Call Handlers ---

    async handleCallTeam(socketId, data) {
        const { teamId, offer } = data;
        try {
            const team = await Team.findById(teamId).populate('members').populate('owner');
            const caller = await User.findOne({ socket_id: socketId });

            if (team && caller) {
                const isOwner = team.owner._id.toString() === caller._id.toString();
                const isAlreadyActive = this.activeGroupCalls.has(teamId);

                if (isOwner) {
                    if (!this.activeGroupCalls.has(teamId)) {
                        this.activeGroupCalls.set(teamId, new Set());
                        this.pendingJoinRequests.set(teamId, new Set());
                    }
                    const participants = this.activeGroupCalls.get(teamId);

                    let alreadyIn = false;
                    participants.forEach(p => { if (p.socketId === socketId) alreadyIn = true; });
                    if (!alreadyIn) {
                        participants.add({
                            socketId, userId: caller._id,
                            user: { firstname: caller.firstname, picture: caller.picture, _id: caller._id }
                        });
                    }

                    console.log(`Team call STARTED by owner ${caller.firstname} for ${team.name}`);
                    const recipients = [...team.members, team.owner];
                    for (const recipient of recipients) {
                        if (recipient.socket_id && recipient.is_online) {
                            this.controleur.envoie(this, {
                                'team-call-status': {
                                    teamId: team._id, active: true,
                                    participants: Array.from(participants),
                                    ownerId: team.owner._id
                                },
                                id: recipient.socket_id
                            });
                        }
                    }
                    this.broadcastUserCallStatus(socketId);
                }
                else if (isAlreadyActive) {
                    console.log(`${caller.firstname} is REQUESTING to join call in ${team.name}`);
                    if (!this.pendingJoinRequests.has(teamId)) {
                        this.pendingJoinRequests.set(teamId, new Set());
                    }
                    const requests = this.pendingJoinRequests.get(teamId);

                    let alreadyRequested = false;
                    requests.forEach(r => { if (r.socketId === socketId) alreadyRequested = true; });
                    if (!alreadyRequested) {
                        requests.add({
                            socketId, userId: caller._id,
                            user: { firstname: caller.firstname, picture: caller.picture, _id: caller._id },
                            timestamp: Date.now()
                        });
                    }

                    if (team.owner.socket_id && team.owner.is_online) {
                        this.controleur.envoie(this, {
                            'join-request-received': {
                                teamId: team._id.toString(),
                                requester: {
                                    socketId, firstname: caller.firstname,
                                    picture: caller.picture, _id: caller._id.toString()
                                }
                            },
                            id: team.owner.socket_id
                        });
                    }

                    this.controleur.envoie(this, {
                        'join-request-status': { teamId: team._id.toString(), status: 'pending' },
                        id: socketId
                    });
                }
                else {
                    this.controleur.envoie(this, {
                        'join-request-status': { teamId: team._id.toString(), status: 'no_call' },
                        id: socketId
                    });
                }
            }
        } catch (e) {
            console.error('Call team error:', e);
        }
    }

    async handleJoinRequestResponse(socketId, data) {
        const { teamId, requesterSocketId, accepted } = data;
        console.log(`[JOIN-REQ-RESPONSE] teamId=${teamId}, requester=${requesterSocketId}, accepted=${accepted}`);
        try {
            const team = await Team.findById(teamId).populate('members').populate('owner');
            const responder = await User.findOne({ socket_id: socketId });

            if (team && responder && team.owner._id.toString() === responder._id.toString()) {
                if (this.pendingJoinRequests.has(teamId)) {
                    const requests = this.pendingJoinRequests.get(teamId);
                    let requestToRemove = null;
                    requests.forEach(r => { if (r.socketId === requesterSocketId) requestToRemove = r; });
                    if (requestToRemove) requests.delete(requestToRemove);
                }

                if (accepted) {
                    console.log(`Host ${responder.firstname} ACCEPTED join request from ${requesterSocketId}`);
                    const requester = await User.findOne({ socket_id: requesterSocketId });
                    if (requester && this.activeGroupCalls.has(teamId)) {
                        const participants = this.activeGroupCalls.get(teamId);
                        participants.add({
                            socketId: requesterSocketId, userId: requester._id,
                            user: { firstname: requester.firstname, picture: requester.picture, _id: requester._id }
                        });

                        this.controleur.envoie(this, {
                            'join-request-status': { teamId, status: 'accepted' },
                            id: requesterSocketId
                        });

                        const recipients = [...team.members, team.owner];
                        for (const recipient of recipients) {
                            if (recipient.socket_id && recipient.is_online) {
                                this.controleur.envoie(this, {
                                    'team-call-status': {
                                        teamId: team._id, active: true,
                                        participants: Array.from(participants),
                                        ownerId: team.owner._id
                                    },
                                    id: recipient.socket_id
                                });
                            }
                        }

                        // MESH: Notify existing participants to connect to new joiner
                        participants.forEach(p => {
                            if (p.socketId !== requesterSocketId) {
                                this.controleur.envoie(this, {
                                    'notify-new-joiner': {
                                        teamId: team._id.toString(),
                                        newJoinerSocketId: requesterSocketId,
                                        newJoinerUser: { firstname: requester.firstname, picture: requester.picture, _id: requester._id }
                                    },
                                    id: p.socketId
                                });
                            }
                        });

                        this.broadcastUserCallStatus(requesterSocketId);
                    }
                } else {
                    console.log(`Host ${responder.firstname} REJECTED join request from ${requesterSocketId}`);
                    this.controleur.envoie(this, {
                        'join-request-status': { teamId, status: 'rejected' },
                        id: requesterSocketId
                    });
                }
            }
        } catch (e) {
            console.error('Join request response error:', e);
        }
    }

    async handleLeaveGroupCall(socketId, data) {
        const { teamId } = data;
        if (this.activeGroupCalls.has(teamId)) {
            const participants = this.activeGroupCalls.get(teamId);
            const team = await Team.findById(teamId).populate('members').populate('owner');

            if (team) {
                const leaver = await User.findOne({ socket_id: socketId });
                const recipients = [...team.members, team.owner];

                if (leaver && team.owner._id.toString() === leaver._id.toString()) {
                    console.log(`Team Owner ${leaver.firstname} ended the call for team ${team.name}`);
                    this.activeGroupCalls.delete(teamId);

                    recipients.forEach(r => {
                        if (r && r.socket_id && r.is_online) {
                            this.controleur.envoie(this, {
                                'team-call-ended': { teamId, reason: 'owner_left' },
                                id: r.socket_id
                            });
                            this.controleur.envoie(this, {
                                'team-call-status': { teamId, active: false, participants: [] },
                                id: r.socket_id
                            });
                        }
                    });
                    this.broadcastUserCallStatus(socketId);
                    return;
                }
            }

            let userToRemove = null;
            participants.forEach(p => { if (p.socketId === socketId) userToRemove = p; });
            if (userToRemove) {
                participants.delete(userToRemove);
                console.log(`User ${userToRemove.user?.firstname || socketId} left team call ${teamId}`);

                if (team) {
                    const recipients = [...team.members, team.owner];
                    recipients.forEach(r => {
                        if (r && r.socket_id && r.is_online) {
                            this.controleur.envoie(this, {
                                'participant-left': { socket: socketId, teamId },
                                id: r.socket_id
                            });
                            this.controleur.envoie(this, {
                                'participant-left-notification': {
                                    teamId,
                                    firstname: userToRemove.user?.firstname || 'Un participant'
                                },
                                id: r.socket_id
                            });
                            this.controleur.envoie(this, {
                                'team-call-status': {
                                    teamId: team._id,
                                    active: participants.size > 0,
                                    participants: Array.from(participants),
                                    ownerId: team.owner._id
                                },
                                id: r.socket_id
                            });
                        }
                    });
                }
            }
            if (participants.size === 0) this.activeGroupCalls.delete(teamId);
        }
        this.broadcastUserCallStatus(socketId);
    }

    async handleCallPeerGroup(socketId, data) {
        const { to, offer, teamId, renegotiation } = data;
        try {
            const caller = await User.findOne({ socket_id: socketId });
            if (this.activeGroupCalls.has(teamId)) {
                console.log(`Forwarding GROUP call offer from ${socketId} to ${to} (renegotiation: ${!!renegotiation})`);
                this.controleur.envoie(this, {
                    'call-made-group': {
                        offer, socket: socketId,
                        user: caller ? { firstname: caller.firstname, picture: caller.picture, _id: caller._id } : socketId,
                        teamId, renegotiation
                    },
                    id: to
                });
            }
        } catch (e) { console.error('Call peer group error:', e); }
    }

    async handleMakeAnswerGroup(socketId, data) {
        const { to, answer } = data;
        console.log(`Forwarding GROUP answer to ${to}`);
        this.controleur.envoie(this, {
            'answer-made-group': { answer, socket: socketId },
            id: to
        });
    }

    async handleIceCandidateGroup(socketId, data) {
        const { to, candidate } = data;
        this.controleur.envoie(this, {
            'ice-candidate-group-relay': { candidate, socket: socketId },
            id: to
        });
    }

    // --- Disconnect cleanup ---
    async handleDisconnect(socketId) {
        try {
            // Cleanup group calls
            for (const [teamId, participants] of this.activeGroupCalls) {
                const userToRemove = [...participants].find(p => p.socketId === socketId);
                if (userToRemove) {
                    try {
                        const team = await Team.findById(teamId).populate('owner').populate('members');
                        if (team) {
                            const recipients = [...team.members, team.owner];
                            if (userToRemove.userId === (team.owner._id.toString() || team.owner)) {
                                this.activeGroupCalls.delete(teamId);
                                recipients.forEach(r => {
                                    if (r && r.socket_id && r.is_online && r.socket_id !== socketId) {
                                        this.controleur.envoie(this, {
                                            'team-call-ended': { teamId },
                                            id: r.socket_id
                                        });
                                    }
                                });
                            } else {
                                participants.delete(userToRemove);
                                const isActive = participants.size > 0;
                                recipients.forEach(r => {
                                    if (r && r.socket_id && r.is_online && r.socket_id !== socketId) {
                                        this.controleur.envoie(this, {
                                            'participant-left': { socket: socketId, teamId },
                                            id: r.socket_id
                                        });
                                        this.controleur.envoie(this, {
                                            'participant-left-notification': {
                                                teamId,
                                                firstname: userToRemove.user?.firstname || 'Un participant'
                                            },
                                            id: r.socket_id
                                        });
                                        this.controleur.envoie(this, {
                                            'team-call-status': {
                                                teamId: team._id, active: isActive,
                                                participants: Array.from(participants),
                                                ownerId: team.owner._id
                                            },
                                            id: r.socket_id
                                        });
                                    }
                                });
                                if (participants.size === 0) this.activeGroupCalls.delete(teamId);
                            }
                        }
                    } catch (e) {
                        console.error("[DISCONNECT] Error cleaning up group call:", e);
                    }
                }
            }

            // Cleanup 1-on-1 calls
            if (this.activeCalls.has(socketId)) {
                const targets = this.activeCalls.get(socketId);
                targets.forEach(targetId => {
                    if (this.activeCalls.has(targetId)) {
                        this.activeCalls.get(targetId).delete(socketId);
                        if (this.activeCalls.get(targetId).size === 0) this.activeCalls.delete(targetId);
                    }
                });
                this.activeCalls.delete(socketId);
                this.broadcastCallCount();
                this.broadcastUserCallStatus(socketId).catch(e => console.error(e));
            }
        } catch (err) {
            console.error('[CallsService] Fatal error in handleDisconnect:', err);
        }
    }
}

module.exports = CallsService;
