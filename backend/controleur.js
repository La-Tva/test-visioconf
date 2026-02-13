class Controleur {
    listeEmission = new Object()
    listeAbonnement = new Object()
    verbose = false
    verboseall = false

    constructor() {}

    inscription(emetteur, liste_emission, liste_abonnement) {
        for (var key in liste_emission) {
            if (typeof this.listeEmission[liste_emission[key]] == "undefined") {
                this.listeEmission[liste_emission[key]] = new Object()
            } else {
                if (this.verboseall || this.verbose) {
                    console.log("INFO(controleur): liste des instances qui ont déjà enregistré ce message en émission:")
                    console.log(this.listeEmission[liste_emission[key]])
                }
            }
            if (typeof this.listeEmission[liste_emission[key]][emetteur.nomDInstance] != "undefined") {
                console.log("ERREUR(controleur: " + emetteur.nomDInstance + " essaie de s'enregistrer une nouvelle fois pour le message en émission: " + liste_emission[key] + ")")
            } else {
                this.listeEmission[liste_emission[key]][emetteur.nomDInstance] = emetteur
            }
        }
        for (var key in liste_abonnement) {
            if (typeof this.listeAbonnement[liste_abonnement[key]] == "undefined") {
                this.listeAbonnement[liste_abonnement[key]] = new Object()
            } else {
                if (this.verboseall || this.verbose) {
                    console.log("INFO(controleur): liste des instances qui ont déjà enregistré ce message en abonnement:")
                    console.log(this.listeAbonnement[liste_abonnement[key]])
                }
            }
            if (typeof this.listeAbonnement[liste_abonnement[key]][emetteur.nomDInstance] != "undefined") {
                console.log("INFO(controleur: " + emetteur.nomDInstance + " met à jour son abonnement pour: " + liste_abonnement[key] + ")")
            }
            this.listeAbonnement[liste_abonnement[key]][emetteur.nomDInstance] = emetteur
        }
    }

    desincription(emetteur, liste_emission, liste_abonnement) {
        for (var key in liste_emission) {
            if (typeof this.listeEmission[liste_emission[key]] == "undefined") {
                console.log("ERREUR(controleur: le message en émission n'existe plus: " + liste_emission[key])
            } else {
                if (typeof this.listeEmission[liste_emission[key]][emetteur.nomDInstance] == "undefined") {
                    console.log("ERREUR(controleur: le message en émission " + liste_emission[key] + " n'était pas enregistré par " + emetteur.nomDInstance)
                } else {
                    delete this.listeEmission[liste_emission[key]][emetteur.nomDInstance]
                }
            }
        }
        for (var key in liste_abonnement) {
            if (typeof this.listeAbonnement[liste_abonnement[key]] == "undefined") {
                console.log("ERREUR(controleur: le message en abonnement n'existe plus: " + liste_abonnement[key])
            } else {
                if (typeof this.listeAbonnement[liste_abonnement[key]][emetteur.nomDInstance] == "undefined") {
                    console.log("ERREUR(controleur: le message en abonnement " + liste_abonnement[key] + " n'était pas enregistré par " + emetteur.nomDInstance)
                } else {
                    delete this.listeAbonnement[liste_abonnement[key]][emetteur.nomDInstance]
                }
            }
        }
    }

    envoie(emetteur, t) {
        if (this.verboseall || this.verbose) {
            console.log("INFO (controleur): le controleur a reçu de " + emetteur.nomDInstance + " :")
            console.log(t)
        }
        for (var item in t) {
            if (item != "id") {
                if (typeof this.listeEmission[item] == "undefined") {
                    console.log("ERREUR (controleur): Le message " + item + " envoyé par " + emetteur.nomDInstance + " n'est pas enregistré par le contrôleur")
                }
                if (typeof this.listeEmission[item] !== "undefined" && typeof this.listeEmission[item][emetteur.nomDInstance] == "undefined") {
                    console.log("ERREUR (controleur): Le message " + item + " envoyé par " + emetteur.nomDInstance + " n'a pas été enregistré par cette instance")
                }
                if (typeof this.listeAbonnement[item] !== 'undefined') {
                    for (var recepteurkey in this.listeAbonnement[item]) {
                        let T = new Object()
                        T[item] = t[item]
                        if (typeof t.id != "undefined") T.id = t.id
                        if (this.verboseall || this.verbose) {
                            console.log("INFO (controleur): on envoie " + item + " à " + recepteurkey)
                        }
                        this.listeAbonnement[item][recepteurkey].traitementMessage(T)
                    }
                }
            }
        }
    }
}

module.exports = Controleur;
