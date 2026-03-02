"use client";
import React from 'react';
import LegalPageLayout from '../components/LegalPageLayout';
import styles from '../components/LegalPageLayout.module.css';

export default function RGPD() {
    const tldrData = [
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>, 
            label: "Droit d'accès", 
            text: "Vous pouvez consulter vos données à tout moment." 
        },
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>, 
            label: "Rectification", 
            text: "Modifiez vos informations personnelles directement dans votre profil." 
        },
        { 
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>, 
            label: "Effacement", 
            text: "Droit à l'oubli : demandez la suppression de votre compte." 
        },
    ];

    return (
        <LegalPageLayout title="RGPD" tldr={tldrData}>
            <section className={styles.section}>
                <h2>1. Qu'est-ce que le RGPD ?</h2>
                <p>
                    Le Règlement Général sur la Protection des Données (RGPD) est le cadre juridique de l'Union européenne qui régit la collecte et le traitement des données à caractère personnel des individus au sein de l'UE.
                </p>
            </section>

            <section className={styles.section}>
                <h2>2. Vos droits</h2>
                <p>
                    Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :
                </p>
                <ul>
                    <li>Droit d'accès</li>
                    <li>Droit de rectification</li>
                    <li>Droit à l'effacement</li>
                    <li>Droit à la portabilité des données</li>
                    <li>Droit d'opposition</li>
                </ul>
            </section>

            <section className={styles.section}>
                <h2>3. Contact</h2>
                <p>
                    Pour toute question concernant notre politique de protection des données ou pour exercer vos droits, 
                    vous pouvez contacter notre Délégué à la Protection des Données (DPO) à l'adresse e-mail de l'Université.
                </p>
            </section>
        </LegalPageLayout>
    );
}
