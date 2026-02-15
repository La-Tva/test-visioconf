"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './LandingNavbar.module.css';

export default function LandingNavbar({ isLoggedIn }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`${styles.navbar} ${isVisible ? styles.visible : ''}`}>
            <div className={styles.content}>
                <Link href="/">
                    <img 
                        src="/assets/Logo-univ.svg" 
                        alt="Université de Toulon" 
                        className={styles.logo}
                    />
                </Link>

                <div className={styles.navActions}>
                    {!isLoggedIn && (
                         <span 
                            className={styles.navLink} 
                            onClick={() => document.getElementById('info')?.scrollIntoView({ behavior: 'smooth' })}
                            style={{cursor: 'pointer', marginRight: '8px'}}
                         >
                            Découvrir
                        </span>
                    )}

                    {isLoggedIn ? (
                        <Link href="/home">
                            <button className={styles.btnPrimary}>
                                Mon Espace
                            </button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/login">
                                <button className={styles.btnSecondary}>Se connecter</button>
                            </Link>
                            <Link href="/register">
                                <button className={styles.btnPrimary}>S'inscrire</button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
