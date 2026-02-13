require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/User');
const File = require('./models/File');
const Space = require('./models/Space');

// fwtozza Framework
const Controleur = require('./controleur');
const CanalSocketio = require('./canalsocketio');

// Services
const AuthService = require('./services/AuthService');
const UsersService = require('./services/UsersService');
const MessagesService = require('./services/MessagesService');
const TeamsService = require('./services/TeamsService');
const FilesService = require('./services/FilesService');
const CallsService = require('./services/CallsService');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
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

// =====================================================
// Shared State (injected into services that need it)
// =====================================================
const activeCalls = new Map();          // socketId -> Set of targetSocketIds
const activeGroupCalls = new Map();     // teamId -> Set of { socketId, userId, user }
const pendingJoinRequests = new Map();  // teamId -> Set of { socketId, userId, user, timestamp }

// =====================================================
// fwtozza Architecture: Controleur + Canal + Services
// =====================================================
const controleur = new Controleur();
const canal = new CanalSocketio(io, controleur, 'CanalSocketio');
const authService = new AuthService(controleur, io, 'AuthService');
const usersService = new UsersService(controleur, io, 'UsersService');
const messagesService = new MessagesService(controleur, io, 'MessagesService');
const teamsService = new TeamsService(controleur, io, 'TeamsService', activeGroupCalls);
const filesService = new FilesService(controleur, io, 'FilesService');
const callsService = new CallsService(controleur, io, 'CallsService', activeCalls, activeGroupCalls, pendingJoinRequests);

console.log('✅ fwtozza architecture initialisée: Controleur + CanalSocketio + 6 services');

// =====================================================
// REST API Endpoints (remain in server.js)
// =====================================================

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
        let totalPairs = 0;
        activeCalls.forEach(targets => {
            if (targets && targets.size) totalPairs += targets.size;
        });
        res.json({ count: Math.floor(totalPairs / 2) });
    } catch (e) {
        res.json({ count: 0 });
    }
});

// Simple health check
app.get('/', (req, res) => {
    res.send('Server is running');
});

// =====================================================
// Start Server
// =====================================================
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
