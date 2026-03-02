"use client";
import React, { useEffect, useState, useRef } from 'react';
import LandingNavbar from './LandingNavbar';
import Footer from './Footer';
import styles from './LegalPageLayout.module.css';

export default function LegalPageLayout({ title, tldr, children }) {
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (window.scrollY / totalHeight) * 100;
            setScrollProgress(progress);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(styles.visible);
                }
            });
        }, { threshold: 0.1 });

        const sections = document.querySelectorAll(`.${styles.section}`);
        sections.forEach(section => observer.observe(section));

        return () => sections.forEach(section => observer.unobserve(section));
    }, [children]);

    return (
        <div className={styles.container} ref={containerRef}>
            {/* Animated Background Blobs */}
            <div className={styles.blob1}></div>
            <div className={styles.blob2}></div>

            {/* Scroll Progress Bar */}
            <div className={styles.progressBarContainer}>
                <div 
                    className={styles.progressBar} 
                    style={{ width: `${scrollProgress}%` }}
                ></div>
            </div>

            <LandingNavbar isLoggedIn={false} />
            
            <main className={styles.contentWrapper}>
                <div className={styles.mainGrid}>
                    {/* Sticky TL;DR Sidebar on the LEFT */}
                    {tldr && tldr.length > 0 && (
                        <aside className={styles.tldrSidebar}>
                            {tldr.map((item, index) => (
                                <div key={index} className={styles.tldrCard} style={{ animationDelay: `${index * 0.1}s` }}>
                                    <div className={styles.tldrIcon}>
                                        {item.icon}
                                    </div>
                                    <div className={styles.tldrContent}>
                                        <h3>{item.label}</h3>
                                        <p>{item.text}</p>
                                    </div>
                                </div>
                            ))}
                        </aside>
                    )}

                    <div className={styles.contentArea}>
                        <div className={styles.card}>
                            <h1 className={styles.title}>{title}</h1>
                            <div className={styles.content}>
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            <Footer />
        </div>
    );
}
