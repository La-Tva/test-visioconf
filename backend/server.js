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

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/visioconf')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));
    
// Call Tracking
const activeCalls = new Map(); // socketId -> Set of targetSocketIds
function getActiveCallsCount() {
    let totalPairs = 0;
    activeCalls.forEach(targets => totalPairs += targets.size);
    return Math.floor(totalPairs / 2);
}

function broadcastCallCount() {
    const count = getActiveCallsCount();
    io.emit('message', JSON.stringify({ active_calls_count: count }));
}

async function broadcastUserCallStatus(socketId) {
    const isInCall = activeCalls.has(socketId);
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
}

async function broadcastUserOnlineStatus(userId, is_online) {
    io.emit('message', JSON.stringify({
        user_status_changed: {
            userId: userId,
            is_online: is_online
        }
    }));
}

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

                    // Populate members for response
                    await newTeam.populate('members', 'firstname email is_online picture role');
                    
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
                     }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');
 
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
                             team.unreadCounts.set(userId, 0);
                             await team.save();
                             
                             // Send updated team list (to clear bubble in sidebar)
                             const myTeams = await Team.find({
                                $or: [ { owner: userId }, { members: userId } ]
                             }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');

                             socket.emit('message', JSON.stringify({
                                 teams: {
                                     teams: myTeams
                                 }
                             }));
                         }
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
                                const currentCount = team.unreadCounts.get(userId) || 0;
                                team.unreadCounts.set(userId, currentCount + 1);
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
                                     }).populate('members', 'firstname picture is_online role').populate('owner', 'firstname role');

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

            // Handle Get Files (Global Drive style with Space filtering)
            else if (message.get_files) {
                const { teamId, spaceId } = message.get_files;
                try {
                    let query = teamId ? { team: teamId } : { team: { $exists: false } };
                    if (spaceId) {
                        query.space = spaceId;
                    } else if (!teamId) {
                        // If root and no team, show only files NOT in a space? 
                        // Or show all anyway? User said "spaces" so likely folders.
                        // Let's show only files in that space if spaceId is provided.
                        // If no spaceId, show files at root (space: null/exists false).
                        query.space = { $exists: false };
                    }

                    const files = await File.find(query).populate('owner', 'firstname role').sort({ createdAt: -1 });
                    socket.emit('message', JSON.stringify({
                        files: {
                            success: true,
                            files: files
                        }
                    }));
                } catch (e) {
                    console.error('Get files error:', e);
                }
            }
            // Handle Upload File (Restricted to admin/enseignant)
            else if (message.upload_file) {
                const { name, size, type, url, userId, teamId } = message.upload_file;
                try {
                    const user = await User.findById(userId);
                    if (!user || (user.role !== 'admin' && user.role !== 'enseignant')) {
                        return socket.emit('message', JSON.stringify({
                            file_uploading_status: { success: false, error: 'Permission refusée' }
                        }));
                    }

                    const newFile = new File({
                        name, size, type, url, owner: userId, team: teamId,
                        space: message.upload_file.spaceId || undefined
                    });
                    await newFile.save();
                    // Broadcast success
                    io.emit('message', JSON.stringify({
                        file_uploading_status: { success: true, file: newFile }
                    }));
                } catch (e) {
                    console.error('Upload file error:', e);
                    socket.emit('message', JSON.stringify({
                        file_uploading_status: { success: false, error: 'Erreur lors de l\'upload' }
                    }));
                }
            }
            // Handle Get Spaces
            else if (message.get_spaces) {
                try {
                    const spaces = await Space.find().sort({ name: 1 });
                    socket.emit('message', JSON.stringify({
                        spaces: {
                            success: true,
                            spaces: spaces
                        }
                    }));
                } catch (e) {
                    console.error('Get spaces error:', e);
                }
            }
            // Handle Create Space (Restricted to admin/enseignant)
            else if (message.create_space) {
                const { name, userId } = message.create_space;
                try {
                    const user = await User.findById(userId);
                    if (!user || (user.role !== 'admin' && user.role !== 'enseignant')) {
                        return socket.emit('message', JSON.stringify({
                            space_creating_status: { success: false, error: 'Permission refusée' }
                        }));
                    }
                    const newSpace = new Space({ name, owner: userId });
                    await newSpace.save();
                    // Broadcast success
                    io.emit('message', JSON.stringify({
                        space_creating_status: { success: true, space: newSpace }
                    }));
                } catch (e) {
                    console.error('Create space error:', e);
                }
            }
            // Handle Delete Space (Restricted to admin/enseignant)
            else if (message.delete_space) {
                const { spaceId, userId } = message.delete_space;
                try {
                    const user = await User.findById(userId);
                    if (!user || (user.role !== 'admin' && user.role !== 'enseignant')) {
                        return socket.emit('message', JSON.stringify({
                            space_deleting_status: { success: false, error: 'Permission refusée' }
                        }));
                    }
                    
                    // Unlink files from this space before deleting
                    await File.updateMany({ space: spaceId }, { $unset: { space: "" } });
                    
                    await Space.findByIdAndDelete(spaceId);
                    
                    // Broadcast success
                    io.emit('message', JSON.stringify({
                        space_deleting_status: { success: true, spaceId: spaceId }
                    }));
                } catch (e) {
                    console.error('Delete space error:', e);
                    socket.emit('message', JSON.stringify({
                        space_deleting_status: { success: false, error: 'Erreur lors de la suppression' }
                    }));
                }
            }

            // Handle Delete File (Restricted to admin/enseignant)
            else if (message.delete_file) {
                const { fileId, userId } = message.delete_file;
                try {
                    const user = await User.findById(userId);
                    if (!user || (user.role !== 'admin' && user.role !== 'enseignant')) {
                        return socket.emit('message', JSON.stringify({
                            'file deleting status': { success: false, error: 'Permission refusée' }
                        }));
                    }

                    const file = await File.findById(fileId);
                    if (file) {
                        await File.findByIdAndDelete(fileId);
                        // Broadcast to ALL users so the file disappears for everyone immediately
                        io.emit('message', JSON.stringify({
                            file_deleting_status: { success: true, fileId: fileId }
                        }));
                    }
                } catch (e) {
                    console.error('Delete file error:', e);
                    socket.emit('message', JSON.stringify({
                        'file deleting status': { success: false, error: 'Erreur lors de la suppression' }
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
                        const recipients = [...team.members, team.owner];
                        console.log(`Blast dialing team ${team.name} (${recipients.length} members) from ${caller.firstname}`);
                        
                        for (const recipient of recipients) {
                             // Don't call self
                             if (recipient._id.toString() !== caller._id.toString() && recipient.socket_id && recipient.is_online) {
                                 io.to(recipient.socket_id).emit('message', JSON.stringify({
                                     'call-made': {
                                         offer: offer,
                                         socket: socket.id,
                                         user: { firstname: caller.firstname, picture: caller.picture, _id: caller._id },
                                         isGroupCall: true, 
                                         teamName: team.name
                                     }
                                 }));
                             }
                        }
                    }
                } catch (e) {
                    console.error('Call team error:', e);
                }
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
                socket.emit('message', JSON.stringify({ active_calls_count: getActiveCallsCount() }));
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
        console.log('User disconnected:', socket.id);
        
        // Cleanup Active Calls
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
            broadcastUserCallStatus(socket.id);
        }

        const user = await User.findOne({ socket_id: socket.id });
        if (user) {
            user.is_online = false;
            user.last_seen = Date.now();
            await user.save();
            broadcastUserOnlineStatus(user._id, false);
        }
    });
    // Handshake for CanalSocketio
        socket.on('demande_liste', () => {
        console.log('Received demande_liste');
        const listes = {
            emission: ['login_status', 'registration_status', 'users', 'user_updating status', 'user_deleting_status', 'receive_friend_request', 'friend_request_accepted', 'messages', 'friends', 'auth status', 'friend_removed', 'last_messages', 'user_status_changed', 'user_registered', 'user_updated', 'user_deleted', 'team_creating_status', 'teams', 'receive_team_message', 'team_messages', 'leave_team_status', 'team_deleting_status', 'team_updating_status', 'files', 'file_uploading_status', 'file_updating_status', 'file_deleting_status', 'spaces', 'space_creating_status', 'space_deleting_status', 'call-made', 'answer-made', 'ice-candidate', 'call-rejected', 'call-ended', 'active_calls_count', 'user_call_status_changed'],
            abonnement: ['login', 'register', 'get users', 'update user', 'delete_user', 'friend_request', 'friend_response', 'send message', 'get messages', 'get friends', 'authenticate', 'remove_friend', 'get_last_messages', 'create team', 'get teams', 'team_message', 'get_team_messages', 'leave_team', 'delete team', 'add_team_member', 'remove_team_member', 'get_files', 'get file', 'upload_file', 'update file', 'delete_file', 'create_space', 'get_spaces', 'delete_space', 'call-user', 'make-answer', 'ice-candidate', 'reject-call', 'hang-up', 'call-team', 'get_active_calls']
        };
        socket.emit('donne_liste', JSON.stringify(listes));
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
