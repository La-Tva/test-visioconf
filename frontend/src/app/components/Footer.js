import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
        <div className={styles.container}>
            <div className={styles.column}>
                <div className={styles.logoRow}>
                     <img 
                        src="/assets/Logo-univ.svg" 
                        alt="Logo" 
                        className={styles.logo}
                        // Make logo white via filter if it's SVG, or just display
                        style={{ filter: 'brightness(0) invert(1)' }} 
                    />
                </div>
                <p className={styles.text}>
                    Plateforme officielle de visioconférence de l'Université de Toulon.
                </p>
            </div>

            <div className={styles.column}>
                <h4 className={styles.heading}>Navigation</h4>
                <ul className={styles.list}>
                    <li><Link href="/">Accueil</Link></li>
                    <li><Link href="/login">Connexion</Link></li>
                    <li><Link href="/register">Inscription</Link></li>
                </ul>
            </div>

            <div className={styles.column}>
                <h4 className={styles.heading}>Légal</h4>
                <ul className={styles.list}>
                    <li><Link href="#">Mentions Légales</Link></li>
                    <li><Link href="#">Politique de confidentialité</Link></li>
                    <li><Link href="#">RGPD</Link></li>
                </ul>
            </div>
        </div>
        
        <div className={styles.bottomBar}>
            © {new Date().getFullYear()} Université de Toulon. Tous droits réservés.
        </div>
    </footer>
  );
}
