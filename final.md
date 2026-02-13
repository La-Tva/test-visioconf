le framework fwtozza se base sur l'échange de message entre objet. Les objets reçoivent et émettent des messages sans forcément
connaitre les autres objets autour d'eux et où vont les messages. 
Les objets conversent avec un contrôleur dont le rôle est d'aiguiller les messages.
Son utilisation tourne autour de bonnes pratiques homogènes et l'utilisation d'un objet controleur qui est chargé à partir de controleur.js 

# Cas d'une application côté client sans serveur.

Le rendu est effectué à l'aide d'objets javascript qui sont définis avec une structure commune:

```javascript

class ObjetStandard{

    nomDInstance; // ce sera un string qui permetra de différencier une instance d'une autres
    support; // ce sera un objet HTML qui sera utilisé pour porter le rendu.
    controleur; // ce sera l'instance du controleur auprès duquel l'objet va s'inscrire et utilisera pour envoyer des messages
    verbose=false; // pourra être basculé à true pour la phase de test

    listeDesMessagesRecus=[]; // c'est une tableau de string. chaque élément correspond à un nom de message.
    listeDesMessagesEmis=[]; //  c'est une tableau de string. chaque élément correspond à un nom de message.


    constructor(s,c,nom){
        this.controleur=c;			
		this.support=s;
		this.nomDInstance=nom;
		if(this.controleur.verboseall || this.verbose) console.log(" INFO ("+this.nomDInstance+"): inscription des messages auprès du controleur" );
		c.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
		// du code supplémentaire, par exemple pour appeler une méthode de rendu dans this.support
    }

    traitementMessage(mesg){
		if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"): on reçoit: "+JSON.stringify(mesg));
	
        // en fonction des clés présentes dans l'objet mesg on effectuera des traitements. Les clés attendues sont définies dans this.listeDesMessagesRecus
        // en général les traitements sont un rafraichissement d'affichage et l'envoie de messages en utilisant this.controleur.envoie(this,tx); où tx sera un Object() dont les clés possibles sont dans this.listeDesMessagesEmis
    }

}

```

## exemple
Un exemple sera plus parlant. Imaginons une application qui consiste en une liste d'éléments textuels qui se construit à l'aide d'une zone de saisie. A chaque fois qu'on saisit un texte celui ci apparait dans la liste et la zone de saisie se réinitialise. Pour cela nous ferons 2 objets: un objet ListeTextuelle et un objet SaisieTexte. SaisieTexte enverra un message à l'aide du controleur quand il souhaite emettre un texte et sa méthode traitementMessage s'exécutera à chaque fois que le controleur aura une demande d'envoi d'un message d'acquitement. ListeTextuelle enverra un message d'acquitement à chaque fois que sa méthode traitement message aura un message de texte à traiter. 
On voit que le controleur joue le rôle d'un aiguilleur entre ces 2 objets et transmet les messages de l'un à l'autre. Le nom des messages doit donc être précis ainsi que la structure des données qui y est associée.
Dans notre cas il y a 2 messages:


**texte_saisi**
```JSON
{texte_saisi:
    {
        texte:string,
        instance:string
    }
}

```

**acquitement_texte**
```JSON
{acquitement_texte:
    {
        instance:string;
    }
}

```
Voici le fichier HTML qui utilise le controleur et ces deux objets.
```html

<!doctype html>
<html lang="fr">
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <script src="js/saisie_texte.js"></script>   
    <script src="js/liste_textuelle.js"></script>
    <script src="controleur.js"></script>
   
   </head>
   
   <body>
   

		<div id="liste_textuelle"></div>
		<div id="saisie_texte"></div>
	
   </body>
   <script>   
   var controleur=new Controleur();

   var saisie_texte=new SaisieTexte(document.getElementById("saisie_texte"),controleur, "saisie1");
   var liste_textuelle=new ListeTextuelle(document.getElementById("liste_textuelle"), controleur, "liste");
   </script>
   
   
</html>
```

**ListeTextuelle**
```javascript

class ListeTextuelle {
    nomDInstance;
    support;
    controleur;
    verbose = true;

    // Définition des messages
    listeDesMessagesRecus = ["texte_saisi"];
    listeDesMessagesEmis = ["acquitement_texte"];

    // Élément DOM interne
    ulList;

    constructor(s, c, nom) {
        this.controleur = c;
        this.support = s;
        this.nomDInstance = nom;

        // 1. Initialisation du rendu HTML
        this.render();

        // 2. Inscription auprès du controleur
        if (this.controleur.verboseall || this.verbose) console.log(" INFO (" + this.nomDInstance + "): inscription des messages auprès du controleur");
        c.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
    }

    render() {
        // On crée une liste à puces pour afficher les éléments
        this.ulList = document.createElement("ul");
        this.support.appendChild(this.ulList);
    }

    traitementMessage(mesg) {
        if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): on reçoit: " + JSON.stringify(mesg));

        // Traitement du message texte_saisi
        if (mesg.texte_saisi) {
            // 1. Mise à jour de l'affichage
            let content = mesg.texte_saisi.texte;
            let li = document.createElement("li");
            li.textContent = content;
            this.ulList.appendChild(li);

            // 2. Envoi de l'acquittement
            let ackMsg = {
                acquitement_texte: {
                    instance: mesg.texte_saisi.instance
                }
            };
            this.controleur.envoie(this, ackMsg);
        }
    }
}
```

