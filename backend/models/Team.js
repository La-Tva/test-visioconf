const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    unreadCounts: { type: Map, of: Number, default: {} } // Map userId -> count
}, {
    timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
