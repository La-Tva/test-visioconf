const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional if team message
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // Optional if private message
    content: { type: String, required: true },
    read: { type: Boolean, default: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