**SaisieTexte**
```javascript

class SaisieTexte {
    nomDInstance;
    support;
    controleur;
    verbose = false;

    // Définition des messages
    listeDesMessagesRecus = ["acquitement_texte"];
    listeDesMessagesEmis = ["texte_saisi"];

    // Éléments du DOM internes
    inputField;
    btnSend;

    constructor( s, c, nom) {
        this.controleur = c;
        this.support = s;
        this.nomDInstance = nom;

        // 1. Initialisation du rendu HTML dans le support
        this.render();

        // 2. Inscription auprès du controleur
        if (this.controleur.verboseall || this.verbose) console.log(" INFO (" + this.nomDInstance + "): inscription des messages auprès du controleur");
        c.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
    }

    render() {
        // Création d'un champ input
        this.inputField = document.createElement("input");
        this.inputField.type = "text";
        this.inputField.placeholder = "Saisissez votre texte ici...";

        // Création du bouton d'envoi
        this.btnSend = document.createElement("button");
        this.btnSend.innerText = "Ajouter";
        
        // Gestion du clic pour envoyer le message
        this.btnSend.onclick = () => {
            if (this.inputField.value.trim() !== "") {
                this.envoyerTexte();
            }
        };

        // Ajout au support (le div HTML)
        this.support.appendChild(this.inputField);
        this.support.appendChild(this.btnSend);
    }

    envoyerTexte() {
        // Construction du message selon la structure JSON définie
        let msg = {
            texte_saisi: {
                texte: this.inputField.value,
                instance: this.nomDInstance
            }
        };
        
        // Envoi via le contrôleur
        this.controleur.envoie(this, msg);
    }

    traitementMessage(mesg) {
        if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): on reçoit: " + JSON.stringify(mesg));

        // Réception de l'acquittement
        if (mesg.acquitement_texte) {
			if(mesg.acquitement_texte.instance==this.nomDInstance){
				// On vide le champ texte uniquement quand la liste confirme la réception
				this.inputField.value = "";
				this.inputField.focus();
			}
        }
    }
}
```

On notera que la zone de saisie se vide uniquement si la liste textuelle lui donne acquitement en lui retournant 
son nom d'instance que la zone de saisie lui a envoyé avec le texte. 
Ainsi il est possible de faire plusieurs instances de zone de saisie avec des noms d'instance différents sans qu'elles se perturbent.


le framework fwtozza fonctionne aussi dans un environnement client serveur.
L'interêt est même plus grand dans cette configuration où les objets peuvent coexister sans se connaitre
et sans savoir sur quelle machine ou environnement ils s'exécutent les un et les autres.

Il faudra pour ça qu'il y ait un controleur sur le serveur. Ainsi un objet sur le serveur fonctionnera comme 
ceux sur le client en s'inscrivant au controleur en gérant des messages à émettre et à recevoir. 
Pour que les messages émis par un objet côté client arrive dans la méthode "traitementMessage" 
d'un objet côté serveur il faut le message passe du controleur côté client au controleur côté serveur. 
Il est donc nécessaire d'établir un canal entre les deux. Ce canal peut s'appuyer sur différentes technologies, 
websocket ou  ajax. En effet, si côté client les objets sont forcément en javascript (ou typescript, ce qui reveint au même), 
côté serveur il est possible que le langage de programmation soit javascript (nodejs)  ou PHP (ou même un autre langage).

## Exemple 

Reprenons l'exemple de la zone de saisie et de la liste textuelle. Nous allons réaliser un serveur nodejs qui permet de connecter les utilisateurs de cette interface. Ainsi, plusieurs personnes pourront ouvrir l'interface dans leur navigateur et envoyer des messages. chacun verra apparaitre dans sa liste textuelle les messages que tous ont envoyés.

**index.html**

```html
<!doctype html>
<html lang="fr">
  <head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <script src="js/saisie_texte.js"></script>   
    <script src="js/liste_textuelle.js"></script>
    <script src="controleur.js"></script>
    <script src="canalwebsocket.js"></script>    
   
   </head>
   
   <body>
   
	<div id="liste_textuelle"></div>
	<div id="saisie_texte"></div>
	<div id="saisie_texte2"></div>
   </body>
   <script>   
   var controleur=new Controleur();
   var canal=new CanalWebSocket(controleur,"canal"); // l'objet canal se connectera au controleur pour servir de passerelle avec le serveur, il connait donc l'url du serveur. 

   var saisie_texte=new SaisieTexte(document.getElementById("saisie_texte"),controleur, "saisie1");
   var liste_textuelle=new ListeTextuelle(document.getElementById("liste_textuelle"), controleur, "liste");
   </script>
   
   
</html>

```

