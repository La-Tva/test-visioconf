"use client";
import React from 'react';
import LegalPageLayout from '../components/LegalPageLayout';
import styles from '../components/LegalPageLayout.module.css';

export default function PolitiqueConfidentialite() {
    const tldrData = [
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>, 
            label: "Données", 
            text: "Seules les données strictement nécessaires sont collectées." 
        },
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>, 
            label: "Sécurité", 
            text: "Vos flux vidéos sont chiffrés et non enregistrés." 
        },
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>, 
            label: "Usage", 
            text: "Aucune donnée n'est vendue à des tiers ou utilisée à des fins publicitaires." 
        },
    ];

    return (
        <LegalPageLayout title="Politique de confidentialité" tldr={tldrData}>
            <section className={styles.section}>
                <h2>1. Collecte des données</h2>
                <p>
                    Nous collections les informations suivantes lors de votre inscription et utilisation de la plateforme :
                </p>
                <ul>
                    <li>Nom et prénom</li>
                    <li>Adresse e-mail institutionnelle</li>
                    <li>Données de connexion</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2>2. Utilisation des données</h2>
                <p>
                    Les données collectées sont utilisées pour :
                </p>
                <ul>
                    <li>Gérer votre compte utilisateur</li>
                    <li>Permettre la communication entre les membres</li>
                    <li>Améliorer nos services et la sécurité de la plateforme</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2>3. Protection des données</h2>
                <p>
                    VisioConf met en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données personnelles contre tout accès non autorisé, 
                    altération ou divulgation. Toutes les communications vidéo sont chiffrées.
                </p>
            </section>
        </LegalPageLayout>
    );
}
