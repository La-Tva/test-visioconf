const mongoose = require('mongoose');
const User = require('./backend/models/User');
require('dotenv').config({ path: './backend/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const admin = await User.findOne({ role: 'admin' });
    console.log('ADMIN_ID:', admin._id.toString());
    process.exit();
});
