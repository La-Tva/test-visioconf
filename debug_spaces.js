const mongoose = require('mongoose');
require('dotenv').config();
const Space = require('./backend/models/Space');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/visioconf');
        console.log('Connected');
        
        const spaces = await Space.find({ name: /Test/i }).populate('parent');
        console.log('Found spaces:', JSON.stringify(spaces, null, 2));
        
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
debug();