**ListeTextuelle est un peu modifié dans ses messages**
```javascript
class ListeTextuelle {
    nomDInstance;
    support;
    controleur;
    verbose = true;

    // Définition des messages
    listeDesMessagesRecus = ["texte_serveur"];
    listeDesMessagesEmis = [];

    // Élément DOM interne
    ulList;

    constructor(s, c, nom) {
        this.controleur = c;
        this.support = s;
        this.nomDInstance = nom;

        // 1. Initialisation du rendu HTML
        this.render();

        // 2. Inscription auprès du controleur
        if (this.controleur.verboseall || this.verbose) console.log(" INFO (" + this.nomDInstance + "): inscription des messages auprès du controleur");
        c.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
    }

    render() {
        // On crée une liste à puces pour afficher les éléments
        this.ulList = document.createElement("ul");
        this.support.appendChild(this.ulList);
    }

    traitementMessage(mesg) {
        if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): on reçoit: " + JSON.stringify(mesg));

        // Traitement du message texte_saisi
        if (mesg.texte_serveur) {
            // 1. Mise à jour de l'affichage
            let content = mesg.texte_serveur.texte;
            let li = document.createElement("li");
            li.textContent = content;
            this.ulList.appendChild(li);

         }
    }
}

```

```javascript

class SaisieTexte {
    nomDInstance;
    support;
    controleur;
    verbose = false;

    // Définition des messages
    listeDesMessagesRecus = ["acquitement_serveur"];
    listeDesMessagesEmis = ["texte_client"];

    // Éléments du DOM internes
    inputField;
    btnSend;

    constructor(s, c, nom) {
        this.controleur = c;
        this.support = s;
        this.nomDInstance = nom;

        // 1. Initialisation du rendu HTML dans le support
        this.render();

        // 2. Inscription auprès du controleur
        if (this.controleur.verboseall || this.verbose) console.log(" INFO (" + this.nomDInstance + "): inscription des messages auprès du controleur");
        c.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
    }

    render() {
        // Création d'un champ input
        this.inputField = document.createElement("input");
        this.inputField.type = "text";
        this.inputField.placeholder = "Saisissez votre texte ici...";

        // Création du bouton d'envoi
        this.btnSend = document.createElement("button");
        this.btnSend.innerText = "Ajouter";
        
        // Gestion du clic pour envoyer le message
        this.btnSend.onclick = () => {
            if (this.inputField.value.trim() !== "") {
                this.envoyerTexte();
            }
        };

        // Ajout au support (le div HTML)
        this.support.appendChild(this.inputField);
        this.support.appendChild(this.btnSend);
    }

    envoyerTexte() {
        // Construction du message selon la structure JSON définie
        let msg = {
            texte_client: {
                texte: this.inputField.value,
                instance: this.nomDInstance
            }
        };
        
        // Envoi via le contrôleur
        this.controleur.envoie(this, msg);
    }

    traitementMessage(mesg) {
        if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): on reçoit: " + JSON.stringify(mesg));

        // Réception de l'acquittement
        if (mesg.acquitement_serveur) {
			if(mesg.acquitement_serveur.instance==this.nomDInstance){
				// On vide le champ texte uniquement quand la liste confirme la réception
				this.inputField.value = "";
				this.inputField.focus();
			}
        }
    }
}

```


Les objets ListeTextuelle et SaisieTexte  changent dans les messages qui émettent et reçoivent. Ainsi, ListeTextuelle n'émet plus de message d'acquitement, c'est le serveur qui émet l'acquitement lorsqu'il reçoit le texte saisie. Les messages partent d'un objet client pour aller au serveur en passant par le canal. Le cheminement est réciproque et le serveur émet des messages qui arrivent aux clients.

Supposons qu'il y ait 2 clients connectés au serveur. Le client A saisit un texte qui sera émis dans le message "texte_client", le controleur du client A fait suivre ce message à l'objet canalwebsocket du même client A qui par connexion sur le réseau transmet le message au canalwebsocket sur le serveur. CanalaWebSocket sur le serveur envoie le message par un appel au contrôleur côté serveur. Le message finit par arriver à l'objet "SaisieTextuelle" sur le serveur qui se chargera de dispatcher le texte saisie à tous les clients connectés et à émettre un message d'acquitement au client A. L'objet SaisieTextuelle émet ses messages par un appel au contrôleur. Les messages suivent le chemin inverse jusqu'aux objets ListeTextuelle et SaisieTexte des clients.
Il est à noter que les objets côté serveur ont la possibilité de joindre un message "id" aux messages qu'ils envoient à l'aide du contrôleur. Il s'agit des id de connexion (session) que le canal a attribué pour identifier les clients. Ce message id contient les id des clients qui seront destinataires, si ce message id est absent, alors tous les clients recevront le message. Par exemple pour le message "texte_serveur" tous les clients reçoivent le message, pour le message "acquitement_serveur" seul le client qui a émis "texte_client" le recevra. 


