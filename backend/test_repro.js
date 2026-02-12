const mongoose = require('mongoose');
const io = require('C:/Users/Toto/Sites/tes-visioconf/frontend/node_modules/socket.io-client');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/visioconf';

async function run() {
    try {
        await mongoose.connect(uri);
        const user = await mongoose.model('User', new mongoose.Schema({ 
            email: String, role: String, firstname: String 
        })).findOne({ role: 'admin' });
        
        if (!user) {
            console.error('No admin user found');
            process.exit(1);
        }
        
        const userId = user._id.toString();
        console.log('Using Admin ID:', userId);

        // Find a team space or create dummy
        const Space = mongoose.model('Space', new mongoose.Schema({ name: String, category: String }));
        let space = await Space.findOne({ category: 'team' });
        
        let spaceId = space ? space._id.toString() : null;
        console.log('Using Space ID:', spaceId);

        const socket = io('http://localhost:4001', {
            transports: ['websocket'],
            forceNew: true
        });

        socket.on('connect', () => {
            console.log('Socket connected');
            
            // 1. Upload File
            const uploadPayload = {
                name: 'debug_test.txt',
                size: 123,
                type: 'text/plain',
                url: '#',
                userId: userId,
                spaceId: spaceId, // might be null if no team space
                category: 'team'
            };
            console.log('Sending upload_file:', uploadPayload);
            socket.emit('message', JSON.stringify({ upload_file: uploadPayload }));
        });

        socket.on('message', (data) => {
            const msg = JSON.parse(data);
            if (msg.file_uploading_status) {
                console.log('Upload Status:', msg.file_uploading_status);
                // 2. Get Files (simulate refresh)
                const getPayload = {
                    userId: userId,
                    spaceId: spaceId,
                    category: 'team'
                };
                console.log('Sending get_files:', getPayload);
                socket.emit('message', JSON.stringify({ get_files: getPayload }));
            }
            if (msg.files) {
                console.log('Get Files Result:', msg.files);
                if (msg.files.success) {
                    const found = msg.files.files.find(f => f.name === 'debug_test.txt');
                    console.log('Found debug_test.txt?', !!found);
                }
                setTimeout(() => process.exit(0), 1000);
            }
        });

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
