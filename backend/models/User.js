const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, default: 'user' }, // default to user, though example had admin
    banned: { type: Boolean, default: false },
    socket_id: { type: String, default: 'none' },
    phone: { type: String },
    status: { type: String, default: 'waiting' },
    desc: { type: String },
    picture: { type: String, default: 'default_profile_picture.png' },
    is_online: { type: Boolean, default: false },
    disturb_status: { type: String, default: 'available' },
    last_connection: { type: Number }, // timestamp as number
    direct_manager: { type: String, default: 'none' },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
    timestamps: true // handles createdAt and updatedAt automatically
});

module.exports = mongoose.model('User', userSchema);