Côté serveur nous avons un index.js

```javascript

const express = require('express');
const app = express();
var cors = require('cors');
const path = require('path');
const port = 3220;
const server = require('http').createServer(app);

const Controleur=require('./controleur.js');
const CanalWebSocket=require('./js/canalwebsocket.js');

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

var controleur=new Controleur();
var canal=new CanalWebSocket(controleur,"canalsocketio");
var saisieTextuelle=new SaisieTextuelle(controleur,'textuelle');
```


**Et voici les codes de SaisieTextuelle sur le serveur**

```javascript

class SaisieTextuelle{
	
	controleur;
	verbose=false;
	listeDesMessagesEmis=new Array("texte_serveur","acquitement_serveur");
	listeDesMessagesRecus=new Array("texte_client");
	
	
	constructor(c,nom){
		this.controleur=c;
		this.nomDInstance=nom;
		if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"):  s'enregistre aupres du controleur");
		this.controleur.inscription(this,this.listeDesMessagesEmis, this.listeDesMessagesRecus);
    console.log(this.listeDesMessagesEmis);
		
		
	}
	
	traitementMessage(mesg){
		if(this.controleur.verboseall || this.verbose){
			 console.log("INFO ("+this.nomDInstance+"): reçoit le message suivant à traiter");
			 console.log(mesg);
		 }
		
			
			
			var T= new Object();
			T.texte_serveur=new Object();
			T.texte_serveur.texte=mesg.texte_client.texte;
			T.texte_serveur.instance=mesg.texte_client.instance;
      this.controleur.envoie(this,T);

      T=new Object();
      T.acquitement_serveur=new Object();
      T.acquitement_serveur.instance=mesg.texte_client.instance;
      T.id=mesg.id;
			this.controleur.envoie(this,T);
					
			
  }
	
	
}
module.exports = SaisieTextuelle

```

**Pour info voici canalwebsocket.js côté client**

```javascript

class CanalWebSocket {

    controleur;
    nomDInstance;
    socket;
    
    listeDesMessagesEmis = [];
    listeDesMessagesRecus = [];
    verbose = false;
    sessionId;

    // Note : le paramètre 'url' remplace la fonction 's' (io)
    constructor(c, nom) {
        
        this.controleur = c;
        this.nomDInstance = nom;
        this.url="ws://localhost:3002";

     
        // 2. Connexion WebSocket (changement de protocole http -> ws)
        this.socket = new WebSocket(this.url);

        // 3. Gestion de l'ouverture de connexion
        this.socket.onopen = () => {
            if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): WebSocket connecté.");
            
            // Équivalent du emit("demande_liste")
            // On envoie un objet JSON avec un type spécifique que le serveur reconnaitra
            this.socket.send(JSON.stringify({ canalwebsocket: "demande_liste" }));
       
        };

        // 4. Réception des messages (Tout arrive ici)
        this.socket.onmessage = (event) => {
            try {
                let msg = JSON.parse(event.data);

                // A. Cas spécial : Réception de la configuration (équivalent socket.on("donne_liste"))
                // Le serveur doit renvoyer un objet avec type="donne_liste" ou structure similaire
                if (msg.canalwebsocket) {
                    
                    this.listeDesMessagesEmis = msg.canalwebsocket.emission;
                    this.listeDesMessagesRecus = msg.canalwebsocket.abonnement;
                    
                    if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): inscription des messages de CanalWebSocket");
                    
                    this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);
                } 
                // B. Cas standard : Message applicatif
                else {
                    if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): reçoit ce message:" + event.data);
                    
                    // On transmet au contrôleur pour qu'il le distribue aux autres objets
                    this.controleur.envoie(this, msg);
                }

            } catch (e) {
                console.error("Erreur de parsing message reçu : ", e);
            }
        };

        // Gestion des erreurs
        this.socket.onerror = (error) => {
            console.error("Erreur WebSocket :", error);
        };
        
        this.socket.onclose = () => {
            console.warn("Connexion WebSocket fermée.");
        };
    }

    traitementMessage(mesg) {
        // Vérification que la connexion est ouverte avant d'envoyer
        if (this.socket.readyState === WebSocket.OPEN) {
            // WebSocket natif n'accepte que des string ou buffer, pas d'objets directs
            this.socket.send(JSON.stringify(mesg));
        } else {
            console.warn("Tentative d'envoi alors que le socket n'est pas connecté.");
        }
    }
}

```

