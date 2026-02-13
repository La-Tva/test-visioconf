/**
 * CanalSocketio côté serveur — fwtozza framework
 * 
 * Pont entre socket.io et le contrôleur.
 * - Reçoit les messages des clients via socket.on('message')
 * - Les transmet au contrôleur avec l'id du socket
 * - Reçoit les messages du contrôleur via traitementMessage()
 * - Les envoie aux clients ciblés (ou broadcast)
 */
class CanalSocketio {

    controleur;
    nomDInstance;
    io; // socket.io Server instance
    verbose = false;

    // Messages que le canal ÉMET vers le contrôleur (= ce que les clients envoient)
    listeDesMessagesEmis = [
        'login', 'register', 'get users', 'update user', 'delete_user',
        'friend_request', 'friend_response', 'send message', 'get messages',
        'mark_messages_read', 'get friends', 'authenticate', 'remove_friend',
        'get_last_messages',
        'create team', 'get teams', 'team_message', 'get_team_messages',
        'leave_team', 'delete team', 'add_team_member', 'remove_team_member',
        'get_files', 'upload_file', 'update_file', 'delete_file',
        'create_space', 'get_spaces', 'delete_space', 'rename_space', 'resolve_path',
        'call-user', 'make-answer', 'ice-candidate', 'reject-call', 'hang-up',
        'call-team', 'get_active_calls',
        'call-peer-group', 'make-answer-group', 'ice-candidate-group',
        'leave-group-call', 'join-request-response',
        'client_deconnexion'
    ];

    // Messages que le canal REÇOIT du contrôleur (= ce que les services envoient aux clients)
    listeDesMessagesRecus = [
        'login_status', 'registration_status', 'users', 'user_updating status',
        'user_deleting_status', 'receive_friend_request', 'friend_request_accepted',
        'messages', 'friends', 'auth status', 'friend_removed', 'last_messages',
        'user_status_changed', 'user_registered', 'user_updated', 'user_deleted',
        'team_creating_status', 'teams', 'receive_team_message', 'team_messages',
        'leave_team_status', 'team_deleting_status', 'team_updating_status',
        'files', 'file_uploading_status', 'file_updating_status', 'file_deleting_status',
        'spaces', 'space_creating_status', 'space_deleting_status', 'space_renaming_status',
        'resolved_path',
        'call-made', 'answer-made', 'ice-candidate', 'call-rejected', 'call-ended',
        'active_calls_count', 'user_call_status_changed',
        'call-made-group', 'answer-made-group', 'ice-candidate-group',
        'team-call-status', 'notify-new-joiner', 'participant-left',
        'team-call-ended', 'join-request-received', 'join-request-status',
        'participant-left-notification',
        'receive_private_message'
    ];

    constructor(ioServer, controleur, nom) {
        this.controleur = controleur;
        this.io = ioServer;
        this.nomDInstance = nom;

        if (this.controleur.verboseall || this.verbose)
            console.log("INFO (" + this.nomDInstance + "): CanalSocketio s'enregistre auprès du controleur");

        this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);

        // Handle socket connections
        this.io.on('connection', (socket) => {
            console.log('User connected:', socket.id);

            // fwtozza handshake: client asks for message lists
            socket.on('demande_liste', () => {
                console.log('Received demande_liste from', socket.id);
                const T = {
                    // Client will EMIT these (= server RECEIVES = canal's listeDesMessagesRecus from controleur perspective)
                    emission: this.listeDesMessagesRecus,
                    // Client will RECEIVE these (= server EMITS = canal's listeDesMessagesEmis)
                    abonnement: this.listeDesMessagesEmis
                };
                socket.emit('donne_liste', JSON.stringify(T));
            });

            // Receive messages from clients
            socket.on('message', (msgRaw) => {
                try {
                    const message = JSON.parse(msgRaw);
                    message.id = socket.id; // Attach socket ID for targeting responses
                    if (this.controleur.verboseall || this.verbose)
                        console.log("INFO (" + this.nomDInstance + "): reçoit de " + socket.id + ": " + Object.keys(message).filter(k => k !== 'id').join(', '));
                    this.controleur.envoie(this, message);
                } catch (e) {
                    console.error("Erreur parsing message dans CanalSocketio:", e);
                }
            });

            // Client disconnects
            socket.on('disconnect', () => {
                let message = new Object();
                message.client_deconnexion = socket.id;
                message.id = socket.id;
                this.controleur.envoie(this, message);
            });
        });
    }

    /**
     * Called by the controleur to send messages to clients.
     * If mesg.id is defined, send only to those socket(s).
     * Otherwise broadcast to all.
     */
    traitementMessage(mesg) {
        if (this.controleur.verboseall || this.verbose)
            console.log("INFO (" + this.nomDInstance + "): CanalSocketio va émettre " + JSON.stringify(mesg).substring(0, 200));

        // Copy message and extract target IDs
        let messageToSend = JSON.parse(JSON.stringify(mesg));
        let targetIds = null;

        if (messageToSend.id) {
            targetIds = Array.isArray(messageToSend.id) ? messageToSend.id : [messageToSend.id];
            delete messageToSend.id;
        }

            if (messageToSend['ice-candidate-group-relay']) {
                const payload = JSON.stringify({ 'ice-candidate-group': messageToSend['ice-candidate-group-relay'] });
                 if (!targetIds) {
                    this.io.emit('message', payload);
                } else {
                    for (const socketId of targetIds) {
                        this.io.to(socketId).emit('message', payload);
                    }
                }
            } else {
                const payload = JSON.stringify(messageToSend);
                if (!targetIds) {
                    this.io.emit('message', payload);
                } else {
                    for (const socketId of targetIds) {
                        this.io.to(socketId).emit('message', payload);
                    }
                }
            }
    }
}

module.exports = CanalSocketio;
