const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./backend/models/User');
const Team = require('./backend/models/Team');
const Message = require('./backend/models/Message');

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/visioconf');
        const uCount = await User.countDocuments();
        const tCount = await Team.countDocuments();
        const mCount = await Message.countDocuments();
        const admin = await User.findOne({ email: 'dev@visioconf.com' });
        
        console.log('--- DATABASE INSPECTION ---');
        console.log(`Users: ${uCount}`);
        console.log(`Teams: ${tCount}`);
        console.log(`Messages: ${mCount}`);
        
        if (admin) {
            console.log(`Admin User: ${admin.firstname} (${admin._id})`);
            console.log(`Friends Count: ${admin.friends.length}`);
            
            const adminTeams = await Team.find({
                $or: [{ owner: admin._id }, { members: admin._id }]
            });
            console.log(`Admin Teams: ${adminTeams.length}`);
            
            const adminMessages = await Message.find({
                $or: [{ sender: admin._id }, { receiver: admin._id }]
            });
            console.log(`Admin Private Messages: ${adminMessages.length}`);
        } else {
            console.log('Admin user dev@visioconf.com NOT FOUND');
        }
    } catch (err) {
        console.error('Inspection failed:', err);
    } finally {
        await mongoose.connection.close();
    }
}

inspect();
