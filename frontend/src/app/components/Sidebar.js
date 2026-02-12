"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

import { usePreload } from '../context/PreloadContext';

export default function Sidebar() {
    const [isPinned, setIsPinned] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false); // State for mobile drawer
    const [user, setUser] = useState(null);
    const pathname = usePathname();
    const { friends, teams } = usePreload();

    // Effect for localStorage persistence
    useEffect(() => {
        const saved = localStorage.getItem('sidebar_pinned');
        if (saved !== null) {
            setIsPinned(JSON.parse(saved));
        }
        
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch (e) {
                console.error("Sidebar user parse error", e);
            }
        }
    }, [pathname]);

    const togglePin = () => {
        const newState = !isPinned;
        setIsPinned(newState);
        localStorage.setItem('sidebar_pinned', JSON.stringify(newState));
    };

    const totalUnread = friends?.reduce((acc, f) => acc + (f.unreadCount || 0), 0) || 0;
    
    // Calculate team unread
    // unreadCounts is an object like { "userId": 5 }
    const totalTeamUnread = teams?.reduce((acc, team) => {
        if (user && team.unreadCounts) {
            // Mongoose Map in JSON is an object
            return acc + (team.unreadCounts[user._id] || 0);
        }
        return acc;
    }, 0) || 0;

    const menuItems = [
        { label: "Accueil", icon: <HomeIcon />, link: "/home" },
        { label: "Conversation", icon: <MessageIcon />, link: "/messages", badge: totalUnread },
        { label: "Équipes", icon: <TeamIcon />, link: "/team", badge: totalTeamUnread },
        { label: "Mes Fichiers", icon: <FolderIcon />, link: "/files/personal" },
        { label: "Membres", icon: <DirectoryIcon />, link: "/annuaire" },
    ];

    // Toggle for mobile
    const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

    return (
        <>
            {/* Mobile Header / Hamburger - Only visible on small screens via CSS */}
            {/* Mobile Header - Simplified (Drawer replaced by BottomNav) */}
            <div className={styles.mobileHeader}>
                <Link href="/home" className={styles.mobileLogo} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="6" width="20" height="4" rx="2" fill="#0698D6"/>
                        <rect x="2" y="14" width="28" height="4" rx="2" fill="#1E3664"/>
                        <rect x="10" y="22" width="20" height="4" rx="2" fill="#0698D6"/>
                    </svg>
                    <span className={styles.mobileTitle}>VISIOCONF</span>
                </Link>
                
                {user && (
                    <Link href="/profile" className={styles.mobileProfileLink}>
                        <img 
                            src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`} 
                            alt="Profile" 
                            className={styles.mobileAvatar}
                        />
                         <div className={styles.statusIndicator} style={{
                            backgroundColor: user.disturb_status === 'dnd' ? '#EF4444' : 
                                            (user.disturb_status === 'away' ? '#F97316' : '#22C55E')
                        }}></div>
                    </Link>
                )}
            </div>

            {/* Overlay for mobile drawer */}
            {isMobileOpen && <div className={styles.overlay} onClick={() => setIsMobileOpen(false)} />}

            <div 
                className={`
                    ${styles.sidebar} 
                    ${isPinned ? styles.expanded : styles.collapsed}
                    ${isMobileOpen ? styles.mobileOpen : ''}
                `}
            >
                <div className={styles.header}>
                    <div className={styles.logoWrapper}>
                        <Link href="/home" className={styles.logoLink}>
                            <div className={styles.logoIcon}>
                                {/* Simple Logo Placeholder or SVG */}
                                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="2" y="6" width="20" height="4" rx="2" fill="#0698D6"/>
                                    <rect x="2" y="14" width="28" height="4" rx="2" fill="#1E3664"/>
                                    <rect x="10" y="22" width="20" height="4" rx="2" fill="#0698D6"/>
                                </svg>
                            </div>
                            {isPinned && <span className={styles.logoText}>VISIOCONF</span>}
                        </Link>
                    </div>
                </div>

                {/* Refined Desktop Toggle Button - Floating at the edge */}
                <button 
                    className={`${styles.toggleBtn} ${!isPinned ? styles.collapsedToggle : ''}`} 
                    onClick={togglePin}
                    title={isPinned ? "Réduire" : "Développer"}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        {isPinned ? (
                            <polyline points="15 18 9 12 15 6"></polyline>
                        ) : (
                            <polyline points="9 18 15 12 9 6"></polyline>
                        )}
                    </svg>
                </button>

                <nav className={styles.nav}>
                    {menuItems.map((item, index) => {
                        const isActive = pathname.startsWith(item.link);
                        return (
                            <Link 
                                href={item.link} 
                                key={index} 
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                            >
                                <span className={styles.icon}>{item.icon}</span>
                                <span className={styles.label}>{item.label}</span>
                                {item.badge > 0 && (
                                    <span className={styles.badge}>
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className={styles.footer}>
                    {user && (
                        <Link href="/profile" className={styles.profileContainer} style={{textDecoration:'none', color:'inherit'}}>
                            <div className={styles.avatarWrapper}>
                                <img 
                                    src={`https://api.dicebear.com/9.x/shapes/svg?seed=${user._id}`} 
                                    alt="Profile" 
                                    className={styles.avatar}
                                />
                                <div className={styles.statusIndicator} style={{
                                    backgroundColor: user.disturb_status === 'dnd' ? '#EF4444' : 
                                                    (user.disturb_status === 'away' ? '#F97316' : '#22C55E')
                                }}></div>
                            </div>
                            <div className={styles.profileInfo}>
                                <span className={styles.userName}>{user.firstname}</span>
                                <span className={styles.userRole}>{user.role || 'Membre'}</span>
                            </div>
                        </Link>
                    )}
                    {user && isPinned && (
                        <button 
                            className={styles.logoutBtn} 
                            onClick={() => { localStorage.removeItem('user'); window.location.href = '/login'; }}
                            title="Se déconnecter"
                        >
                            <LogoutIcon />
                        </button>
                    )}
                </div>

            </div>
        </>
    );
}

// Icons Components (Simple SVGs based on image)
function HomeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
    )
}

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

function GlobalIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
    )
}

function CollabIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <polyline points="16 11 18 13 22 9"></polyline>
        </svg>
    )
}

function LogoutIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
    )
}
