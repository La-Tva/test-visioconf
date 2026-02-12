require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const File = require('./models/File');
const Space = require('./models/Space');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for Vercel deployment
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());

// Database Connection
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/visioconf';
console.log('Connecting to MongoDB at:', mongoURI);
mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Call Tracking
const activeCalls = new Map(); // socketId -> Set of targetSocketIds
const activeGroupCalls = new Map(); // teamId -> Set of { socketId, userId, user }
const pendingJoinRequests = new Map(); // teamId -> Set of { socketId, userId, user, timestamp }

function getActiveCallsCount() {
    try {
        let totalPairs = 0;
        activeCalls.forEach(targets => {
            if (targets && targets.size) totalPairs += targets.size;
        });
        return Math.floor(totalPairs / 2);
    } catch (e) {
        return 0;
    }
}

function broadcastCallCount() {
    const count = getActiveCallsCount();
    io.emit('message', JSON.stringify({ active_calls_count: count }));
}

async function broadcastUserCallStatus(socketId) {
    try {
        let isInCall = activeCalls.has(socketId);
        
        // Also check group calls
        if (!isInCall) {
            for (const [teamId, participants] of activeGroupCalls) {
                if (participants && [...participants].some(p => p.socketId === socketId)) {
                    isInCall = true;
                    break;
                }
            }
        }

        const User = require('./models/User');
        const user = await User.findOne({ socket_id: socketId });
        if (user) {
            io.emit('message', JSON.stringify({ 
                user_call_status_changed: { 
                    userId: user._id, 
                    isInCall: isInCall 
                } 
            }));
        }
    } catch (e) {
        console.error('Error in broadcastUserCallStatus:', e);
    }
}

async function broadcastUserOnlineStatus(userId, is_online) {
    try {
        io.emit('message', JSON.stringify({
            user_status_changed: {
                userId: userId,
                is_online: is_online
            }
        }));
    } catch (e) {
        console.error('Error in broadcastUserOnlineStatus:', e);
    }
}

