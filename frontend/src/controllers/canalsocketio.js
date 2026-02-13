import io from "socket.io-client"

const defaultProfilePicture = '/default_profile_picture.png';

class CanalSocketio {
    controleur
    nomDInstance
    socket

    listeDesMessagesEmis
    listeDesMessagesRecus
    verbose = false

    constructor(c, nom, onReady) {
        this.controleur = c
        this.nomDInstance = nom

        this.socket = io(
            process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
            {
                autoConnect: true,
                reconnection: true,
            }
        )

        this.socket.on("message", (msg) => {
            if (this.controleur.verboseall || this.verbose)
                console.log(
                    "INFO (" + this.nomDInstance + "): reçoit ce message:" + msg
                )
            this.controleur.envoie(this, JSON.parse(msg))
        })
        this.socket.on("donne_liste", (msg) => {
            var listes = JSON.parse(msg)
            this.listeDesMessagesEmis = listes.emission
            this.listeDesMessagesRecus = listes.abonnement
            if (this.controleur.verboseall || this.verbose)
                console.log(
                    "INFO (" +
                        this.nomDInstance +
                        "): inscription des messages de CanalSocketio"
                )

            this.controleur.inscription(
                this,
                listes.emission,
                listes.abonnement
            )
            if (onReady) onReady();
        })

        this.socket.emit("demande_liste", {})
    }

    traitementMessage(mesg) {
        this.socket.emit("message", JSON.stringify(mesg))
    }
}

export default CanalSocketio
