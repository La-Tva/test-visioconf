const User = require('../models/User');
const crypto = require('crypto');

class AuthService {
    controleur;
    nomDInstance;
    io;

    listeDesMessagesEmis = [
        'login_status', 'registration_status', 'auth status',
        'user_registered', 'user_status_changed'
    ];
    listeDesMessagesRecus = [
        'login', 'register', 'authenticate',
        'client_deconnexion'
    ];

    constructor(controleur, io, nom) {
        this.controleur = controleur;
        this.io = io;
        this.nomDInstance = nom || 'AuthService';
        this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
        console.log(`[${this.nomDInstance}] Service enregistré auprès du controleur`);
    }

    async traitementMessage(mesg) {
        const socketId = mesg.id;

        if (mesg.login) {
            await this.handleLogin(socketId, mesg.login);
        }
        else if (mesg.register) {
            await this.handleRegister(socketId, mesg.register);
        }
        else if (mesg.authenticate) {
            await this.handleAuthenticate(socketId, mesg.authenticate);
        }
        else if (mesg.client_deconnexion) {
            await this.handleDisconnect(mesg.client_deconnexion);
        }
    }

    async handleLogin(socketId, data) {
        const { email, password } = data;
        console.log(`Login attempt for: ${email}`);
        try {
            const user = await User.findOne({ email });
            if (!user) {
                return this.controleur.envoie(this, {
                    login_status: { success: false, error: 'User not found' },
                    id: socketId
                });
            }
            if (user.password !== password) {
                return this.controleur.envoie(this, {
                    login_status: { success: false, error: 'Invalid password' },
                    id: socketId
                });
            }
            user.socket_id = socketId;
            user.is_online = true;
            await user.save();

            this.controleur.envoie(this, {
                login_status: { success: true, user },
                id: socketId
            });

            this.broadcastOnlineStatus(user._id, true);
        } catch (err) {
            console.error('Login error:', err);
            this.controleur.envoie(this, {
                login_status: { success: false, error: 'Server error' },
                id: socketId
            });
        }
    }

    async handleRegister(socketId, data) {
        const { email, password, firstname } = data;
        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return this.controleur.envoie(this, {
                    registration_status: { success: false, error: 'Email already taken' },
                    id: socketId
                });
            }
            const newUser = new User({ email, password, firstname });
            await newUser.save();
            this.controleur.envoie(this, {
                registration_status: { success: true },
                id: socketId
            });
            // Broadcast new registration
            this.controleur.envoie(this, {
                user_registered: newUser
            });
        } catch (err) {
            console.error('Register error:', err);
            this.controleur.envoie(this, {
                registration_status: { success: false, error: 'Internal Error' },
                id: socketId
            });
        }
    }

    async handleAuthenticate(socketId, data) {
        const { _id } = data;
        console.log(`Identify request for ${_id}`);
        try {
            const user = await User.findById(_id).populate('friendRequests', 'firstname email');
            if (user) {
                user.socket_id = socketId;
                user.is_online = true;
                await user.save();
                console.log(`User ${_id} identified and set online. Socket: ${socketId}`);

                this.broadcastOnlineStatus(_id, true);

                this.controleur.envoie(this, {
                    'auth status': { success: true, user },
                    id: socketId
                });
            } else {
                console.log(`User ${_id} not found for identification`);
            }
        } catch (e) {
            console.error('Identify error:', e);
        }
    }

    async handleDisconnect(socketId) {
        console.log('User disconnected:', socketId);
        try {
            const user = await User.findOne({ socket_id: socketId });
            if (user) {
                user.is_online = false;
                user.last_seen = Date.now();
                await user.save();
                this.broadcastOnlineStatus(user._id, false);
            }
        } catch (err) {
            console.error('Disconnect handler error:', err);
        }
    }

    broadcastOnlineStatus(userId, is_online) {
        this.controleur.envoie(this, {
            user_status_changed: { userId, is_online }
        });
    }
}

module.exports = AuthService;
