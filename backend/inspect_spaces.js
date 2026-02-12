const mongoose = require('mongoose');
const User = require('./models/User'); 
const Space = require('./models/Space');
const File = require('./models/File');

mongoose.connect('mongodb://localhost:27017/visioconf')
    .then(async () => {
        console.log("Connected to DB");
        
        console.log("\n--- SPACES ---");
        const spaces = await Space.find({});
        spaces.forEach(s => {
            console.log(`Name: ${s.name}, Category: ${s.category}, IsPersonal: ${s.isPersonal}, Owner: ${s.owner}, Parent: ${s.parent}`);
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
