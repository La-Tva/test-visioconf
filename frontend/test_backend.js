const io = require('socket.io-client');

const socket = io('http://localhost:4000');

console.log('Attempting to connect to http://localhost:4000...');

socket.on('connect', () => {
    console.log('✅ Connected to server with ID:', socket.id);
    
    // Test fwtozza handshake
    console.log('Sending demande_liste...');
    socket.emit('demande_liste');

    // Test Login (assuming user exists or fail gracefully)
    const loginData = {
        login: {
            email: 'dev@visioconf.com',
            password: 'password123' // Likely wrong, but should get a response
        }
    };
    console.log('Sending login request...');
    socket.emit('message', JSON.stringify(loginData));
});

socket.on('donne_liste', (data) => {
    console.log('✅ Received donne_liste:', JSON.parse(data));
});

socket.on('message', (data) => {
    console.log('📩 Received message:', data);
    const msg = JSON.parse(data);
    if (msg.login_status) {
        console.log('✅ Login response received:', msg.login_status);
        socket.disconnect();
    }
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

setTimeout(() => {
    console.log('Timeout reached, closing socket.');
    socket.close();
}, 5000);
