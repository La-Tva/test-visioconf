const mongoose = require('mongoose');
const User = require('./backend/models/User'); // Adjust path as needed
require('dotenv').config({ path: './backend/.env' }); // Adjust if .env is elsewhere

const uri = 'mongodb://localhost:27017/visioconf'; 

mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to DB');
    const user = await User.findOne({ email: 'jean.test@example.com' });
    if (user) {
      console.log('User FOUND:', user.firstname, user.email, user.role);
    } else {
      console.log('User NOT FOUND');
    }
    await mongoose.disconnect();
  })
  .catch(err => {
    console.error('DB Error', err);
    process.exit(1);
  });