**CanalWebSocket côté serveur**
```javascript

const WebSocket = require('ws');
const { randomUUID } = require('crypto'); // Natif Node.js

class CanalWebSocket {

    controleur;
    nomDInstance;
    wss; // Instance du serveur WebSocket (anciennement 'io')

    listeDesMessagesEmis = ["texte_client"];
    listeDesMessagesRecus = ["acquitement_serveur", "texte_serveur"];
    verbose = false;

    /**
     * @param {WebSocket.Server} s - L'instance du serveur WebSocket (new WebSocket.Server({server}))
     * @param {Object} c - Le controleur
     * @param {String} nom - Nom de l'instance
     */
    constructor(s, c, nom) {
        this.controleur = c;
        this.wss = s; // On attend ici une instance de 'ws' Server
        this.nomDInstance = nom;

        if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): CanalWebSocket s'enregistre auprès du controleur");
        this.controleur.inscription(this, this.listeDesMessagesEmis, this.listeDesMessagesRecus);

        // Gestion de la connexion
        this.wss.on('connection', (ws, req) => {

            // 1. GESTION DE L'ID
           
            ws.id = randomUUID();

            if (this.controleur.verboseall || this.verbose) console.log(`INFO (${this.nomDInstance}): Nouveau client connecté avec ID: ${ws.id}`);


            // 2. RECEPTION DES MESSAGES
            ws.on('message', (messageBuffer) => {
                try {
                    // WebSocket envoie des Buffers, il faut convertir en string
                    const messageStr = messageBuffer.toString();
                    const msg = JSON.parse(messageStr);

                    // 3. SIMULATION DES EVENTS (demande_liste vs message standard)
                    // Comme WS n'a pas d'event, on vérifie si le JSON contient une clé spécifique
                    // On suppose que le client envoie { "type": "demande_liste" } ou juste un objet
                    
                    if (msg.canalwebsocket == 'demande_liste') {
                        var T = new Object();
                        T.canalwebsocket= new Object();
                        T.canalwebsocket.emission = this.listeDesMessagesRecus;
                        T.canalwebsocket.abonnement = this.listeDesMessagesEmis;
                        
                        if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): on donne les listes émission et abonnement");
                        
                        ws.send(JSON.stringify(T));

                    } else {
                        // Cas standard : on transfère au contrôleur
                        // On injecte l'ID du socket dans le message pour que le contrôleur sache qui parle
                        msg.id = ws.id; 
                        
                        if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): CanalWebSocket reçoit: " + messageStr + " de la part de " + ws.id);
                        
                        this.controleur.envoie(this, msg);
                    } 
                } catch (e) {
                    console.error("Erreur parsing JSON dans CanalWebSocket", e);
                }
            });

            // 4. DECONNEXION
            ws.on('close', () => {
                let message = new Object();
                message.client_deconnexion = ws.id;
                // On peut ajouter l'ID au niveau racine aussi si le contrôleur l'attend là
                message.id = ws.id; 
                this.controleur.envoie(this, message);
            });
            
            // Gestion des erreurs socket
            ws.on('error', console.error);
        });
    }

    // Méthode appelée par le contrôleur pour envoyer des messages aux clients
    traitementMessage(mesg) {
        if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): CanalWebSocket va émettre " + JSON.stringify(mesg));

        // Copie du message pour ne pas modifier l'original par référence
        let messageToSend = JSON.parse(JSON.stringify(mesg));
        
        // Extraction des IDs destinataires
        let targetIds = null;
        if (messageToSend.id) {
            targetIds = Array.isArray(messageToSend.id) ? messageToSend.id : [messageToSend.id];
            delete messageToSend.id; // On retire l'ID du payload JSON envoyé au client
        }

        const payload = JSON.stringify(messageToSend);

        // DIFFUSION (BROADCAST ou UNICAST)
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                
                // Si aucun ID n'est spécifié dans le message, on envoie à tout le monde (Broadcast)
                if (!targetIds) {
                    client.send(payload);
                } 
                // Sinon, on envoie seulement si l'ID du client est dans la liste cible
                else if (targetIds.includes(client.id)) {
                    if (this.controleur.verboseall || this.verbose) console.log("INFO (" + this.nomDInstance + "): émission ciblée vers : " + client.id);
                    client.send(payload);
                }
            }
        });
    }
}

module.exports = CanalWebSocket;

```
Voici un autre exemple d'application de fwtozza en utilisant un autre canal que CanalWebSocket. Nous utiliserons ici CanalSocketio qui se base sur socket.io.
L'exemple consiste en une application qui affiche un bouton et une pile d'assiettes. A chaque clique sur le bouton on ajoute une assiette. 
L'application est client serveur afin que que chaque interface connectée voit le même nombre d'assiettes.

