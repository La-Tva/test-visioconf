const User = require('../models/User');
const Message = require('../models/Message');

class UsersService {
    controleur;
    nomDInstance;
    io;

    listeDesMessagesEmis = [
        'users', 'user_updating status', 'user_deleting_status',
        'user_updated', 'user_deleted',
        'receive_friend_request', 'friend_request_accepted',
        'friend_removed', 'friends'
    ];
    listeDesMessagesRecus = [
        'get users', 'update user', 'delete_user',
        'friend_request', 'friend_response', 'remove_friend',
        'get friends'
    ];

    constructor(controleur, io, nom) {
        this.controleur = controleur;
        this.io = io;
        this.nomDInstance = nom || 'UsersService';
        this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
        console.log(`[${this.nomDInstance}] Service enregistré auprès du controleur`);
    }

    async traitementMessage(mesg) {
        const socketId = mesg.id;

        if (mesg['get users']) {
            await this.handleGetUsers(socketId);
        }
        else if (mesg['update user']) {
            await this.handleUpdateUser(socketId, mesg['update user']);
        }
        else if (mesg.delete_user) {
            await this.handleDeleteUser(socketId, mesg.delete_user);
        }
        else if (mesg.friend_request) {
            await this.handleFriendRequest(socketId, mesg.friend_request);
        }
        else if (mesg.friend_response) {
            await this.handleFriendResponse(socketId, mesg.friend_response);
        }
        else if (mesg.remove_friend) {
            await this.handleRemoveFriend(socketId, mesg.remove_friend);
        }
        else if (mesg['get friends']) {
            await this.handleGetFriends(socketId, mesg['get friends']);
        }
    }

    async handleGetUsers(socketId) {
        const users = await User.find({}, '-password');
        this.controleur.envoie(this, {
            users: { success: true, users },
            id: socketId
        });
    }

    async handleUpdateUser(socketId, data) {
        try {
            const { _id, ...updateFields } = data;
            const updatedUser = await User.findByIdAndUpdate(_id, updateFields, { new: true });
            if (updatedUser) {
                this.controleur.envoie(this, {
                    'user_updating status': { success: true, user: updatedUser },
                    id: socketId
                });
                // Broadcast update
                this.controleur.envoie(this, {
                    user_updated: updatedUser
                });
            } else {
                this.controleur.envoie(this, {
                    'user_updating status': { success: false, error: 'User not found' },
                    id: socketId
                });
            }
        } catch (err) {
            console.error('Update user error:', err);
            this.controleur.envoie(this, {
                'user_updating status': { success: false, error: 'Internal server error' },
                id: socketId
            });
        }
    }

    async handleDeleteUser(socketId, data) {
        const { _id } = data;
        try {
            const deletedUser = await User.findByIdAndDelete(_id);
            if (deletedUser) {
                this.controleur.envoie(this, {
                    user_deleting_status: { success: true, userId: _id },
                    id: socketId
                });
                this.controleur.envoie(this, {
                    user_deleted: { userId: _id }
                });
            } else {
                this.controleur.envoie(this, {
                    user_deleting_status: { success: false, error: 'Utilisateur non trouvé' },
                    id: socketId
                });
            }
        } catch (e) {
            console.error('Delete user error:', e);
            this.controleur.envoie(this, {
                user_deleting_status: { success: false, error: 'Erreur serveur' },
                id: socketId
            });
        }
    }

    async handleFriendRequest(socketId, data) {
        const { fromUserId, toUserId } = data;
        try {
            const targetUser = await User.findById(toUserId);
            const senderUser = await User.findById(fromUserId);

            if (targetUser && senderUser) {
                if (targetUser.friends.includes(fromUserId) || targetUser.friendRequests.includes(fromUserId)) {
                    return;
                }
                targetUser.friendRequests.push(fromUserId);
                await targetUser.save();

                // Broadcast update
                this.controleur.envoie(this, { user_updated: true });

                // Notify target if online
                if (targetUser.is_online && targetUser.socket_id) {
                    this.controleur.envoie(this, {
                        receive_friend_request: {
                            fromUser: {
                                _id: senderUser._id,
                                firstname: senderUser.firstname,
                                email: senderUser.email
                            }
                        },
                        id: targetUser.socket_id
                    });
                }
            }
        } catch (e) {
            console.error('Friend request error:', e);
        }
    }

    async handleFriendResponse(socketId, data) {
        const { userId, requesterId, accepted } = data;
        try {
            const user = await User.findById(userId);
            const requester = await User.findById(requesterId);

            if (user && requester) {
                user.friendRequests = user.friendRequests.filter(id => id.toString() !== requesterId);
                await user.save();

                this.controleur.envoie(this, { user_updated: true });

                if (accepted) {
                    user.friends.push(requesterId);
                    requester.friends.push(userId);
                    await user.save();
                    await requester.save();

                    const successMsg = {
                        friend_request_accepted: { userA: userId, userB: requesterId }
                    };

                    if (user.is_online && user.socket_id) {
                        this.controleur.envoie(this, { ...successMsg, id: user.socket_id });
                    }
                    if (requester.is_online && requester.socket_id) {
                        this.controleur.envoie(this, { ...successMsg, id: requester.socket_id });
                    }
                }
            }
        } catch (e) {
            console.error('Friend response error:', e);
        }
    }

    async handleRemoveFriend(socketId, data) {
        const { userId, friendId } = data;
        try {
            const user = await User.findById(userId);
            const friend = await User.findById(friendId);

            if (user && friend) {
                user.friends = user.friends.filter(id => id.toString() !== friendId);
                friend.friends = friend.friends.filter(id => id.toString() !== userId);
                await user.save();
                await friend.save();

                this.controleur.envoie(this, { user_updated: true });

                const response = { friend_removed: { userId, friendId } };
                this.controleur.envoie(this, { ...response, id: socketId });
                if (friend.is_online && friend.socket_id) {
                    this.controleur.envoie(this, { ...response, id: friend.socket_id });
                }
            }
        } catch (e) {
            console.error('Remove Friend Error:', e);
        }
    }

    async handleGetFriends(socketId, data) {
        const { userId } = data;
        try {
            const user = await User.findById(userId).populate('friends', 'firstname email is_online disturb_status picture role');
            if (user) {
                const friendsWithCount = await Promise.all(user.friends.map(async f => {
                    const count = await Message.countDocuments({ sender: f._id, receiver: userId, read: false });
                    return { ...f.toObject(), unreadCount: count };
                }));
                this.controleur.envoie(this, {
                    friends: { friends: friendsWithCount },
                    id: socketId
                });
            }
        } catch (e) {
            console.error('Get friends error:', e);
        }
    }
}

module.exports = UsersService;
