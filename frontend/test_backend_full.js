const io = require('socket.io-client');

const URL = 'http://localhost:4000';

function createClient(name) {
    const socket = io(URL, { forceNew: true });
    socket.name = name;
    return socket;
}

const clientA = createClient('Client A');
const clientB = createClient('Client B');

// Unique users for this run
const ts = Date.now();
const userA_Email = `alice_${ts}@test.com`;
const userB_Email = `bob_${ts}@test.com`;

let userA_ID = null;
let userB_ID = null;
let team_ID = null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runTest() {
    console.log(`🏁 Starting Full Backend Test... TS=${ts}`);

    // --- 1. Register & Login A ---
    await new Promise(resolve => {
        clientA.on('connect', () => {
            console.log('[A] Connected');
            clientA.emit('demande_liste');
            
            // Register first
            clientA.emit('message', JSON.stringify({
                register: { email: userA_Email, password: 'password', firstname: 'Alice' }
            }));
        });

        clientA.on('message', (raw) => {
            const msg = JSON.parse(raw);
            
            // Handle Registration Success -> Auto Login usually not implied, so we login manually
            if (msg.registration_status && msg.registration_status.success) {
                console.log('[A] Registered. Logging in...');
                clientA.emit('message', JSON.stringify({
                   login: { email: userA_Email, password: 'password' }
                }));
            }

            if (msg.login_status && msg.login_status.success) {
                userA_ID = msg.login_status.user._id;
                console.log(`[A] Logged in as ${userA_ID}`);
                resolve();
            }
        });
    });

    // --- 2. Register & Login B ---
    await new Promise(resolve => {
        clientB.on('connect', () => {
            console.log('[B] Connected');
            clientB.emit('demande_liste');
            
            // Register first
            clientB.emit('message', JSON.stringify({
                register: { email: userB_Email, password: 'password', firstname: 'Bob' }
            }));
        });

        clientB.on('message', (raw) => {
            const msg = JSON.parse(raw);
            
            if (msg.registration_status && msg.registration_status.success) {
                console.log('[B] Registered. Logging in...');
                clientB.emit('message', JSON.stringify({
                   login: { email: userB_Email, password: 'password' }
                }));
            }

            if (msg.login_status && msg.login_status.success) {
                userB_ID = msg.login_status.user._id;
                console.log(`[B] Logged in as ${userB_ID}`);
                resolve();
            }
        });
    });

    console.log('✅ Auth verified for both users');
    await sleep(1000);

    // --- 3. Private Message ---
    console.log('➡️ [A] Sending private message to [B]...');
    clientA.emit('message', JSON.stringify({
        'send message': { senderId: userA_ID, receiverId: userB_ID, content: 'Hello Bob!' }
    }));

    await new Promise(resolve => {
        clientB.on('message', (raw) => {
            const msg = JSON.parse(raw);
            if (msg.receive_private_message) {
                console.log(`[B] Received private message: "${msg.receive_private_message.content}"`);
                if (msg.receive_private_message.content === 'Hello Bob!') resolve();
            }
        });
    });
    console.log('✅ MessagesService verified');

    // --- 4. Create Team ---
    console.log('➡️ [A] Creating team with [B]...');
    clientA.emit('message', JSON.stringify({
        'create team': { name: 'Dream Team ' + ts, ownerId: userA_ID, memberIds: [userB_ID] }
    }));

    await new Promise(resolve => {
        clientA.on('message', (raw) => {
            const msg = JSON.parse(raw);
            if (msg.team_creating_status && msg.team_creating_status.success) {
                team_ID = msg.team_creating_status.team._id;
                console.log(`[A] Team created: ${team_ID}`);
                resolve();
            }
        });
    });

    // --- 5. Team Message ---
    console.log(`➡️ [B] Sending message to Team ${team_ID}...`);
    clientB.emit('message', JSON.stringify({
        team_message: { senderId: userB_ID, teamId: team_ID, content: 'Hello Team!' }
    }));

    await new Promise(resolve => {
        clientA.on('message', (raw) => {
            const msg = JSON.parse(raw);
            if (msg.receive_team_message) {
                console.log(`[A] Received team message: "${msg.receive_team_message.message.content}"`);
                if (msg.receive_team_message.message.content === 'Hello Team!') resolve();
            }
        });
    });
    console.log('✅ TeamsService verified');

    console.log('🎉 Full Integration Test Passed!');
    clientA.close();
    clientB.close();
    process.exit(0);
}

runTest();