Voici CanalSocketio côté client:
**CanalSocketio client**
```javascript


class CanalSocketio{

	controleur;
	nomDInstance;
	socket;
	
	
	listeDesMessagesEmis;
	listeDesMessagesRecus;
	verbose=false;	
	
	constructor(s,c,nom){
		
		this.controleur=c;			
		
		this.nomDInstance=nom;
	console.log("connexion réseau socketio");	
		this.socket = s('http://localhost:3001', { 
      autoConnect: true,
      reconnection: true,
      transports: ["websocket"]
    });
		
		this.socket.on("message", (msg) => {
			if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"): reçoit ce message:"+msg);
			this.controleur.envoie(this,JSON.parse(msg));
		});
		this.socket.on("donne_liste", (msg) => {
			var listes=JSON.parse(msg);
			this.listeDesMessagesEmis=listes.emission;
			this.listeDesMessagesRecus=listes.abonnement;
			if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"): inscription des messages de CanalSocketio");
			this.controleur.inscription(this,listes.emission, listes.abonnement);
		});
		
		
		this.socket.emit("demande_liste",{});
		
		
	
		
	}
	
	traitementMessage(mesg){
		this.socket.emit("message",JSON.stringify(mesg));
		
	}
}


```

Voici CanalSocketio côté serveur. On notera qu'il a la liste des messages autorisés à être échangés, qu'il la communique au côté client et qu'il ajoute bien un "id" au message comme le faisait CanalWebSocket.
**CanalSocketio côté serveur**
```javascript

class CanalSocketio{
	
	controleur;
	nomDInstance;
	socket;
	listeDesMessagesEmis=new Array("click");
	listeDesMessagesRecus=new Array("nb_assiettes");
	verbose=false;	
	
	constructor(s,c,nom){
		
		this.controleur=c;			
		this.socket=s;
		this.nomDInstance=nom;
		if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"): "+this.nomDInstance+" s'enrgistre aupres du controleur");
		this.controleur.inscription(this,this.listeDesMessagesEmis, this.listeDesMessagesRecus);
		
		this.socket.on('connection', (socket) => {
			 if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"): conalsocketio se connecte: "+socket);
						
			socket.on('message', (msg) => { 
						let message=JSON.parse(msg);
						message.id=socket.id;
						if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"): conalsocketio reçoit: "+msg+ " de la paet de "+socket.id);
						this.controleur.envoie(this,message);
			});
			
			
			socket.on('demande_liste', (msg) => { 
						
							var T=new Object();
							T.abonnement=this.listeDesMessagesEmis;
							T.emission=this.listeDesMessagesRecus;
							if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"): on donne les listes émission et abonnement");
							socket.emit("donne_liste", JSON.stringify(T));
							
						
			});
			
			
			socket.on('disconnect', ()=> {
				let message=new Object()
				message.client_deconnexion=socket.id;
				this.controleur.envoie(this,message);
			});
      
			
			
		});
		
		
	}
	
	
	
	traitementMessage(mesg){
		
		if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"): canalsocketio va emettre sur la/les socket "+JSON.stringify(mesg));
		if(typeof mesg.id == "undefined" ) this.socket.emit("message",JSON.stringify(mesg));
		else{
			let message=JSON.parse(JSON.stringify(mesg));
			delete message.id;
			message=JSON.stringify(message);
			for(var i=0; i<mesg.id.length; i++){
				if(this.controleur.verboseall || this.verbose) console.log("INFO ("+this.nomDInstance+"):emission sur la socket: "+mesg.id[i]);
				this.socket.to(mesg.id[i]).emit("message",message);
				
			}
		}
		
	}
	
}
module.exports = CanalSocketio
```


L'index.js côté serveur crée les instance de controleur, CanalSocketio et d'un objet MemoirePile qui mémorise le nombre de click reçu.
**index.js**
```javascript
const express = require('express');
const app = express();
var cors = require('cors');
const path = require('path');
const port = 3001;
const server = require('http').createServer(app);
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
const io = require('socket.io')(server, {cors: {origin: "*"}});


const Controleur=require('./controleur.js');
const CanalSocketio=require('./canalsocketio.js');
const MemoirePile=require('./memoire_pile.js');

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


var controleur=new Controleur();
var canal=new CanalSocketio(io,controleur,"canal");
var memoire=new MemoirePile(controleur,"memoire");
```

**memoire_pile.js**
```javascript
/*
MemoirePile reçoit le message {click:1} et s'en sert pour incrémenter sa propriété
nbAssiettes. Il émet à chaque modificaiton de nbAssiettes un message {nb_assiettes:nbAssiettes}
*/

class MemoirePile {

  controleur;
  nomDInstance;

  listeDesMessagesEmis = ["nb_assiettes"];
  listeDesMessagesRecus = ["click"];

  verbose = false;

  nbAssiettes = 0;

  constructor(c, nom) {
    this.controleur = c;
    this.nomDInstance = nom;

    if (this.controleur.verboseall || this.verbose) {
      console.log(
        "INFO (" + this.nomDInstance + "): inscription MemoirePile"
      );
    }

    this.controleur.inscription(
      this,
      this.listeDesMessagesEmis,
      this.listeDesMessagesRecus
    );
  }

  traitementMessage(msg) {
    // Réception d'un click
    if (msg.click !== undefined) {
      this.nbAssiettes++;

      if (this.controleur.verboseall || this.verbose) {
        console.log(
          "INFO (" + this.nomDInstance + "): click reçu → nb_assiettes=" +
            this.nbAssiettes
        );
      }

      // Émission fwtozza
      this.controleur.envoie(this, {
        nb_assiettes: this.nbAssiettes,
      });
    }
  }
}

module.exports = MemoirePile;

```

