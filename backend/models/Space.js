const mongoose = require('mongoose');

const spaceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Space', default: null },
    category: { type: String, enum: ['personal', 'global', 'team'], default: 'personal' },
    isPersonal: { type: Boolean, default: false } // Keeping for backward compatibility temporarily
}, {
    timestamps: true
});

module.exports = mongoose.model('Space', spaceSchema);
