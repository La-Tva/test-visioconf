const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/visioconf';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to MongoDB');

    try {
        const res = await User.updateMany(
            {},
            [
                {
                    $set: {
                        phone: { $ifNull: ["$phone", ""] },
                        desc: { $ifNull: ["$desc", ""] }
                    }
                }
            ]
        );
        console.log(`Updated ${res.modifiedCount} users.`);
    } catch (error) {
        console.error('Error updating users:', error);
    } finally {
        mongoose.connection.close();
    }
}).catch(err => {
    console.error('Connection error:', err);
});
