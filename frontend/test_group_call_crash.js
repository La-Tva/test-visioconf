const io = require('socket.io-client');

const URL = 'http://localhost:4000';

function createClient(name) {
    const socket = io(URL, { forceNew: true });
    socket.name = name;
    return socket;
}

const clientA = createClient('Client A (Owner)');
const clientB = createClient('Client B (Participant)');
const clientC = createClient('Client C (Participant)');

// Unique users for this run
const ts = Date.now();
const userA_Email = `alice_${ts}@test.com`;
const userB_Email = `bob_${ts}@test.com`;
const userC_Email = `charlie_${ts}@test.com`;

let userA_ID, userB_ID, userC_ID;
let team_ID;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function login(client, email, name) {
    return new Promise(resolve => {
        client.on('connect', () => {
            console.log(`[${name}] Connected`);
            client.emit('demande_liste');
            client.emit('message', JSON.stringify({
                register: { email, password: 'password', firstname: name }
            }));
        });

        client.on('message', (raw) => {
            const msg = JSON.parse(raw);
            if (msg.registration_status && msg.registration_status.success) {
                client.emit('message', JSON.stringify({
                   login: { email, password: 'password' }
                }));
            }
            if (msg.login_status && msg.login_status.success) {
                console.log(`[${name}] Logged in as ${msg.login_status.user._id}`);
                resolve(msg.login_status.user._id);
            }
        });
    });
}

async function runTest() {
    console.log(`🏁 Starting Group Call (Crash) Test... TS=${ts}`);

    // 1. Login all
    [userA_ID, userB_ID, userC_ID] = await Promise.all([
        login(clientA, userA_Email, 'Alice'),
        login(clientB, userB_Email, 'Bob'),
        login(clientC, userC_Email, 'Charlie')
    ]);

    await sleep(1000);

    // 2. A creates Team with B and C
    console.log('➡️ [A] Creating team with [B, C]...');
    clientA.emit('message', JSON.stringify({
        'create team': { name: 'Crash Test Team ' + ts, ownerId: userA_ID, memberIds: [userB_ID, userC_ID] }
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

    // 3. A starts Call
    console.log('➡️ [A] Starting Team Call...');
    clientA.emit('message', JSON.stringify({
        'call-team': { teamId: team_ID, offer: {} } // Dummy offer
    }));

    await sleep(1000);

    // 4. B Joins Call
    console.log('➡️ [B] Joining Team Call...');
    clientB.emit('message', JSON.stringify({
        'call-team': { teamId: team_ID, offer: {} }
    }));
    
    // A accepts B
    // We simulate A checking join requests, but for now we look for notification
    // The server sends 'join-request-received' to Owner
    // We can just send 'join-request-response' from A automatically if we wanted, 
    // but here let's manually trigger it after a delay
    
    await sleep(500);
    console.log('➡️ [A] Accepting B...');
    clientA.emit('message', JSON.stringify({
        'join-request-response': { teamId: team_ID, requesterSocketId: clientB.id, accepted: true }
    }));

    await sleep(1000);

    // 5. C Joins Call (The Crash Trigger?)
    console.log('➡️ [C] Joining Team Call...');
    clientC.emit('message', JSON.stringify({
        'call-team': { teamId: team_ID, offer: {} }
    }));

    await sleep(500);
    console.log('➡️ [A] Accepting C...');
    clientA.emit('message', JSON.stringify({
        'join-request-response': { teamId: team_ID, requesterSocketId: clientC.id, accepted: true }
    }));

    await sleep(2000);
    console.log('✅ If server is still alive, test PASSED.');
    
    clientA.close();
    clientB.close();
    clientC.close();
    process.exit(0);
}

runTest().catch(console.error);
