const mongoose = require('mongoose');
const User = require('./backend/models/User'); // Adjust path as needed
const Space = require('./backend/models/Space');
const File = require('./backend/models/File');

// Connection URL from server.js (assuming localhost/visioconf or similar, checking server.js would be better but standard is usually this)
mongoose.connect('mongodb://localhost:27017/tes-visioconf', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log("Connected to DB");
        
        console.log("\n--- SPACES ---");
        const spaces = await Space.find({});
        spaces.forEach(s => {
            console.log(`Name: ${s.name}, Category: ${s.category}, IsPersonal: ${s.isPersonal}, Owner: ${s.owner}`);
        });

        console.log("\n--- FILES (Root) ---");
        const files = await File.find({ space: { $in: [null, undefined] } });
        files.forEach(f => {
            console.log(`Name: ${f.name}, Category: ${f.category}, Owner: ${f.owner}`);
        });

        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
