"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

export default function Sidebar() {
    const [isExpanded, setIsExpanded] = useState(true);
    const pathname = usePathname();

    const menuItems = [
        { label: "Conversation", icon: <MessageIcon />, link: "/messages" },
        { label: "Équipe", icon: <TeamIcon />, link: "/team" },
        { label: "Dossier", icon: <FolderIcon />, link: "/files" },
        { label: "Annuaire", icon: <DirectoryIcon />, link: "/annuaire" },
    ];

    return (
        <div 
            className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <div className={styles.header}>
                <Link href="/home" className={styles.logoContainer} style={{textDecoration:'none', color:'inherit'}}>
                    <div className={styles.logoIcon}>
                        {/* Simple Logo Placeholder or SVG */}
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="6" width="20" height="4" rx="2" fill="#0698D6"/>
                            <rect x="2" y="14" width="28" height="4" rx="2" fill="#1E3664"/>
                            <rect x="10" y="22" width="20" height="4" rx="2" fill="#0698D6"/>
                        </svg>
                    </div>
                    <span className={styles.logoText}>VISIOCONF</span>
                </Link>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item, index) => {
                    const isActive = pathname === item.link;
                    return (
                        <Link 
                            href={item.link} 
                            key={index} 
                            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                        >
                            <span className={styles.icon}>{item.icon}</span>
                            <span className={styles.label}>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div className={styles.footer}>
                <Link href="/info" className={`${styles.navItem} ${pathname === '/info' ? styles.active : ''}`}>
                    <span className={styles.icon}><InfoIcon /></span>
                    <span className={styles.label}>Info</span>
                </Link>
            </div>
        </div>
    );
}

// Icons Components (Simple SVGs based on image)
function MessageIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    )
}

function TeamIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    )
}

function FolderIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
    )
}

function DirectoryIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
             <line x1="3" y1="9" x2="21" y2="9"></line>
             <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
    )
}

function InfoIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
    )
}
