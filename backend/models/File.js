const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    size: { type: Number, required: true }, // size in bytes
    type: { type: String, required: true }, // mime type
    url: { type: String, required: true },  // storage url or local path
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // optional, if shared in a team
    space: { type: mongoose.Schema.Types.ObjectId, ref: 'Space' }, // optional, if in a space
}, {
    timestamps: true
});

module.exports = mongoose.model('File', fileSchema);