Côté client on a les fichiers suivants:

**index.html**
```html
<!doctype html>
<html lang="fr">
  <head>
    <!-- Required meta tags -->
      <meta charset="utf-8">  
     <script src="http://localhost:3001/socket.io/socket.io.js"></script>
    <script src="canalsocketio/canalsocketio.js"></script>
     <script src="controleur.js"></script>
     <script src="bouton.js"></script>
     <script src="pile_assiettes.js"></script>

      
   </head>
   
   <body>
   
		 	<div id="bouton"></div>
	  	<div id="pile"></div>

   </body>
   
   <script>
      var controleur=new Controleur();
      var canalsocketio=new CanalSocketio(io,controleur,"canalsocketio");
      var bouton=new Bouton(document.getElementById("bouton"),controleur, "bouton");
      var pile=new PileAssiettes(document.getElementById("pile"),controleur, "pile");


   </script>
   
</html>
```

**bouton.js**
```javascript

class Bouton {
    support;
    nomDInstance;
    controleur;
    verbose = false;
    ListeDesMessagesEmis=["click"];
    ListeDesMessagesRecus=[];

    constructor(s,c,nom){
        this.support=s;
        this.nomDInstance=nom;
        this.controleur=c;
        c.inscription(this,this.ListeDesMessagesEmis,this.ListeDesMessagesRecus);
       this.affiche();
    }

    affiche(){
        var bouton = document.createElement("button");
        this.support.appendChild(bouton);
        bouton.textContent= "ajouter";
        this.controleur.envoie(this, );
        bouton.onclick = (e) => {
         if (this.controleur.verboseall || this.verbose)    console.log( "INFO (" + this.nomDInstance + "): on envoie " +  {click:1}  );     
      console.log(this);
         this.controleur.envoie(this,{click:1});
        };

    }
}
```

**pile_assiettes.js**
```javascript
class PileAssiettes {
    support;
    nomDInstance;
    controleur;
    verbose = false;
    nbAssiettes=0;
    ListeDesMessagesEmis=[];
    ListeDesMessagesRecus=["nb_assiettes"];

    constructor(s,c,nom){
        this.support=s;
        this.nomDInstance=nom;
        this.controleur=c;
        c.inscription(this,this.ListeDesMessagesEmis,this.ListeDesMessagesRecus);
        this.affiche();

    }

    traitementMessage(msg){
        if (msg.nb_assiettes !== undefined) { 
            if (this.controleur.verboseall || this.verbose)  console.log("INFO (" + this.nomDInstance + "): nb_assiettes reçu " + msg.nb_assiettes );
            this.nbAssiettes=msg.nb_assiettes;
            this.affiche();
          }
    }

    affiche(){

      var contenu=`

       <div style='padding: "20px"'>
         <h3>🍽️ Pile d'assiettes</h3>

         <div  style='position:relative; width: 120px; height: 200px; marginTop: 10px'>
       `;
        

      for(var i=0; i<this.nbAssiettes; i++){
        contenu+=`
            <div style='position: absolute;bottom:`+ (i * 6) +`px; left:`+ (i * 2) +`px; width: 100px; height: 12px; border-radius: 50%; background: #eee; border: 2px solid #999; box-shadow:0 2px 4px rgba(0,0,0,0.2)'></div>
        `;
      }

      contenu+="</div><p>"+this.nbAssiettes+" assiette(s)</p>";
      contenu+="</div>";
      this.support.innerHTML=contenu;
    }
}
```


Nous allons voir comment écrire la partie front en react (avec nextjs) et garder le serveur node classique avec le système de controleur de fwtozza.

Pour cela nous prendrons l'exemple de l'application de la pile d'assiettes. Nous allons faire une interface front en react qui fait la même chose
et se connecte au même serveur en utilisant le controleur et canalsocketio.
La particularité de React est de recréer des instances à chaque rafraichissement. Il faudra donc prévoir des instances de controleur et canalsocketio qui échappe 
à ce processus. Pour cela nous utiliserons un provider.

**controleur_context.tsx**

