const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/visioconf')
    .then(async () => {
        console.log('MongoDB Connected for Seeding');
        
        const userData = {
            _id: "693ad4db81d0ee5607e16573",
            firstname: "Dev",
            email: "dev@visioconf.com",
            password: "d3vV1s10C0nf",
            emailVerified: false,
            role: "admin",
            banned: false,
            socket_id: "none",
            phone: "06 42 58 66 95",
            status: "waiting",
            desc: "Admin de la plateforme",
            picture: "default_profile_picture.png",
            is_online: false,
            disturb_status: "available",
            last_connection: 1765463259494,
            direct_manager: "none"
        };

        try {
            await User.findOneAndUpdate(
                { email: userData.email },
                { $set: userData },
                { upsert: true, new: true }
            );
            console.log('User seeded/updated successfully');
        } catch (e) {
            console.error('Error seeding user:', e);
        }

        mongoose.connection.close();
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });
