const User = require('../models/User');
const Message = require('../models/Message');
const Team = require('../models/Team');

class MessagesService {
    controleur;
    nomDInstance;
    io;

    listeDesMessagesEmis = [
        'receive_private_message', 'messages', 'friends', 'last_messages'
    ];
    listeDesMessagesRecus = [
        'send message', 'get messages', 'mark_messages_read', 'get_last_messages'
    ];

    constructor(controleur, io, nom) {
        this.controleur = controleur;
        this.io = io;
        this.nomDInstance = nom || 'MessagesService';
        this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
        console.log(`[${this.nomDInstance}] Service enregistré auprès du controleur`);
    }

    async traitementMessage(mesg) {
        const socketId = mesg.id;

        if (mesg['send message']) {
            await this.handleSendMessage(socketId, mesg['send message']);
        }
        else if (mesg['get messages']) {
            await this.handleGetMessages(socketId, mesg['get messages']);
        }
        else if (mesg.mark_messages_read) {
            await this.handleMarkRead(socketId, mesg.mark_messages_read);
        }
        else if (mesg.get_last_messages) {
            await this.handleGetLastMessages(socketId, mesg.get_last_messages);
        }
    }

    async handleSendMessage(socketId, data) {
        const { senderId, receiverId, content } = data;
        try {
            const newMessage = new Message({ sender: senderId, receiver: receiverId, content });
            await newMessage.save();

            // Notify receiver
            const receiver = await User.findById(receiverId);
            if (receiver && receiver.is_online && receiver.socket_id) {
                this.controleur.envoie(this, {
                    receive_private_message: newMessage,
                    id: receiver.socket_id
                });

                // Update receiver's friend list with unread counts
                const receiverFull = await User.findById(receiverId).populate('friends', 'firstname email is_online disturb_status picture role');
                if (receiverFull) {
                    const friendsWithCount = await Promise.all(receiverFull.friends.map(async f => {
                        const count = await Message.countDocuments({ sender: f._id, receiver: receiverId, read: false });
                        return { ...f.toObject(), unreadCount: count };
                    }));
                    this.controleur.envoie(this, {
                        friends: { friends: friendsWithCount },
                        id: receiver.socket_id
                    });
                }
            }

            // Notify sender (confirmation)
            const sender = await User.findById(senderId);
            if (sender && sender.is_online && sender.socket_id) {
                this.controleur.envoie(this, {
                    receive_private_message: newMessage,
                    id: sender.socket_id
                });
            }
        } catch (e) {
            console.error('Private message error:', e);
        }
    }

    async handleGetMessages(socketId, data) {
        const { userId, friendId } = data;
        try {
            await Message.updateMany(
                { sender: friendId, receiver: userId, read: false },
                { $set: { read: true } }
            );

            const messages = await Message.find({
                $or: [
                    { sender: userId, receiver: friendId },
                    { sender: friendId, receiver: userId }
                ]
            }).sort({ createdAt: 1 });

            this.controleur.envoie(this, {
                messages: { messages },
                id: socketId
            });

            // Refresh friends list for updated unread counts
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
            console.error('Get messages error:', e);
        }
    }

    async handleMarkRead(socketId, data) {
        const { userId, friendId } = data;
        try {
            await Message.updateMany(
                { sender: friendId, receiver: userId, read: false },
                { $set: { read: true } }
            );

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
            console.error('Mark messages read error:', e);
        }
    }

    async handleGetLastMessages(socketId, data) {
        const { userId } = data;
        try {
            console.log(`Getting recent conversations for ${userId}`);

            // 1. Private Messages Unread
            const unreadMessages = await Message.find({
                receiver: userId,
                read: false,
                team: { $exists: false }
            }).populate('sender', 'firstname picture role');

            const senderMap = new Map();
            unreadMessages.forEach(msg => {
                if (!msg.sender) return;
                const senderId = msg.sender._id.toString();
                if (!senderMap.has(senderId)) {
                    senderMap.set(senderId, {
                        type: 'private',
                        id: senderId,
                        name: msg.sender.firstname,
                        picture: msg.sender.picture,
                        count: 0,
                        lastMessage: msg.content,
                        timestamp: msg.createdAt
                    });
                }
                const d = senderMap.get(senderId);
                d.count++;
                if (new Date(msg.createdAt) > new Date(d.timestamp)) {
                    d.lastMessage = msg.content;
                    d.timestamp = msg.createdAt;
                }
            });

            // 2. Team Messages Unread
            const teamsWithUnread = await Team.find({
                $or: [{ owner: userId }, { members: userId }]
            });

            teamsWithUnread.forEach(team => {
                const count = team.unreadCounts ? (team.unreadCounts.get(userId) || 0) : 0;
                if (count > 0) {
                    senderMap.set(team._id.toString(), {
                        type: 'team',
                        id: team._id,
                        name: team.name,
                        picture: null,
                        count,
                        lastMessage: "Nouveaux messages",
                        timestamp: team.updatedAt
                    });
                }
            });

            const conversations = Array.from(senderMap.values())
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            this.controleur.envoie(this, {
                last_messages: { conversations },
                id: socketId
            });
        } catch (e) {
            console.error('Get recent conversations error:', e);
            this.controleur.envoie(this, {
                last_messages: { conversations: [], error: "Server Error" },
                id: socketId
            });
        }
    }
}

module.exports = MessagesService;
