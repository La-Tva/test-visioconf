const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Team = require('./models/Team');
const Message = require('./models/Message');

async function populate() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/visioconf');
        console.log('Connected to MongoDB');

        // 1. Create Test Users
        const usersData = [
            { _id: "696cec9af6b3f78da2d10c5e", firstname: "Thomas", email: "thomas@exemple.com", password: "password123", role: "etudiant" },
            { _id: "696cec9af6b3f78da2d10c5f", firstname: "Sophie", email: "sophie@exemple.com", password: "password123", role: "etudiant" }
        ];

        for (const uData of usersData) {
             // Try searching by ID first
             let user = await User.findById(uData._id);
             if (!user) {
                 // Try searching by Email
                 user = await User.findOne({ email: uData.email });
             }

             if (user) {
                 // Update existing user (don't try to change _id)
                 const { _id, ...updateData } = uData;
                 await User.findByIdAndUpdate(user._id, { $set: updateData });
                 console.log(`User ${uData.firstname} updated`);
             } else {
                 // Create new user
                 await User.create(uData);
                 console.log(`User ${uData.firstname} created`);
             }
        }

        // 2. Add Friends to Admin
        const admin = await User.findOne({ email: 'dev@visioconf.com' });
        const thomas = await User.findOne({ email: 'thomas@exemple.com' });
        const sophie = await User.findOne({ email: 'sophie@exemple.com' });

        if (admin && thomas && sophie) {
            await User.findByIdAndUpdate(admin._id, { $addToSet: { friends: [thomas._id, sophie._id] } });
            await User.findByIdAndUpdate(thomas._id, { $addToSet: { friends: [admin._id] } });
            await User.findByIdAndUpdate(sophie._id, { $addToSet: { friends: [admin._id] } });
            console.log('Friends links verified');
        }

        // 3. Create a Team
        const existingTeam = await Team.findOne({ name: "Projet Visioconf" });
        if (!existingTeam && admin && thomas) {
            const newTeam = new Team({
                name: "Projet Visioconf",
                owner: admin._id,
                members: [thomas._id, sophie._id],
                unreadCounts: new Map()
            });
            await newTeam.save();
            console.log('Test team created');
        }

        // 4. Create some Messages
        if (admin && thomas) {
            const mCount = await Message.countDocuments();
            if (mCount === 0) {
                await Message.create({
                    sender: thomas._id,
                    receiver: admin._id,
                    content: "Salut l'admin ! Tout fonctionne ?"
                });
                console.log('Test message created');
            }
        }

        console.log('RE-POPULATION COMPLETE');
    } catch (err) {
        console.error('Population failed:', err);
    } finally {
        await mongoose.connection.close();
    }
}

populate();
