"use client";
import React from 'react';
import LegalPageLayout from '../components/LegalPageLayout';
import styles from '../components/LegalPageLayout.module.css';

export default function MentionsLegales() {
    const tldrData = [
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>, 
            label: "Éditeur", 
            text: "Édité par l'Université de Toulon, établissement public d'enseignement supérieur et de recherche." 
        },
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>, 
            label: "Hébergement", 
            text: "Plateforme hébergée sur les serveurs sécurisés des services informatiques de l'Université." 
        },
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4l3 3"></path></svg>, 
            label: "Droit d'auteur", 
            text: "Tous droits réservés. La reproduction totale ou partielle est interdite sans autorisation préalable." 
        },
    ];

    return (
        <LegalPageLayout title="Mentions Légales" tldr={tldrData}>
            <section className={styles.section}>
                <h2>1. Édition du site</h2>
                <p>
                    En vertu de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique, 
                    il est précisé aux utilisateurs du site internet VisioConf l'identité des différents intervenants dans le cadre de sa réalisation et de son suivi :
                </p>
                <ul>
                    <li><strong>Propriétaire :</strong> Université de Toulon</li>
                    <li><strong>Responsable de publication :</strong> Direction de la Communication</li>
                    <li><strong>Hébergeur :</strong> Services informatiques de l'Université de Toulon</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2>2. Propriété intellectuelle et contrefaçons</h2>
                <p>
                    L'Université de Toulon est propriétaire des droits de propriété intellectuelle ou détient les droits d'usage sur tous les éléments accessibles sur le site internet, 
                    notamment les textes, images, graphismes, logos, vidéos, architecture, icônes et sons.
                </p>
                <p>
                    Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, 
                    quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de l'Université de Toulon.
                </p>
            </section>

            <section className={styles.section}>
                <h2>3. Limitations de responsabilité</h2>
                <p>
                    L'Université de Toulon ne pourra être tenu responsable des dommages directs et indirects causés au matériel de l'utilisateur, 
                    lors de l'accès au site VisioConf.
                </p>
            </section>
        </LegalPageLayout>
    );
}
