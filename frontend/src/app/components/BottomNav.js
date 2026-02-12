"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './BottomNav.module.css';
import { usePreload } from '../context/PreloadContext';

export default function BottomNav() {
    const pathname = usePathname();
    const { friends, teams } = usePreload();
    const [user, setUser] = React.useState(null);

    React.useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch (e) {
                console.error(e);
            }
        }
    }, [pathname]);

    const totalUnread = friends?.reduce((acc, f) => acc + (f.unreadCount || 0), 0) || 0;
    const totalTeamUnread = teams?.reduce((acc, team) => {
        if (user && team.unreadCounts) {
            return acc + (team.unreadCounts[user._id] || 0);
        }
        return acc;
    }, 0) || 0;

    const navItems = [
        { label: "Accueil", icon: <HomeIcon />, link: "/home" },
        { label: "Chats", icon: <ChatIcon />, link: "/messages", badge: totalUnread },
        { label: "Équipes", icon: <TeamIcon />, link: "/team", badge: totalTeamUnread },
        { label: "Fichiers", icon: <FolderIcon />, link: "/files/personal" },
        { label: "Membres", icon: <DirectoryIcon />, link: "/annuaire" },
    ];

    return (
        <nav className={styles.bottomNav}>
            {navItems.map((item, index) => {
                const isActive = pathname.startsWith(item.link);
                return (
                    <Link 
                        key={index} 
                        href={item.link} 
                        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                    >
                        <div className={styles.iconWrapper}>
                            {item.icon}
                            {item.badge > 0 && <span className={styles.badge}>{item.badge > 9 ? '9+' : item.badge}</span>}
                        </div>
                        <span className={styles.label}>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}

function HomeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
    );
}

function ChatIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
    );
}

function TeamIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    );
}

function FolderIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
    );
}

function DirectoryIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
    );
}
