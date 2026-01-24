const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./backend/models/User');
const Team = require('./backend/models/Team');
const Message = require('./backend/models/Message');

async function populate() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/visioconf');
        console.log('Connected to MongoDB');

        // 1. Create Test Users
        const users = [
            { _id: "696cec9af6b3f78da2d10c5e", firstname: "Thomas", email: "thomas@exemple.com", password: "password123", role: "etudiant" },
            { _id: "696cec9af6b3f78da2d10c5f", firstname: "Sophie", email: "sophie@exemple.com", password: "password123", role: "etudiant" }
        ];

        for (const u of users) {
            await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
        }
        console.log('Test users created/updated');

        // 2. Add Friends to Admin
        const admin = await User.findOne({ email: 'dev@visioconf.com' });
        const thomas = await User.findOne({ email: 'thomas@exemple.com' });
        const sophie = await User.findOne({ email: 'sophie@exemple.com' });

        if (admin && thomas && sophie) {
            admin.friends = [thomas._id, sophie._id];
            await admin.save();
            
            thomas.friends = [admin._id];
            await thomas.save();
            
            sophie.friends = [admin._id];
            await sophie.save();
            console.log('Friends links created');
        }

        // 3. Create a Team
        const existingTeam = await Team.findOne({ name: "Projet Visioconf" });
        if (!existingTeam && admin && thomas) {
            const newTeam = new Team({
                name: "Projet Visioconf",
                owner: admin._id,
                members: [thomas._id, sophie._id]
            });
            await newTeam.save();
            console.log('Test team "Projet Visioconf" created');
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