// REST API Endpoints for SWR
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/friends/:userId', async (req, res) => {
    try {
        const Message = require('./models/Message');
        const user = await User.findById(req.params.userId).populate('friends', 'firstname email is_online disturb_status picture role');
        if (user) {
            const friendsWithCount = await Promise.all(user.friends.map(async f => {
                const count = await Message.countDocuments({ sender: f._id, receiver: req.params.userId, read: false });
                return { ...f.toObject(), unreadCount: count };
            }));
            res.json(friendsWithCount);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/teams/:userId', async (req, res) => {
    try {
        const Team = require('./models/Team');
        const teams = await Team.find({
            $or: [{ owner: req.params.userId }, { members: req.params.userId }]
        }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role picture');
        res.json(teams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/conversations/recent/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const Message = require('./models/Message');
        const User = require('./models/User');
        const Team = require('./models/Team');

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
            const data = senderMap.get(senderId);
            data.count++;
            if (new Date(msg.createdAt) > new Date(data.timestamp)) {
                data.lastMessage = msg.content;
                data.timestamp = msg.createdAt;
            }
        });

        const teamsWithUnread = await Team.find({
            $or: [{ owner: userId }, { members: userId }]
        });

        teamsWithUnread.forEach(team => {
            let count = 0;
            if (team.unreadCounts) {
                if (typeof team.unreadCounts.get === 'function') {
                    count = team.unreadCounts.get(userId) || 0;
                } else {
                    count = team.unreadCounts[userId] || 0;
                }
            }
            if (count > 0) {
                senderMap.set(team._id.toString(), {
                    type: 'team',
                    id: team._id,
                    name: team.name,
                    picture: null,
                    count: count,
                    lastMessage: "Nouveaux messages",
                    timestamp: team.updatedAt
                });
            }
        });

        const conversations = Array.from(senderMap.values())
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(conversations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/calls/active/count', (req, res) => {
    try {
        const count = getActiveCallsCount();
        res.json({ count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('message', async (messageRaw) => {
        try {
            const message = JSON.parse(messageRaw);
            console.log('Received message keys:', Object.keys(message));

            // Handle Login
            if (message.login) {
                 const { email, password } = message.login;
                 const user = await User.findOne({ email, password });
                 
                 if (user) {
                     // Update socket_id and status
                     user.socket_id = socket.id;
                     user.is_online = true;
                     user.last_connection = Date.now();
                     await user.save();
                     
                     // Populate friendRequests to ensure recipient sees them on login
                     await user.populate('friendRequests', 'firstname email picture role');

                     broadcastUserOnlineStatus(user._id, true);
 
                     socket.emit('message', JSON.stringify({
                         login_status: {
                             success: true,
                             user: user
                         }
                     }));
                 } else {
                     socket.emit('message', JSON.stringify({
                         login_status: {
                             success: false,
                             error: 'Invalid credentials'
                         }
                     }));
                 }
            }
            // Handle Identification (Lighter check than login)
            else if (message.authenticate) {
                const { _id } = message.authenticate;
                try {
                    const user = await User.findById(_id);
                    if (user) {
                        user.socket_id = socket.id;
                        user.is_online = true;
                        user.last_connection = Date.now();
                        await user.save();
                        console.log(`User ${_id} (${user.firstname}) identified. Socket: ${socket.id}`);
                        broadcastUserOnlineStatus(_id, true);
                    }
                } catch (e) {
                    console.error('Identification error:', e);
                }
            }
            // Handle Registration
            else if (message.register) {
                try {
                    const { firstname, email, password } = message.register;
                    const existingUser = await User.findOne({ email });

                    if (existingUser) {
                        socket.emit('message', JSON.stringify({
                            registration_status: {
                                success: false,
                                error: 'Cet email est déjà utilisé'
                            }
                        }));
                    } else {
                        const newUser = new User({
                            firstname,
                            email,
                            password,
                            role: 'etudiant',
                            is_online: true,
                            socket_id: socket.id,
                            last_connection: Date.now()
                        });
                        await newUser.save();

                         socket.emit('message', JSON.stringify({
                            registration_status: {
                                success: true,
                                user: newUser
                            }
                        }));
                        
                        // BROADCAST NEW USER
                        io.emit('message', JSON.stringify({
                            user_registered: newUser
                        }));
                    }
                } catch (err) {
                    console.error('Registration error:', err);
                    socket.emit('message', JSON.stringify({
                        registration_status: {
                            success: false,
                            error: 'Erreur lors de la création du compte. Veuillez réessayer.'
                        }
                    }));
                }
            }
            // Handle Update User
            else if (message['update user']) {
                const { _id, ...updates } = message['update user'];
                try {
                    // Filter allowed updates to prevent overwriting sensitive fields like password without checks
                    const allowedUpdates = ['firstname', 'disturb_status', 'phone', 'desc', 'role'];
                    const dataToUpdate = {};
                    
                    Object.keys(updates).forEach(key => {
                        if (allowedUpdates.includes(key)) {
                            dataToUpdate[key] = updates[key];
                        }
                    });

                    const updatedUser = await User.findByIdAndUpdate(
                        _id, 
                        dataToUpdate, 
                        { new: true } // Return the updated document
                    );

                    if (updatedUser) {
                         socket.emit('message', JSON.stringify({
                            'user_updating status': {
                                success: true,
                                user: updatedUser
                            }
                        }));
                        
                        // BROADCAST UPDATE
                        io.emit('message', JSON.stringify({
                            user_updated: updatedUser
                        }));
                    } else {
                        socket.emit('message', JSON.stringify({
                            'user_updating status': {
                                success: false,
                                error: 'User not found'
                            }
                        }));
                    }
                } catch (err) {
                    console.error('Update user error:', err);
                    socket.emit('message', JSON.stringify({
                        'user_updating status': {
                            success: false,
                            error: 'Internal server error'
                        }
                    }));
                }
            }
            // Handle Authentication (Reconnect without password)
            else if (message.authenticate) {
                const { _id } = message.authenticate;
                console.log(`Identify request for ${_id}`);
                try {
                    const user = await User.findById(_id).populate('friendRequests', 'firstname email');
                    if (user) {
                        user.socket_id = socket.id;
                        user.is_online = true;
                        // Preserve disturb_status if it exists, or default to available if not present
                        // user.disturb_status = user.disturb_status || 'available'; 
                        await user.save();
                        console.log(`User ${_id} identified and set online. Socket: ${socket.id}`);

                        broadcastUserOnlineStatus(_id, true);
                        
                        socket.emit('message', JSON.stringify({
                            'auth status': {
                                success: true,
                                user: user
                            }
                        }));
                        
                        // Optional: Broadcast to others that this user is online?
                        // For now, other clients pull via get_users polling.
                    } else {
                        console.log(`User ${_id} not found for identification`);
                    }
                } catch (e) {
                    console.error('Identify error:', e);
                }
            }
            // Handle Delete User (Hard Delete)
            else if (message.delete_user) {
                const { _id } = message.delete_user;
                try {
                    const deletedUser = await User.findByIdAndDelete(_id);

                    if (deletedUser) {
                        socket.emit('message', JSON.stringify({
                            user_deleting_status: {
                                success: true,
                                userId: _id
                            }
                        }));

                        // BROADCAST DELETION
                        io.emit('message', JSON.stringify({
                            user_deleted: { userId: _id }
                        }));
                    } else {
                        socket.emit('message', JSON.stringify({
                            user_deleting_status: {
                                success: false,
                                error: 'Utilisateur non trouvé'
                            }
                        }));
                    }
                } catch (e) {
                    console.error('Delete user error:', e);
                    socket.emit('message', JSON.stringify({
                        user_deleting_status: {
                            success: false,
                            error: 'Erreur serveur'
                        }
                    }));
                }
            }
            // Handle Get Users (Admin)
            else if (message['get users']) {
                 // In production: Verify if socket.id belongs to an admin user
                 const users = await User.find({}, '-password'); // Exclude password
                 socket.emit('message', JSON.stringify({
                     users: {
                         success: true,
                         users: users
                     }
                 }));
            }
            else if (message.friend_request) {
                const { fromUserId, toUserId } = message.friend_request;
                try {
                    const targetUser = await User.findById(toUserId);
                    const senderUser = await User.findById(fromUserId);

                    if (targetUser && senderUser) {
                        // Check if already friends or requested
                        if (targetUser.friends.includes(fromUserId) || targetUser.friendRequests.includes(fromUserId)) {
                             // Already requested or friends
                             return;
                        }

                        targetUser.friendRequests.push(fromUserId);
                        await targetUser.save();

                        // Broadast update to everyone so SWR refreshes
                        io.emit('message', JSON.stringify({ user_updated: true }));

                        // Notify target if online
                        if (targetUser.is_online && targetUser.socket_id) {
                            io.to(targetUser.socket_id).emit('message', JSON.stringify({
                                receive_friend_request: {
                                    fromUser: {
                                        _id: senderUser._id,
                                        firstname: senderUser.firstname,
                                        email: senderUser.email
                                    }
                                }
                            }));
                        }
                    }
                } catch (e) {
                    console.error('Friend request error:', e);
                }
            }
            else if (message.remove_friend) {
                const { userId, friendId } = message.remove_friend;
                try {
                    const user = await User.findById(userId);
                    const friend = await User.findById(friendId);

                    if (user && friend) {
                         user.friends = user.friends.filter(id => id.toString() !== friendId);
                         friend.friends = friend.friends.filter(id => id.toString() !== userId);
                         
                          await user.save();
                          await friend.save();

                          // Broadast update to everyone
                          io.emit('message', JSON.stringify({ user_updated: true }));

                          // Notify both
                          const response = {
                              friend_removed: {
                                  userId,
                                  friendId
                              }
                          };
                          
                          socket.emit('message', JSON.stringify(response));
                          if (friend.is_online && friend.socket_id) {
                              io.to(friend.socket_id).emit('message', JSON.stringify(response));
                          }
                    }
                } catch(e) {
                    console.error('Remove Friend Error:', e);
                }
            }
            // Handle Friend Response
            else if (message.friend_response) {
                const { userId, requesterId, accepted } = message.friend_response;
                try {
                    const user = await User.findById(userId);
                    const requester = await User.findById(requesterId);

                    if (user && requester) {
                        // Remove request
                        user.friendRequests = user.friendRequests.filter(id => id.toString() !== requesterId);
                        await user.save();

                        // Broadast update to everyone
                        io.emit('message', JSON.stringify({ user_updated: true }));

                        if (accepted) {
                            // Add to friends for both
                            user.friends.push(requesterId);
                            requester.friends.push(userId);
                            await user.save();
                            await requester.save();

                            // Notify both
                            const successMsg = {
                                friend_request_accepted: {
                                    userA: userId,
                                    userB: requesterId
                                }
                            };
                            
                            if (user.is_online && user.socket_id) {
                                io.to(user.socket_id).emit('message', JSON.stringify(successMsg));
                            }
                            if (requester.is_online && requester.socket_id) {
                                io.to(requester.socket_id).emit('message', JSON.stringify(successMsg));
                            }
                        }
                    }
                } catch (e) {
                     console.error('Friend response error:', e);
                }
            }
            // Handle Private Message
            else if (message['send message']) {
                 const { senderId, receiverId, content } = message['send message'];
                 try {
                     const Message = require('./models/Message'); // Lazy require
                     const newMessage = new Message({
                         sender: senderId,
                         receiver: receiverId,
                         content: content
                     });
                     await newMessage.save();

                     // Notify Receiver
                     const receiver = await User.findById(receiverId);
                     if (receiver && receiver.is_online && receiver.socket_id) {
                         io.to(receiver.socket_id).emit('message', JSON.stringify({
                             receive_private_message: newMessage
                         }));

                         // Update Receiver's friend list with new unread count
                        const receiverFriends = await User.findById(receiverId).populate('friends', 'firstname email is_online disturb_status picture role');
                         if(receiverFriends) {
                            const friendsWithCount = await Promise.all(receiverFriends.friends.map(async f => {
                                 const count = await Message.countDocuments({ sender: f._id, receiver: receiverId, read: false });
                                 return { ...f.toObject(), unreadCount: count };
                            }));
                            
                            console.log(`Sending updated friend list to receiver ${receiver.firstname} (${receiver.socket_id}) with ${friendsWithCount.length} friends.`);
                            io.to(receiver.socket_id).emit('message', JSON.stringify({
                                friends: {
                                    friends: friendsWithCount
                                }
                            }));
                         }
                     } else {
                         console.log(`Receiver ${receiverId} not found, offline, or no socket_id.`);
                     }
                     // Notify Sender (confirmation)
                     const sender = await User.findById(senderId);
                     if(sender && sender.is_online && sender.socket_id) {
                         io.to(sender.socket_id).emit('message', JSON.stringify({
                             receive_private_message: newMessage
                         }));
                     }

                 } catch (e) {
                     console.error('Private message error:', e);
                 }
            }
            // Get Messages History
            else if (message['get messages']) {
                const { userId, friendId } = message['get messages'];
                try {
                     const Message = require('./models/Message');
                     
                     // Mark messages as read
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

                     socket.emit('message', JSON.stringify({
                         messages: {
                             messages: messages
                         }
                     }));

                     // Refresh friends list to update unread counts (badges)
                     // Re-use Logic from get_friends
                    const user = await User.findById(userId).populate('friends', 'firstname email is_online disturb_status picture role');
                     if(user) {
                          const friendsWithCount = await Promise.all(user.friends.map(async f => {
                               const count = await Message.countDocuments({ sender: f._id, receiver: userId, read: false });
                               return { ...f.toObject(), unreadCount: count };
                          }));

                          socket.emit('message', JSON.stringify({
                              friends: {
                                  friends: friendsWithCount
                              }
                          }));
                     }

                } catch (e) {
                    console.error('Get messages error:', e);
                }
            }
            // Get Friends List
            else if (message['get friends']) {
                // Return populated friends with unread message counts
                const { userId } = message['get friends'];
                try {
                    const Message = require('./models/Message');
                    const user = await User.findById(userId).populate('friends', 'firstname email is_online disturb_status picture role');
                    
                    if(user) {
                         const friendsWithCount = await Promise.all(user.friends.map(async f => {
                              const count = await Message.countDocuments({ sender: f._id, receiver: userId, read: false });
                              return { ...f.toObject(), unreadCount: count };
                         }));

                         socket.emit('message', JSON.stringify({
                             friends: {
                                 friends: friendsWithCount
                             }
                         }));
                    }
                } catch (e) {
                    console.error('Get friends error:', e);
                }
            }
            
            // Mark messages as read explicitly
            else if (message.mark_messages_read) {
                const { userId, friendId } = message.mark_messages_read;
                try {
                    const Message = require('./models/Message');
                    
                    // Mark all messages from friendId to userId as read
                    await Message.updateMany(
                        { sender: friendId, receiver: userId, read: false },
                        { $set: { read: true } }
                    );
                    
                    // Send updated friends list with corrected unread counts
                    const user = await User.findById(userId).populate('friends', 'firstname email is_online disturb_status picture role');
                    if(user) {
                        const friendsWithCount = await Promise.all(user.friends.map(async f => {
                            const count = await Message.countDocuments({ sender: f._id, receiver: userId, read: false });
                            return { ...f.toObject(), unreadCount: count };
                        }));
                        
                        socket.emit('message', JSON.stringify({
                            friends: {
                                friends: friendsWithCount
                            }
                        }));
                    }
                } catch (e) {
                    console.error('Mark messages read error:', e);
                }
            }

            // Get Recent Conversations (Home Page)
            else if (message.get_last_messages) {
                const { userId } = message.get_last_messages;
                try {
                
                    console.log(`Getting recent conversations for ${userId}`);
                    const Message = require('./models/Message');
                    const User = require('./models/User');
                    const Team = require('./models/Team'); // ADDED

                    // 1. Private Messages Unread
                    const unreadMessages = await Message.find({
                        receiver: userId,
                        read: false,
                        team: { $exists: false } // Only private messages
                    }).populate('sender', 'firstname picture role');

                    // Group by sender
                    const senderMap = new Map();
                    unreadMessages.forEach(msg => {
                         if (!msg.sender) return; // Skip if sender is deleted/null
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
                         const data = senderMap.get(senderId);
                         data.count++;
                         // Keep latest message
                         if (new Date(msg.createdAt) > new Date(data.timestamp)) {
                             data.lastMessage = msg.content;
                             data.timestamp = msg.createdAt;
                         }
                    });

                    // 2. Team Messages Unread (ADDED)
                    const teamsWithUnread = await Team.find({
                        $or: [ { owner: userId }, { members: userId } ]
                    });

                    teamsWithUnread.forEach(team => {
                        const count = team.unreadCounts ? (team.unreadCounts.get(userId) || 0) : 0;
                        if (count > 0) {
                            senderMap.set(team._id.toString(), {
                                type: 'team',
                                id: team._id,
                                name: team.name, // Team Name
                                picture: null, // Could add team icon logic later
                                count: count,
                                lastMessage: "Nouveaux messages", // Simplified for now
                                timestamp: team.updatedAt // Use team update time
                            });
                        }
                    });

                    console.log(`Found ${senderMap.size} conversations with unread messages.`);

                    const conversations = Array.from(senderMap.values())
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                    console.log(`Sending ${conversations.length} conversations.`);

                    socket.emit('message', JSON.stringify({
                        last_messages: {
                           conversations: conversations
                        }
                    }));

                } catch (e) {
                    console.error('Get recent conversations error:', e);
                    // Send empty list + error to safely handle on client
                     socket.emit('message', JSON.stringify({
                        last_messages: {
                           conversations: [],
                           error: "Server Error"
                        }
                    }));
                }
            }
            // Handle Create Team
            else if (message['create team']) {
               // ... existing code
                const { name, ownerId, memberIds } = message['create team'];
                try {
                    const Team = require('./models/Team');
                    const newTeam = new Team({
                        name,
                        owner: ownerId,
                        members: memberIds,
                        unreadCounts: {}
                    });
                    await newTeam.save();

                    // Populate members and owner for response
                    await newTeam.populate([
                        { path: 'members', select: 'firstname email is_online picture role' },
                        { path: 'owner', select: 'firstname role picture' }
                    ]);
                    
                    const response = {
                        team_creating_status: {
                            success: true,
                            team: newTeam
                        }
                    };
                    
                    socket.emit('message', JSON.stringify(response));
                } catch (e) {
                    console.error('Create team error:', e);
                }
            }
            // Handle Get My Teams
            else if (message['get teams']) {
                // ... existing code
                 const { userId } = message['get teams'];
                 try {
                     const Team = require('./models/Team');
                     const teams = await Team.find({
                         $or: [
                             { owner: userId },
                             { members: userId }
                         ]
                     }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role picture');
 
                     socket.emit('message', JSON.stringify({
                         teams: {
                             teams: teams
                         }
                     }));
                 } catch (e) {
                      console.error('Get my teams error:', e);
                 }
            }
            // Handle Get Team Messages
            else if (message.get_team_messages) {
                const { teamId, userId } = message.get_team_messages; 
                socket.join(teamId); 
                console.log(`Socket ${socket.id} joined room ${teamId} via get_team_messages`);
                try {
                    const Message = require('./models/Message');
                    const Team = require('./models/Team'); 

                    const messages = await Message.find({ team: teamId })
                                            .sort({ createdAt: 1 })
                                            .populate('sender', 'firstname picture role');
                    
                    // Clear Unread Count for this user
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
                                $or: [ { owner: userId }, { members: userId } ]
                             }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role picture');

                             socket.emit('message', JSON.stringify({
                                 teams: {
                                     teams: myTeams
                                 }
                             }));
                         }
                    }

                    if (activeGroupCalls.has(teamId)) {
                         const participants = activeGroupCalls.get(teamId);
                         socket.emit('message', JSON.stringify({
                             'team-call-status': {
                                 teamId: teamId,
                                 active: true,
                                 participants: Array.from(participants)
                             }
                         }));
                    }

                    socket.emit('message', JSON.stringify({
                        team_messages: {
                            teamId: teamId,
                            messages: messages
                        }
                    }));
                } catch (e) {
                    console.error('Get team messages error:', e);
                }
            }
            // Handle Team Message
            else if (message.team_message) {
                const { senderId, teamId, content } = message.team_message;
                try {
                    const Message = require('./models/Message');
                    const Team = require('./models/Team');
                    const User = require('./models/User');

                    const newMessage = new Message({
                        sender: senderId,
                        team: teamId,
                        content: content,
                        read: true 
                    });
                    await newMessage.save();
                    
                    // Populate sender for display
                    await newMessage.populate('sender', 'firstname picture role');

                    // Broadcast to all team members AND update unread counts
                    const team = await Team.findById(teamId).populate('members');
                    if (team) {
                        const recipients = [...team.members, team.owner]; 
                        const recipientIds = new Set([team.owner._id.toString(), ...team.members.map(m => m._id.toString())]);

                        // Update Unread Counts
                        let updated = false;
                        for (const userId of recipientIds) {
                            if (userId !== senderId) { // Don't count for sender
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
                        if(updated) await team.save();

                        for (const userId of recipientIds) {
                            const user = await User.findById(userId);
                            if (user && user.is_online && user.socket_id) {
                                // 1. Send the message
                                io.to(user.socket_id).emit('message', JSON.stringify({
                                    receive_team_message: {
                                        message: newMessage,
                                        teamId: teamId
                                    }
                                }));

                                // 2. Send updated unread count (by refreshing team list)
                                // Only need to send if it's not the sender (sender reads it immediately)
                                if (userId !== senderId) {
                                     // Re-fetch strictly to get valid object structure if needed, or just send event
                                     // Actually get_my_teams handled logic is to fetch all. 
                                     // Efficient way: just trigger a client refresh hint or send updated team obj.
                                     // Let's do it for now.
                                     
                                     // We need to re-fetch to get populated fields correctly for the list
                                     const myTeams = await Team.find({
                                        $or: [ { owner: userId }, { members: userId } ]
                                     }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role picture');

                                     io.to(user.socket_id).emit('message', JSON.stringify({
                                         teams: {
                                             teams: myTeams
                                         }
                                     }));
                                     
                                     // Also refresh Home/Recent conversations if they are there
                                     // Calling get_recent_conversations logic... reusing logic is hard here without refactor.
                                     // But the client can listen to 'receive_team_message' and refresh home/teams.
                                     // WE DID send 'receive_team_message' above.
                                     // AND we sent 'get_my_teams_response'.
                                }
                            }
                        }
                    }

                } catch (e) {
                    console.error('Team message error:', e);
                }
            }
            // Handle Leave Team
            else if (message.leave_team) {
                const { teamId, userId } = message.leave_team;
                try {
                    const Team = require('./models/Team');
                    const User = require('./models/User');

                    const team = await Team.findById(teamId);
                    if (team) {
                        // Remove from members
                        team.members = team.members.filter(m => m.toString() !== userId);
                        team.unreadCounts.delete(userId); // Cleanup unread count
                        await team.save();

                        // Notify the leaver (to remove from their list)
                        const user = await User.findById(userId);
                        if (user && user.is_online && user.socket_id) {
                             const myTeams = await Team.find({
                                 $or: [ { owner: userId }, { members: userId } ]
                             }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
                             
                             io.to(user.socket_id).emit('message', JSON.stringify({
                                 teams: { teams: myTeams },
                                 leave_team_status: { success: true, teamId: teamId }
                             }));
                        }

                        // Notify remaining members (to update member count)
                        const remainingIds = [team.owner.toString(), ...team.members.map(m => m.toString())];
                         for (const rid of remainingIds) {
                            const rUser = await User.findById(rid);
                             if (rUser && rUser.is_online && rUser.socket_id) {
                                 const rTeams = await Team.find({
                                    $or: [ { owner: rid }, { members: rid } ]
                                 }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');

                                 io.to(rUser.socket_id).emit('message', JSON.stringify({
                                     teams: { teams: rTeams }
                                 }));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Leave team error:', e);
                }
            }
            // Handle Delete Team
            else if (message['delete team']) {
                const { teamId, userId } = message['delete team'];
                try {
                    const Team = require('./models/Team');
                    const User = require('./models/User');
                    const Message = require('./models/Message'); // To delete messages

                    const team = await Team.findById(teamId);
                    if (team && team.owner.toString() === userId) {
                        // Get all members to notify them BEFORE deleting
                        const allMemberIds = [team.owner.toString(), ...team.members.map(m => m.toString())];
                        
                        // Delete Team
                        await Team.findByIdAndDelete(teamId);
                        // Delete Messages
                        await Message.deleteMany({ team: teamId });

                        // Notify all involved users
                        for (const memberId of allMemberIds) {
                            const user = await User.findById(memberId);
                            if (user && user.is_online && user.socket_id) {
                                 const myTeams = await Team.find({
                                    $or: [ { owner: memberId }, { members: memberId } ]
                                 }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');

                                  io.to(user.socket_id).emit('message', JSON.stringify({
                                      teams: { teams: myTeams },
                                      team_deleting_status: { success: true, teamId: teamId }
                                  }));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Delete team error:', e);
                }
            }
            // Handle Add Team Member
            else if (message.add_team_member) {
                const { teamId, userId, newMemberIds } = message.add_team_member;
                try {
                    const Team = require('./models/Team');
                    const User = require('./models/User');

                    const team = await Team.findById(teamId);
                    if (team && team.owner.toString() === userId) {
                        // Filter out existing members
                        const existingMembers = team.members.map(m => m.toString());
                        const toAdd = newMemberIds.filter(id => !existingMembers.includes(id) && id !== team.owner.toString());
                        
                        if (toAdd.length > 0) {
                            team.members.push(...toAdd);
                            toAdd.forEach(id => team.unreadCounts.set(id, 0)); // Init unread
                            await team.save();

                            // Notify everyone (old + new)
                            const allMemberIds = [team.owner.toString(), ...team.members.map(m => m.toString())];
                            for (const memberId of allMemberIds) {
                                const user = await User.findById(memberId);
                                if (user && user.is_online && user.socket_id) {
                                    const myTeams = await Team.find({
                                        $or: [ { owner: memberId }, { members: memberId } ]
                                    }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');

                                    io.to(user.socket_id).emit('message', JSON.stringify({
                                        teams: { teams: myTeams },
                                        team_updating_status: { success: true, teamId: teamId } 
                                    }));
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Add team member error:', e);
                }
            }
            // Handle Remove Team Member
            else if (message.remove_team_member) {
                const { teamId, userId, memberIdToRemove } = message.remove_team_member;
                try {
                     const Team = require('./models/Team');
                     const User = require('./models/User');

                     const team = await Team.findById(teamId);
                     if (team && team.owner.toString() === userId) {
                         // Check if removing existing member
                         if (team.members.map(m => m.toString()).includes(memberIdToRemove)) {
                              // Notify REMOVED user first (before removing from DB so we can find them via team logic? No, just find User directly)
                             const removedUser = await User.findById(memberIdToRemove);

                             team.members = team.members.filter(m => m.toString() !== memberIdToRemove);
                             team.unreadCounts.delete(memberIdToRemove);
                             await team.save();

                             // Notify removed user
                             if (removedUser && removedUser.is_online && removedUser.socket_id) {
                                 const rTeams = await Team.find({
                                    $or: [ { owner: memberIdToRemove }, { members: memberIdToRemove } ]
                                 }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
                                 
                                 io.to(removedUser.socket_id).emit('message', JSON.stringify({
                                     teams: { teams: rTeams },
                                     team_updating_status: { success: true, teamId: teamId, removed: true }
                                 }));
                             }

                             // Notify remaining members
                             const allMemberIds = [team.owner.toString(), ...team.members.map(m => m.toString())];
                             for (const memberId of allMemberIds) {
                                const user = await User.findById(memberId);
                                if (user && user.is_online && user.socket_id) {
                                    const myTeams = await Team.find({
                                        $or: [ { owner: memberId }, { members: memberId } ]
                                    }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');

                                    io.to(user.socket_id).emit('message', JSON.stringify({
                                        teams: { teams: myTeams },
                                        team_updating_status: { success: true, teamId: teamId } 
                                    }));
                                }
                            }
                         }
                     }
                } catch (e) {
                    console.error('Remove team member error:', e);
                }
            }

            // Handle Get Files (Recursive hierarchy)
            else if (message.get_files) {
                const { userId, spaceId, type, category } = message.get_files; 
                try {
                    let effectiveCategory = category || (['personal', 'global', 'team'].includes(type) ? type : 'global');
                    if (spaceId) {
                        const space = await Space.findById(spaceId);
                        if (space) effectiveCategory = space.category;
                    }
                    let query = {};
                    
                    if (spaceId) {
                        const space = await Space.findById(spaceId);
                        if (!space) return;
                        
                        const user = await User.findById(userId);
                        if (!user) return;

                        const isOwner = space.owner.toString() === userId;
                        const isMember = space.members && space.members.some(id => id.toString() === userId);
                        const isAdminOrTeacher = ['admin', 'enseignant'].includes(user.role);
                        const isGlobal = space.category === 'global';

                        let hasAccess = isOwner || isMember || isAdminOrTeacher || isGlobal;

                        // Recursive check for parent permissions if not directly authorized
                        if (!hasAccess && space.parent) {
                            let currentParentId = space.parent;
                            while (currentParentId) {
                                const parentSpace = await Space.findById(currentParentId);
                                if (!parentSpace) break;
                                
                                if (parentSpace.owner.toString() === userId || 
                                    (parentSpace.members && parentSpace.members.some(id => id.toString() === userId))) {
                                    hasAccess = true;
                                    break;
                                }
                                currentParentId = parentSpace.parent;
                            }
                        }

                        if (!hasAccess) {
                            return socket.emit('message', JSON.stringify({
                                files: { success: false, error: 'Accès au dossier refusé' }
                            }));
                        }
                        query.space = spaceId;
                    } else {
                        // Root files filter by owner/category
                        query.space = { $in: [null, undefined] };
                        query.category = effectiveCategory; // STRICT FILTER BY CATEGORY
                        
                        if (effectiveCategory === 'personal') {
                            query.owner = userId;
                        } else if (effectiveCategory === 'team') {
                            // For team root, maybe just user's files? 
                            // Usually team files are in spaces, but safety:
                            query.owner = userId; // Currently only personal files in team root? Or should team root be shared? 
                            // Let's assume team root is personal workspace context for now or shared if we had a team entity.
                            // For now, let's keep it safe:
                            query.owner = userId;
                        } else {
                            // GLOBAL: Show all files in category global (no owner check needed for visibility)
                        }
                    }

                    const files = await File.find(query).populate('owner', 'firstname role').sort({ createdAt: -1 });
                    socket.emit('message', JSON.stringify({
                        files: { success: true, files: files }
                    }));
                } catch (e) {
                    console.error('Get files error:', e);
                }
            }
            // Handle Upload File
            else if (message.upload_file) {
                const { name, size, type, url, userId, spaceId, category } = message.upload_file;
                try {
                    const user = await User.findById(userId);
                    if (!user) return;

                    let effectiveCategory = category || 'personal';
                    if (spaceId) {
                        const space = await Space.findById(spaceId);
                        if (space) effectiveCategory = space.category;
                    }

                    // Strict block for non-staff in Global silo
                    if (effectiveCategory === 'global' && !['admin', 'enseignant'].includes(user.role)) {
                        return socket.emit('message', JSON.stringify({
                            file_uploading_status: { success: false, error: 'Permission refusée pour le silo Commun' }
                        }));
                    }

                    if (spaceId) {
                        const space = await Space.findById(spaceId);
                        if (!space) return;
                        const isOwner = space.owner.toString() === userId;
                        const isMember = space.members && space.members.some(id => id.toString() === userId);
                        const isAdminOrTeacher = ['admin', 'enseignant'].includes(user.role);

                        let hasAccess = isOwner || isMember || isAdminOrTeacher;

                        // Recursive check
                        if (!hasAccess && space.parent) {
                            let currentParentId = space.parent;
                            while (currentParentId) {
                                const parentSpace = await Space.findById(currentParentId);
                                if (!parentSpace) break;
                                
                                if (parentSpace.owner.toString() === userId || 
                                    (parentSpace.members && parentSpace.members.some(id => id.toString() === userId))) {
                                    hasAccess = true;
                                    break;
                                }
                                currentParentId = parentSpace.parent;
                            }
                        }

                        if (!hasAccess) {
                            return socket.emit('message', JSON.stringify({
                                file_uploading_status: { success: false, error: 'Accès au dossier refusé' }
                            }));
                        }
                    } 

                    const newFile = new File({
                        name, size, type, url, owner: userId,
                        space: spaceId || undefined,
                        category: effectiveCategory // SAVE CATEGORY
                    });
                    await newFile.save();
                    
                    const fullFile = await File.findById(newFile._id).populate('owner', 'firstname role');

                    // Broadcast only to relevant users
                    const sockets = await io.fetchSockets();
                    let associatedSpace = null;
                    if (newFile.space) {
                         associatedSpace = await Space.findById(newFile.space);
                    }

                    for (const s of sockets) {
                        if (s.userId) {
                            const sUserRole = s.userRole; 
                            const sUserId = s.userId;
                            let canSee = false; // Default deny

                            if (fullFile.category === 'personal') {
                                canSee = (fullFile.owner._id.toString() === sUserId);
                            } else if (fullFile.category === 'global') {
                                canSee = true; 
                            } else if (fullFile.category === 'team') {
                                const isFileOwner = fullFile.owner._id.toString() === sUserId;
                                const isStaff = ['admin', 'enseignant'].includes(sUserRole);
                                let isSpaceMember = false;
                                let isSpaceOwner = false;
                                if (associatedSpace) {
                                    if (associatedSpace.members) isSpaceMember = associatedSpace.members.some(m => m.toString() === sUserId);
                                    isSpaceOwner = associatedSpace.owner.toString() === sUserId;
                                }
                                canSee = isFileOwner || isStaff || isSpaceMember || isSpaceOwner;
                            }

                            if (canSee) {
                                s.emit('message', JSON.stringify({
                                    file_uploading_status: { success: true, file: fullFile }
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Upload file error:', e);
                    socket.emit('message', JSON.stringify({
                        file_uploading_status: { success: false, error: 'Erreur lors de l\'upload' }
                    }));
                }
            }
            // Handle Get Spaces (Hierarchical & Categorized)
            else if (message.get_spaces) {
                const { userId, category, type, parentId } = message.get_spaces; 
                try {
                    let query = { parent: parentId ? parentId : { $in: [null, undefined] } };
                    let effectiveCategory = category || (['personal', 'global', 'team'].includes(type) ? type : 'global');

                    if (parentId) {
                        const parent = await Space.findById(parentId);
                        if (parent) effectiveCategory = parent.category;
                    }

                    const user = await User.findById(userId);
                    if (!user) return;

                    if (effectiveCategory === 'personal') {
                        query.owner = userId;
                        query.category = 'personal';
                    } else if (effectiveCategory === 'global') {
                        query.category = 'global';
                        // Only staff can see ALL global spaces if needed? 
                        // Actually, let's keep it simple: global is school-wide.
                    } else if (effectiveCategory === 'team') {
                        query.category = 'team';
                        if (!['admin', 'enseignant'].includes(user.role)) {
                            query.$or = [{ owner: userId }, { members: userId }];
                        }
                    }
                    console.log('GET SPACES QUERY:', JSON.stringify(query));

                    const spaces = await Space.find(query)
                        .populate('members', 'firstname role')
                        .populate('owner', 'firstname role')
                        .sort({ name: 1 });
                        
                    socket.emit('message', JSON.stringify({
                        spaces: { success: true, spaces: spaces, parentId: parentId || null }
                    }));
                } catch (e) {
                    console.error('Get spaces error:', e);
                }
            }
            // Handle Create Space
            else if (message.create_space) {
                const { name, userId, category, members, parentId } = message.create_space;
                try {
                    const user = await User.findById(userId);
                    if (!user) return;

                    let effectiveCategory = category || 'personal';
                    if (parentId) {
                        const parent = await Space.findById(parentId);
                        if (parent) effectiveCategory = parent.category;
                    }

                    // Students restricted from Global
                    if (effectiveCategory === 'global' && !['admin', 'enseignant'].includes(user.role)) {
                        return socket.emit('message', JSON.stringify({
                            space_creating_status: { success: false, error: 'Permission refusée' }
                        }));
                    }

                    // For sub-spaces, check parent permissions recursively
                    if (parentId) {
                        const parentSpace = await Space.findById(parentId);
                        if (parentSpace) {
                            const isOwner = parentSpace.owner.toString() === userId;
                            const isMember = parentSpace.members && parentSpace.members.some(id => id.toString() === userId);
                            const isAdminOrTeacher = ['admin', 'enseignant'].includes(user.role);
                            
                            let hasAccess = isOwner || isMember || isAdminOrTeacher;

                            if (!hasAccess && parentSpace.parent) {
                                let currentParentId = parentSpace.parent;
                                while (currentParentId) {
                                    const ancSpace = await Space.findById(currentParentId);
                                    if (!ancSpace) break;
                                    
                                    if (ancSpace.owner.toString() === userId || 
                                        (ancSpace.members && ancSpace.members.some(id => id.toString() === userId))) {
                                        hasAccess = true;
                                        break;
                                    }
                                    currentParentId = ancSpace.parent;
                                }
                            }

                            if (!hasAccess && effectiveCategory !== 'global') {
                                return socket.emit('message', JSON.stringify({
                                    space_creating_status: { success: false, error: 'Permission refusée (parent)' }
                                }));
                            }
                        }
                    }
                    console.log('CREATING SPACE:', { name, effectiveCategory, parentId });

                    const newSpace = new Space({ 
                        name, 
                        owner: userId, 
                        category: effectiveCategory,
                        parent: parentId || null,
                        members: members || [],
                        isPersonal: (effectiveCategory === 'personal')
                    });
                    await newSpace.save();

                    const fullSpace = await Space.findById(newSpace._id)
                        .populate('members', 'firstname role')
                        .populate('owner', 'firstname role');

                    // Broadcast only to relevant users
                    const sockets = await io.fetchSockets();
                    for (const s of sockets) {
                        if (s.userId) {
                            // Check if this user should see the space
                            // 1. Owner
                            // 2. Member
                            // 3. Admin/Teacher (if not personal)
                            // 4. Global space (if they have access to global)
                            
                            const sUserRole = s.userRole; 
                            const sUserId = s.userId;
                            
                            let canSee = false;
                            
                            if (fullSpace.category === 'personal') {
                                canSee = (fullSpace.owner._id.toString() === sUserId);
                            } else if (fullSpace.category === 'global') {
                                canSee = true; // Simplified, assuming global is public or role-based checked elsewhere
                            } else if (fullSpace.category === 'team') {
                                const isOwner = fullSpace.owner._id.toString() === sUserId;
                                const isMember = fullSpace.members.some(m => m._id.toString() === sUserId);
                                const isStaff = ['admin', 'enseignant'].includes(sUserRole);
                                canSee = isOwner || isMember || isStaff;
                            }

                            if (canSee) {
                                s.emit('message', JSON.stringify({
                                    space_creating_status: { success: true, space: fullSpace }
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Create space error:', e);
                    socket.emit('message', JSON.stringify({
                        space_creating_status: { success: false, error: 'Erreur lors de la création' }
                    }));
                }
            }
            // Handle Rename Space
            else if (message.rename_space) {
                const { spaceId, newName, userId } = message.rename_space;
                try {
                    const user = await User.findById(userId);
                    const space = await Space.findById(spaceId);
                    if (!user || !space) return;

                    const isOwner = space.owner.toString() === userId;
                    const isAdminOrTeacher = ['admin', 'enseignant'].includes(user.role);

                    if (!isOwner && !isAdminOrTeacher) {
                        return socket.emit('message', JSON.stringify({
                            space_renaming_status: { success: false, error: 'Permission refusée' }
                        }));
                    }

                    space.name = newName;
                    await space.save();

                    // Broadcast only to relevant users
                    const sockets = await io.fetchSockets();
                    for (const s of sockets) {
                        if (s.userId) {
                            const sUserRole = s.userRole; 
                            const sUserId = s.userId;
                            
                            let canSee = false;
                            
                            if (space.category === 'personal') {
                                canSee = (space.owner.toString() === sUserId);
                            } else if (space.category === 'global') {
                                canSee = true; 
                            } else if (space.category === 'team') {
                                const isOwner = space.owner.toString() === sUserId;
                                const isMember = space.members.some(m => m.toString() === sUserId);
                                const isStaff = ['admin', 'enseignant'].includes(sUserRole);
                                canSee = isOwner || isMember || isStaff;
                            }

                            if (canSee) {
                                s.emit('message', JSON.stringify({
                                    space_renaming_status: { success: true, spaceId, newName }
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Rename space error:', e);
                }
            }
            // Handle Delete Space
            else if (message.delete_space) {
                const { spaceId, userId } = message.delete_space;
                try {
                    const user = await User.findById(userId);
                    const space = await Space.findById(spaceId);
                    if (!user || !space) return;

                    // Allow if owner OR if user is admin/teacher
                    const isOwner = space.owner.toString() === userId;
                    const isAdminOrTeacher = ['admin', 'enseignant'].includes(user.role);

                    if (!isOwner && !isAdminOrTeacher) {
                        return socket.emit('message', JSON.stringify({
                            space_deleting_status: { success: false, error: 'Permission refusée' }
                        }));
                    }
                    
                    // Unlink files from this space before deleting
                    await File.updateMany({ space: spaceId }, { $unset: { space: "" } });
                    await Space.findByIdAndDelete(spaceId);
                    
                    // Broadcast only to relevant users
                    const sockets = await io.fetchSockets();
                    for (const s of sockets) {
                        if (s.userId) {
                            const sUserRole = s.userRole; 
                            const sUserId = s.userId;
                            
                            let canSee = false;
                            
                            if (space.category === 'personal') {
                                canSee = (space.owner.toString() === sUserId);
                            } else if (space.category === 'global') {
                                canSee = true; 
                            } else if (space.category === 'team') {
                                const isOwner = space.owner.toString() === sUserId;
                                const isMember = space.members.some(m => m.toString() === sUserId);
                                const isStaff = ['admin', 'enseignant'].includes(sUserRole);
                                canSee = isOwner || isMember || isStaff;
                            }

                            if (canSee) {
                                s.emit('message', JSON.stringify({
                                    space_deleting_status: { success: true, spaceId: spaceId }
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Delete space error:', e);
                    socket.emit('message', JSON.stringify({
                        space_deleting_status: { success: false, error: 'Erreur lors de la suppression' }
                    }));
                }
            }

            // Handle Resolve Path (URL names -> space hierarchy)
            else if (message.resolve_path) {
                const { path, category, userId } = message.resolve_path;
                const names = path || [];
                try {
                    let currentParentId = null;
                    let resolvedPath = [];
                    let finalCategory = category || 'personal';
                    
                    // First pass: try current category
                    console.log(`[ResolvePath] Attempting: ${names.join('|')} (count: ${names.length}) in category ${finalCategory} for user ${userId}`);
                    names.forEach((n, i) => console.log(`  [${i}] "${n}" (len: ${n.length})`));
                    
                    let matchFound = true;
                    for (const name of names) {
                        let parentQuery = currentParentId ? currentParentId : { $in: [null, undefined] };
                        let query = { name, parent: parentQuery, category: finalCategory };
                        
                        if (finalCategory === 'personal') query.owner = userId;
                        if (finalCategory === 'team') {
                            const user = await User.findById(userId);
                            if (user && !['admin', 'enseignant'].includes(user.role)) {
                                query.$or = [{ owner: userId }, { members: userId }];
                            }
                        }

                        // Case-insensitive match for robustness
                        query.name = { $regex: new RegExp('^' + name + '$', 'i') };

                        let space = await Space.findOne(query).populate('owner', 'firstname role');
                        
                        // Fallback: If not found with category, but parent is known, try finding by name and parent only
                        if (!space && currentParentId) {
                            console.log(`[ResolvePath] Category mismatch? Trying fallback for "${name}" under parent ${currentParentId}`);
                            space = await Space.findOne({ name, parent: currentParentId }).populate('owner', 'firstname role');
                        }

                        if (!space) {
                            console.log(`[ResolvePath] No match for: "${name}" at parent ${currentParentId} in ${finalCategory}`);
                            matchFound = false;
                            break;
                        }
                        resolvedPath.push(space);
                        currentParentId = space._id;
                        finalCategory = space.category || finalCategory; 
                    }

                    // Second pass: if no match in current, try others at ROOT only (if names[0] failed)
                    if (!matchFound && resolvedPath.length === 0) {
                        console.log(`[ResolvePath] Second pass: checking other silos for root segment...`);
                        const silos = ['personal', 'global', 'team'];
                        for (const s of silos) {
                            if (s === category) continue;
                            currentParentId = null;
                            resolvedPath = [];
                            let subMatch = true;
                            for (const name of names) {
                                let parentQuery = currentParentId ? currentParentId : { $in: [null, undefined] };
                                let query = { name: { $regex: new RegExp('^' + name + '$', 'i') }, parent: parentQuery, category: s };
                                if (s === 'personal') query.owner = userId;
                                if (s === 'team') {
                                    const user = await User.findById(userId);
                                    if (user && !['admin', 'enseignant'].includes(user.role)) {
                                        query.$or = [{ owner: userId }, { members: userId }];
                                    }
                                }
                                const space = await Space.findOne(query).populate('owner', 'firstname role');
                                if (!space) { subMatch = false; break; }
                                resolvedPath.push(space);
                                currentParentId = space._id;
                            }
                            if (subMatch) {
                                console.log(`[ResolvePath] Found match in silo: ${s}`);
                                finalCategory = s;
                                matchFound = true;
                                break;
                            }
                        }
                    }

                    if (matchFound) {
                        console.log(`[ResolvePath] Success: Resolved ${resolvedPath.length} segments`);
                        socket.emit('message', JSON.stringify({
                            resolved_path: { success: true, path: resolvedPath, category: finalCategory }
                        }));
                    } else {
                        console.log(`[ResolvePath] Failure: Path not found in any silo`);
                        socket.emit('message', JSON.stringify({
                            resolved_path: { success: false, error: 'Path not found' }
                        }));
                    }
                } catch (e) {
                    console.error('Resolve path error:', e);
                    socket.emit('message', JSON.stringify({
                        resolved_path: { success: false, error: 'Erreur interne' }
                    }));
                }
            }

            // Handle Delete File
            else if (message.delete_file) {
                const { fileId, userId } = message.delete_file;
                try {
                    const user = await User.findById(userId);
                    const file = await File.findById(fileId);
                    if (!user || !file) return;

                    const isOwner = file.owner.toString() === userId;
                    const isAdminOrTeacher = ['admin', 'enseignant'].includes(user.role);

                    if (!isOwner && !isAdminOrTeacher) {
                        return socket.emit('message', JSON.stringify({
                            'file_deleting_status': { success: false, error: 'Permission refusée' }
                        }));
                    }

                    await File.findByIdAndDelete(fileId);
                    
                    // Broadcast only to relevant users
                    const sockets = await io.fetchSockets();
                    let associatedSpace = null;
                    if (file.space) {
                         associatedSpace = await Space.findById(file.space);
                    }

                    for (const s of sockets) {
                        if (s.userId) {
                             const sUserRole = s.userRole; 
                             const sUserId = s.userId;
                             let canSee = false;

                             if (file.category === 'personal') {
                                 canSee = (file.owner.toString() === sUserId);
                             } else if (file.category === 'global') {
                                 canSee = true;
                             } else if (file.category === 'team') {
                                const isFileOwner = file.owner.toString() === sUserId;
                                const isStaff = ['admin', 'enseignant'].includes(sUserRole);
                                let isSpaceMember = false;
                                let isSpaceOwner = false;
                                if (associatedSpace) {
                                    if (associatedSpace.members) isSpaceMember = associatedSpace.members.some(m => m.toString() === sUserId);
                                    isSpaceOwner = associatedSpace.owner.toString() === sUserId;
                                }
                                canSee = isFileOwner || isStaff || isSpaceMember || isSpaceOwner;
                             }

                             if (canSee) {
                                s.emit('message', JSON.stringify({
                                    file_deleting_status: { success: true, fileId: fileId }
                                }));
                             }
                        }
                    }
                } catch (e) {
                    console.error('Delete file error:', e);
                    socket.emit('message', JSON.stringify({
                        'file_deleting_status': { success: false, error: 'Erreur lors de la suppression' }
                    }));
                }
            }

            // Handle Update File (Rename)
            else if (message.update_file) {
                const { fileId, newName, userId } = message.update_file;
                try {
                    const user = await User.findById(userId);
                    const file = await File.findById(fileId);
                    if (!user || !file) return;

                    const isOwner = file.owner.toString() === userId;
                    const isAdminOrTeacher = ['admin', 'enseignant'].includes(user.role);

                    if (!isOwner && !isAdminOrTeacher) {
                        return socket.emit('message', JSON.stringify({
                            file_updating_status: { success: false, error: 'Permission refusée' }
                        }));
                    }

                    file.name = newName;
                    await file.save();

                    io.emit('message', JSON.stringify({
                        file_updating_status: { success: true, fileId, newName }
                    }));
                } catch (e) {
                    console.error('Update file error:', e);
                }
            }
            // Handle Resolve Path (Deep Linking)
            else if (message.resolve_path) {
                const { path, userId, category } = message.resolve_path;
                try {
                    const user = await User.findById(userId);
                    if (!user) return;

                    let currentParentId = null;
                    let resolvedSpace = null;

                    // 1. Find root space (first element of path)
                    // The path typically starts with "ActiveTab" name like "Privée", "Commun", "Équipe"
                    // But the actual folder names in DB might differ.
                    // Actually, the path sent by frontend is [folderName1, folderName2]
                    
                    // We need to traverse the path
                    for (let i = 0; i < path.length; i++) {
                        const folderName = path[i];
                        let query = { 
                            name: folderName, 
                            parent: currentParentId || { $in: [null, undefined] }
                        };

                        if (!currentParentId) {
                            // Root level filtering
                            if (category === 'personal') {
                                query.owner = userId;
                                query.category = 'personal';
                            } else if (category === 'global') {
                                query.category = 'global';
                            } else if (category === 'team') {
                                query.category = 'team';
                                if (!['admin', 'enseignant'].includes(user.role)) {
                                    query.$or = [{ owner: userId }, { members: userId }];
                                }
                            }
                        }

                        const space = await Space.findOne(query);
                        
                        if (!space) {
                            // Path broken
                            return socket.emit('message', JSON.stringify({
                                resolved_path: { success: false, error: 'Chemin introuvable' }
                            }));
                        }

                        // Check permissions for this space
                        // We reuse the recursive logic implicitly by traversing
                        // If we found it via query above (root), we have access.
                        // For sub-folders, we need to check if we have access.
                        // But wait! If we are in Team space, subfolders don't have members.
                        // So we need to check if user had access to PARENT.
                        // Since we traverse from root, and root check passed, and subfolders inherit...
                        // We just need to ensure we don't switch into a "private" folder of someone else if that logic existed.
                        // But spaces don't have "private subfolders" in this model yet.
                        // However, let's stick to the robust check:
                        
                        // If it's a root folder, our query already filtered by access.
                        // If it's a child folder, we just need to ensure it exists. 
                        // The existing structure implies if you can see parent, you see child.
                        
                        resolvedSpace = space;
                        currentParentId = space._id;
                    }

                    if (resolvedSpace) {
                         const fullSpace = await Space.findById(resolvedSpace._id)
                            .populate('members', 'firstname role')
                            .populate('owner', 'firstname role');

                        socket.emit('message', JSON.stringify({
                            resolved_path: { success: true, space: fullSpace }
                        }));
                    } else {
                        // Empty path -> Root
                        socket.emit('message', JSON.stringify({
                            resolved_path: { success: true, space: null }
                        }));
                    }

                } catch (e) {
                    console.error('Resolve path error:', e);
                    socket.emit('message', JSON.stringify({
                        resolved_path: { success: false, error: 'Erreur serveur' }
                    }));
                }
            }

            else if (message['call-team']) {
                const { teamId, offer } = message['call-team'];
                try {
                    const Team = require('./models/Team');
                    const User = require('./models/User');
                    const team = await Team.findById(teamId).populate('members').populate('owner');
                    const caller = await User.findOne({ socket_id: socket.id });

                    if (team && caller) {
                        const isOwner = team.owner._id.toString() === caller._id.toString();
                        const isAlreadyActive = activeGroupCalls.has(teamId);

                        // CASE 1: Owner starts the call
                        if (isOwner) {
                            if (!activeGroupCalls.has(teamId)) {
                                activeGroupCalls.set(teamId, new Set());
                                pendingJoinRequests.set(teamId, new Set()); // Initialize pending requests
                            }
                            const participants = activeGroupCalls.get(teamId);
                            
                            // Add owner if not already there
                            let alreadyIn = false;
                            participants.forEach(p => { if(p.socketId === socket.id) alreadyIn = true; });
                            if(!alreadyIn) {
                                participants.add({ 
                                    socketId: socket.id, 
                                    userId: caller._id, 
                                    user: { firstname: caller.firstname, picture: caller.picture, _id: caller._id } 
                                });
                            }

                            const recipients = [...team.members, team.owner];
                            console.log(`Team call STARTED by owner ${caller.firstname} for ${team.name}`);
                            
                            // Broadcast the CALL STATUS to the team
                            for (const recipient of recipients) {
                                 if (recipient.socket_id && recipient.is_online) {
                                      io.to(recipient.socket_id).emit('message', JSON.stringify({
                                          'team-call-status': {
                                              teamId: team._id,
                                              active: true,
                                              participants: Array.from(participants),
                                              ownerId: team.owner._id
                                          }
                                      }));
                                 }
                            }
                            broadcastUserCallStatus(socket.id);
                        }
                        // CASE 2: Member wants to join -> Send request to host
                        else if (isAlreadyActive) {
                            console.log(`${caller.firstname} is REQUESTING to join call in ${team.name}`);
                            
                            // Store the pending request
                            if (!pendingJoinRequests.has(teamId)) {
                                pendingJoinRequests.set(teamId, new Set());
                            }
                            const requests = pendingJoinRequests.get(teamId);
                            
                            // Check if already requested
                            let alreadyRequested = false;
                            requests.forEach(r => { if(r.socketId === socket.id) alreadyRequested = true; });
                            
                            if (!alreadyRequested) {
                                requests.add({
                                    socketId: socket.id,
                                    userId: caller._id,
                                    user: { firstname: caller.firstname, picture: caller.picture, _id: caller._id },
                                    timestamp: Date.now()
                                });
                            }
                            
                            // Send request to HOST (team owner)
                            if (team.owner.socket_id && team.owner.is_online) {
                                io.to(team.owner.socket_id).emit('message', JSON.stringify({
                                    'join-request-received': {
                                        teamId: team._id.toString(),
                                        requester: { 
                                            socketId: socket.id, 
                                            firstname: caller.firstname, 
                                            picture: caller.picture, 
                                            _id: caller._id.toString() 
                                        }
                                    }
                                }));
                                console.log(`Join request sent to host ${team.owner.firstname}`);
                            }
                            
                            // Notify the requester that request is pending
                            io.to(socket.id).emit('message', JSON.stringify({
                                'join-request-status': { teamId: team._id.toString(), status: 'pending' }
                            }));
                        }
                        // CASE 3: No active call and not owner -> Cannot start
                        else {
                            console.log(`${caller.firstname} tried to join non-existent call in ${team.name}`);
                            io.to(socket.id).emit('message', JSON.stringify({
                                'join-request-status': { teamId: team._id.toString(), status: 'no_call' }
                            }));
                        }
                    }
                } catch (e) {
                    console.error('Call team error:', e);
                }
            }
            // HOST responds to a join request (accept/reject)
            else if (message['join-request-response']) {
                const { teamId, requesterSocketId, accepted } = message['join-request-response'];
                console.log(`[JOIN-REQ-RESPONSE] Received: teamId=${teamId}, requester=${requesterSocketId}, accepted=${accepted}`);
                try {
                    const Team = require('./models/Team');
                    const User = require('./models/User');
                    const team = await Team.findById(teamId).populate('members').populate('owner');
                    const responder = await User.findOne({ socket_id: socket.id });
                    
                    console.log(`[JOIN-REQ-RESPONSE] team=${team?.name}, responder=${responder?.firstname}, owner=${team?.owner?.firstname}`);
                    
                    // Verify responder is the owner
                    if (team && responder && team.owner._id.toString() === responder._id.toString()) {
                        // Remove from pending requests
                        if (pendingJoinRequests.has(teamId)) {
                            const requests = pendingJoinRequests.get(teamId);
                            let requestToRemove = null;
                            requests.forEach(r => { if(r.socketId === requesterSocketId) requestToRemove = r; });
                            if (requestToRemove) requests.delete(requestToRemove);
                        }
                        
                        if (accepted) {
                            console.log(`Host ${responder.firstname} ACCEPTED join request from ${requesterSocketId}`);
                            
                            // Get requester info
                            const requester = await User.findOne({ socket_id: requesterSocketId });
                            if (requester && activeGroupCalls.has(teamId)) {
                                const participants = activeGroupCalls.get(teamId);
                                
                                // Add requester to participants
                                participants.add({ 
                                    socketId: requesterSocketId, 
                                    userId: requester._id, 
                                    user: { firstname: requester.firstname, picture: requester.picture, _id: requester._id } 
                                });
                                
                                // Notify requester they can join
                                io.to(requesterSocketId).emit('message', JSON.stringify({
                                    'join-request-status': { teamId: teamId, status: 'accepted' }
                                }));
                                
                                // Broadcast updated participant list
                                const recipients = [...team.members, team.owner];
                                for (const recipient of recipients) {
                                    if (recipient.socket_id && recipient.is_online) {
                                        io.to(recipient.socket_id).emit('message', JSON.stringify({
                                            'team-call-status': {
                                                teamId: team._id,
                                                active: true,
                                                participants: Array.from(participants),
                                                ownerId: team.owner._id
                                            }
                                        }));
                                    }
                                }
                                
                                // MESH: Notify EXISTING participants to initiate connection TO the new joiner
                                participants.forEach(p => {
                                    if (p.socketId !== requesterSocketId) {
                                        io.to(p.socketId).emit('message', JSON.stringify({
                                            'notify-new-joiner': {
                                                teamId: team._id.toString(),
                                                newJoinerSocketId: requesterSocketId,
                                                newJoinerUser: { firstname: requester.firstname, picture: requester.picture, _id: requester._id }
                                            }
                                        }));
                                        console.log(`[MESH] Notified ${p.socketId} to call new joiner ${requesterSocketId}`);
                                    }
                                });
                                
                                broadcastUserCallStatus(requesterSocketId);
                            }
                        } else {
                            console.log(`Host ${responder.firstname} REJECTED join request from ${requesterSocketId}`);
                            // Notify requester they were rejected
                            io.to(requesterSocketId).emit('message', JSON.stringify({
                                'join-request-status': { teamId: teamId, status: 'rejected' }
                            }));
                        }
                    }
                } catch (e) {
                    console.error('Join request response error:', e);
                }
            }
            else if (message['leave-group-call']) {
                const { teamId } = message['leave-group-call'];
                if (activeGroupCalls.has(teamId)) {
                    const participants = activeGroupCalls.get(teamId);
                    
                    const Team = require('./models/Team');
                    const team = await Team.findById(teamId).populate('members').populate('owner');
                    
                    if (team) {
                        // We need the user associated with socket first
                        const User = require('./models/User');
                        const leaver = await User.findOne({ socket_id: socket.id });

                        // Define recipients for notification
                        const recipients = [...team.members, team.owner];

                        if (leaver && team.owner._id.toString() === leaver._id.toString()) {
                            console.log(`Team Owner ${leaver.firstname} ended the call for team ${team.name}`);
                            // OWNER LEFT -> END CALL FOR EVERYONE
                            activeGroupCalls.delete(teamId);
                            
                            // Send to all team members
                            recipients.forEach(r => {
                                if (r && r.socket_id && r.is_online) {
                                    // Send END event (force close for participants)
                                    io.to(r.socket_id).emit('message', JSON.stringify({
                                        'team-call-ended': { teamId: teamId, reason: 'owner_left' }
                                    }));
                                    // Then send STATUS update (hides button for everyone)
                                    io.to(r.socket_id).emit('message', JSON.stringify({
                                        'team-call-status': { teamId: teamId, active: false, participants: [] }
                                    }));
                                }
                            });

                            broadcastUserCallStatus(socket.id);
                            return; // Stop further processing
                        }
                    }

                    let userToRemove = null;
                    participants.forEach(p => { if(p.socketId === socket.id) userToRemove = p; });
                    if (userToRemove) {
                        participants.delete(userToRemove);
                        console.log(`User ${userToRemove.user?.firstname || socket.id} left team call ${teamId}`);
                        
                        // Notify others
                        if (team) {
                            const recipients = [...team.members, team.owner];
                            recipients.forEach(r => {
                                if (r && r.socket_id && r.is_online) {
                                    // Send participant-left FIRST (so peers close old connection)
                                    io.to(r.socket_id).emit('message', JSON.stringify({
                                        'participant-left': { socket: socket.id, teamId: teamId }
                                    }));
                                    // Send notification with firstname
                                    io.to(r.socket_id).emit('message', JSON.stringify({
                                        'participant-left-notification': { 
                                            teamId: teamId, 
                                            firstname: userToRemove.user?.firstname || 'Un participant' 
                                        } 
                                    }));
                                    
                                    // Determine if call is still active
                                    const isActive = participants.size > 0;
                                    
                                    // Then send updated status
                                    io.to(r.socket_id).emit('message', JSON.stringify({
                                        'team-call-status': {
                                            teamId: team._id,
                                            active: isActive,
                                            participants: Array.from(participants),
                                            ownerId: team.owner._id
                                        }
                                    }));
                                }
                            });
                        }
                    }
                    if (participants.size === 0) activeGroupCalls.delete(teamId);
                }
                broadcastUserCallStatus(socket.id);
            }
            else if (message['call-user']) {
                const { to, offer } = message['call-user'];
                try {
                    const User = require('./models/User');
                    // Find Caller details
                    const caller = await User.findOne({ socket_id: socket.id });

                    let targetSocketId = null;

                    // Check if 'to' is User ID or Socket ID
                    if (typeof to === 'string' && to.match(/^[0-9a-fA-F]{24}$/)) {
                         const targetUser = await User.findById(to);
                         if (targetUser && targetUser.socket_id && targetUser.is_online) {
                             targetSocketId = targetUser.socket_id;
                         }
                    } else {
                         targetSocketId = to;
                    }

                    if (targetSocketId) {
                         // Check if target is BUSY (busy with someone else)
                         if (activeCalls.has(targetSocketId) && !activeCalls.get(targetSocketId).has(socket.id)) {
                             console.log(`Rejecting call from ${socket.id} to ${targetSocketId} because target is BUSY with another user.`);
                             return socket.emit('message', JSON.stringify({
                                 'call-rejected': { 
                                     socket: targetSocketId,
                                     reason: 'busy'
                                 }
                             }));
                         }

                         console.log(`Forwarding call offer/renegotiation from ${caller ? caller.firstname : socket.id} to ${targetSocketId}`);
                         io.to(targetSocketId).emit('message', JSON.stringify({
                             'call-made': {
                                 offer: offer,
                                 socket: socket.id, 
                                 user: caller ? { firstname: caller.firstname, picture: caller.picture, _id: caller._id } : socket.id
                             }
                         }));
                    } else {
                        console.log(`Target ${to} for call not found or offline.`);
                    }
                } catch (e) {
                    console.error('Call user error:', e);
                }
            }
            else if (message['make-answer']) {
                const { to, answer } = message['make-answer']; // 'to' is socketId here (from 'call-made')
                try {
                    const User = require('./models/User');
                    // Find Answerer details
                    const answerer = await User.findOne({ socket_id: socket.id });

                    console.log(`Forwarding call answer to ${to}`);
                    
                    // Track Active Call
                    if (!activeCalls.has(socket.id)) activeCalls.set(socket.id, new Set());
                    if (!activeCalls.has(to)) activeCalls.set(to, new Set());
                    activeCalls.get(socket.id).add(to);
                    activeCalls.get(to).add(socket.id);
                    broadcastCallCount();
                    broadcastUserCallStatus(socket.id);
                    broadcastUserCallStatus(to);

                    io.to(to).emit('message', JSON.stringify({
                        'answer-made': {
                            socket: socket.id,
                            answer: answer,
                             user: answerer ? { firstname: answerer.firstname, picture: answerer.picture, _id: answerer._id } : socket.id
                        }
                    }));
                } catch (e) {
                    console.error('Make answer error:', e);
                }
            }
            else if (message['ice-candidate']) {
                const { to, candidate } = message['ice-candidate']; 
                if (!to) return;

                try {
                     if (typeof to === 'string' && to.match(/^[0-9a-fA-F]{24}$/)) {
                         const User = require('./models/User');
                         const targetUser = await User.findById(to);
                         if (targetUser && targetUser.socket_id) {
                             io.to(targetUser.socket_id).emit('message', JSON.stringify({
                                 'ice-candidate': {
                                     candidate: candidate,
                                     socket: socket.id
                                 }
                             }));
                         }
                     } else {
                         io.to(to).emit('message', JSON.stringify({
                             'ice-candidate': {
                                 candidate: candidate,
                                 socket: socket.id
                             }
                         }));
                     }
                } catch (e) {
                     console.error('ICE candidate error:', e);
                }
            }
            
            else if (message['reject-call']) {
                const { to } = message['reject-call'];
                if (!to) return;
                try {
                     io.to(to).emit('message', JSON.stringify({
                         'call-rejected': {
                             socket: socket.id
                         }
                     }));
                } catch (e) {
                    console.error('Reject call error:', e);
                }
            }
            else if (message['call-peer-group']) {
                const { to, offer, teamId, renegotiation } = message['call-peer-group'];
                 try {
                     const User = require('./models/User');
                     const caller = await User.findOne({ socket_id: socket.id });
                     
                     if (activeGroupCalls.has(teamId)) {
                         console.log(`Forwarding GROUP call offer from ${socket.id} to ${to} (renegotiation: ${!!renegotiation})`);
                         io.to(to).emit('message', JSON.stringify({
                             'call-made-group': {
                                 offer: offer,
                                 socket: socket.id, 
                                 user: caller ? { firstname: caller.firstname, picture: caller.picture, _id: caller._id } : socket.id,
                                 teamId,
                                 renegotiation
                             }
                         }));
                     }
                 } catch (e) { console.error('Call peer group error:', e); }
            }
            else if (message['make-answer-group']) {
                const { to, answer } = message['make-answer-group'];
                console.log(`Forwarding GROUP answer to ${to}`);
                io.to(to).emit('message', JSON.stringify({
                    'answer-made-group': {
                        answer: answer,
                        socket: socket.id
                    }
                }));
            }
            else if (message['ice-candidate-group']) {
                const { to, candidate } = message['ice-candidate-group'];
                io.to(to).emit('message', JSON.stringify({
                     'ice-candidate-group': {
                         candidate: candidate,
                         socket: socket.id
                     }
                }));
            }
            else if (message['hang-up']) {
                const { to } = message['hang-up'];
                if (!to) return;
                try {
                     // Cleanup Active Call
                     if (activeCalls.has(socket.id)) {
                         activeCalls.get(socket.id).delete(to);
                         if (activeCalls.get(socket.id).size === 0) activeCalls.delete(socket.id);
                     }
                     if (activeCalls.has(to)) {
                         activeCalls.get(to).delete(socket.id);
                         if (activeCalls.get(to).size === 0) activeCalls.delete(to);
                     }
                     broadcastCallCount();
                     broadcastUserCallStatus(socket.id);
                     broadcastUserCallStatus(to);

                     if (typeof to === 'string' && to.match(/^[0-9a-fA-F]{24}$/)) {
                          const User = require('./models/User');
                          const targetUser = await User.findById(to);
                          if (targetUser && targetUser.socket_id) {
                               io.to(targetUser.socket_id).emit('message', JSON.stringify({
                                  'call-ended': { socket: socket.id }
                               }));
                          }
                     } else {
                          io.to(to).emit('message', JSON.stringify({
                              'call-ended': { socket: socket.id }
                           }));
                     }
                } catch (e) {
                    console.error('Hang up error:', e);
                }
            }

            else if (message.get_active_calls) {
                const count = getActiveCallsCount();
                socket.emit('message', JSON.stringify({ active_calls_count: count }));
            }
            else {
                 // Determine where to route other messages
                 // For now, echo or specific logic could go here
                 console.log(`Unhandled message keys: ${Object.keys(message)}`);
            }

        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    socket.on('disconnect', async () => {
        try {
            console.log('User disconnected:', socket.id);

            // Cleanup Active Group Calls
            for (const [teamId, participants] of activeGroupCalls) {
                const userToRemove = [...participants].find(p => p.socketId === socket.id);
                if (userToRemove) {
                    try {
                        const Team = require('./models/Team');
                        const User = require('./models/User');
                        const team = await Team.findById(teamId).populate('owner').populate('members');
                        
                        if (team) {
                            const recipients = [...team.members, team.owner];
                            if (userToRemove.userId === (team.owner._id.toString() || team.owner)) {
                                // OWNER DISCONNECTED
                                activeGroupCalls.delete(teamId);
                                recipients.forEach(r => {
                                    if (r && r.socket_id && r.is_online && r.socket_id !== socket.id) {
                                        io.to(r.socket_id).emit('message', JSON.stringify({ 'team-call-ended': { teamId: teamId } }));
                                    }
                                });
                            } else {
                                // MEMBER DISCONNECTED
                                participants.delete(userToRemove);
                                const isActive = participants.size > 0;
                                
                                recipients.forEach(r => {
                                    if (r && r.socket_id && r.is_online && r.socket_id !== socket.id) {
                                        io.to(r.socket_id).emit('message', JSON.stringify({
                                            'participant-left': { socket: socket.id, teamId: teamId }
                                        }));
                                        io.to(r.socket_id).emit('message', JSON.stringify({
                                           'participant-left-notification': { 
                                               teamId: teamId, 
                                               firstname: userToRemove.user?.firstname || 'Un participant' 
                                           } 
                                       }));
                                        io.to(r.socket_id).emit('message', JSON.stringify({
                                            'team-call-status': {
                                                teamId: team._id,
                                                active: isActive,
                                                participants: Array.from(participants),
                                                ownerId: team.owner._id
                                            }
                                        }));
                                    }
                                });
                                if (participants.size === 0) activeGroupCalls.delete(teamId);
                            }
                        }
                    } catch (e) {
                        console.error("[DISCONNECT] Error cleaning up group call:", e);
                    }
                }
            }

            // Cleanup Active Calls (1-on-1)
            if (activeCalls.has(socket.id)) {
                const targets = activeCalls.get(socket.id);
                targets.forEach(targetId => {
                    if (activeCalls.has(targetId)) {
                        activeCalls.get(targetId).delete(socket.id);
                        if (activeCalls.get(targetId).size === 0) activeCalls.delete(targetId);
                    }
                });
                activeCalls.delete(socket.id);
                broadcastCallCount();
                broadcastUserCallStatus(socket.id).catch(e => console.error(e));
            }

            const User = require('./models/User');
            const user = await User.findOne({ socket_id: socket.id });
            if (user) {
                user.is_online = false;
                user.last_seen = Date.now();
                await user.save();
                broadcastUserOnlineStatus(user._id, false).catch(e => console.error(e));
            }
        } catch (err) {
            console.error('Disconnect handler error:', err);
        }
    });
    // Handshake for CanalSocketio
        socket.on('demande_liste', () => {
        console.log('Received demande_liste');
        const listes = {
            emission: ['login_status', 'registration_status', 'users', 'user_updating status', 'user_deleting_status', 'receive_friend_request', 'friend_request_accepted', 'messages', 'friends', 'auth status', 'friend_removed', 'last_messages', 'user_status_changed', 'user_registered', 'user_updated', 'user_deleted', 'team_creating_status', 'teams', 'receive_team_message', 'team_messages', 'leave_team_status', 'team_deleting_status', 'team_updating_status', 'files', 'file_uploading_status', 'file_updating_status', 'file_deleting_status', 'spaces', 'space_creating_status', 'space_deleting_status', 'space_renaming_status', 'resolved_path', 'call-made', 'answer-made', 'ice-candidate', 'call-rejected', 'call-ended', 'active_calls_count', 'user_call_status_changed', 'call-made-group', 'answer-made-group', 'ice-candidate-group', 'team-call-status', 'notify-new-joiner', 'participant-left', 'team-call-ended', 'join-request-received', 'join-request-status', 'participant-left-notification'],
            abonnement: ['login', 'register', 'get users', 'update user', 'delete_user', 'friend_request', 'friend_response', 'send message', 'get messages', 'mark_messages_read', 'get friends', 'authenticate', 'remove_friend', 'get_last_messages', 'create team', 'get teams', 'team_message', 'get_team_messages', 'leave_team', 'delete team', 'add_team_member', 'remove_team_member', 'get_files', 'get file', 'upload_file', 'update file', 'delete_file', 'create_space', 'get_spaces', 'delete_space', 'rename_space', 'resolve_path', 'call-user', 'make-answer', 'ice-candidate', 'reject-call', 'hang-up', 'call-team', 'get_active_calls', 'call-peer-group', 'make-answer-group', 'ice-candidate-group', 'leave-group-call', 'join-request-response']
        };
        socket.emit('donne_liste', JSON.stringify(listes));
    });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