```javascript

// controleur_context.tsx
"use client";

import React, { createContext, useContext, useRef } from "react";
import  Controleur  from "./controleur";
import CanalSocketio from "./canalsocketio";
import {io, Socket}  from "socket.io-client"; // vérifier que c'est la même version sur le serveur, sinon pb de connection.

type ControleurContextType = {
    controleur: Controleur;
    canal: CanalSocketio;
};

// Création du contexte
export const ControleurContext = createContext<ControleurContextType | null>(null);

// Hook pratique pour récupérer le contexte
export const useControleur = () => {
    const ctx = useContext(ControleurContext);
    if (!ctx) throw new Error("useControleur doit être utilisé dans un ControleurProvider");
    return ctx;
};

// Provider
export const ControleurProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    // Crée une seule instance de Controleur et CanalSocketio
     const controleurRef = useRef<Controleur>();
  const canalRef = useRef<io>();
 console.log("on crée lecontroleur et socketio"); 
 if (!controleurRef.current) { 
     controleurRef.current = new Controleur();
     canalRef.current = new CanalSocketio(io,controleurRef.current, "canal"); // côté client
 }
    return (
        <ControleurContext.Provider value={{ controleur:controleurRef.current, canal:canalRef.current }}>
            {children}
        </ControleurContext.Provider>
    );
};
```

Ainsi une seule instance de Controleur et CanalSocketio sont créée. Les composants imbriqués auront accès au controleur grace à useControleur.

**page.tsx**
```javascript
'use client'

import {useContext} from "react"
import Bouton from "./bouton"
import PileAssiettes from "./pile_assiettes.tsx"
import {ControleurProvider} from "./controleur_context";


export default function Home() {

  

  return (
    <>
		<ControleurProvider>
			<Bouton />
      <PileAssiettes />
		</ControleurProvider>
    </>
  );
}

```
Bouton et PileAssiettes sont imbriqués dans le provider. Ils auront accès au controleur grace à cela. Le controleur attend un objet ayant une propriété nomDInstance et une méthode
traitementMessage(meg). Or un composant react est par nature sans arrêt recréé lors des rafraichissements. L'astuce est de faire posséder un objet {nomDInstance, traitementMessage} au composant et le référencer avec un useRef. Voici les sources de Bouton.tsx et pile_assiettes.tsx
**bouton.tsx**
```javascript
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useControleur } from "./controleur_context";

/*
 * L'objectif de ce composant est d'afficher un bouton.
 * Au clic un message {click:1} est envoyé
 */

export default function ClickButton() {

    const { controleur, canal } = useControleur(); // Récupère l'instance unique du contexte

  
    const handlerRef = useRef<any>(null);

    useEffect(() => {
        if (!controleur) return;

        const handler = {
            nomDInstance:"bouton",
            listeDesMessagesRecus: [],
            listeDesMessagesEmis: ["click"],
            traitementMessage: (mesg: any) => {
              // ce composant n'a pas de message à traiter. 
            }
        };

        controleur.inscription(handler, handler.listeDesMessagesEmis, handler.listeDesMessagesRecus);
        handlerRef.current = handler;
        return () => {
          // optionnel si ton controleur gère la désinscription
          if (controleur.desinscription) {
            controleur.desinscription(instance);
          }
        };

    }, [controleur]);

    const handleClick = () => {
		console.log("click");
        if (!controleur || !handlerRef.current) return;
        controleur.envoie(handlerRef.current, {click:1});
        console.log("envoie du click");
    };

    return <button onClick={handleClick}>CLICK</button>;
}




```

**pile_assiettes**
```javascript
"use client";

import { useEffect, useState } from "react";
import { useControleur } from "./controleur_context";

/*
Ce composant affiche une pile d'assiettes en fonction 
du message reçu {nbAssiettes:int}


*/

export default function PileAssiettes() {
  const { controleur } = useControleur();

  const [nbAssiettes, setNbAssiettes] = useState<number>(0);

  useEffect(() => {
    const handler = {
      nomDInstance: "pile_assiettes",

      // fwtozza : messages reçus
      listeDesMessagesRecus: ["nb_assiettes"],
      listeDesMessagesEmis: [],

      traitementMessage: (msg: any) => {
        if (msg.nb_assiettes !== undefined) {
          setNbAssiettes(Number(msg.nb_assiettes));
        }
      },
    };

    controleur.inscription(
      handler,
      instance.listeDesMessagesEmis,
      instance.listeDesMessagesRecus
    );

    return () => {
      // optionnel si ton controleur gère la désinscription
      if (controleur.desinscription) {
        controleur.desinscription(instance);
      }
    };
  }, [controleur]);

  return (
    <div style={{ padding: "20px" }}>
      <h3>🍽️ Pile d'assiettes</h3>

      <div
        style={{
          position: "relative",
          width: "120px",
          height: "200px",
          marginTop: "10px",
        }}
      >
        {Array.from({ length: nbAssiettes }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: i * 6,
              left: i * 2,
              width: "100px",
              height: "12px",
              borderRadius: "50%",
              background: "#eee",
              border: "2px solid #999",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          />
        ))}
      </div>

      <p>{nbAssiettes} assiette(s)</p>
    </div>
  );
}

```
