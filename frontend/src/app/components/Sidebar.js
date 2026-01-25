"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

import { usePreload } from '../context/PreloadContext';

export default function Sidebar() {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isMobileOpen, setIsMobileOpen] = useState(false); // State for mobile drawer
    const [user, setUser] = useState(null);
    const pathname = usePathname();
    const { friends, teams } = usePreload();

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

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch (e) {
                console.error("Sidebar user parse error", e);
            }
        }
    }, [pathname]);

    const menuItems = [
        { label: "Conversation", icon: <MessageIcon />, link: "/messages", badge: totalUnread },
        { label: "Équipe", icon: <TeamIcon />, link: "/team", badge: totalTeamUnread },
        { label: "Dossier", icon: <FolderIcon />, link: "/files" },
        { label: "Annuaire", icon: <DirectoryIcon />, link: "/annuaire" },
    ];

    // Toggle for mobile
    const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

    return (
        <>
            {/* Mobile Header / Hamburger - Only visible on small screens via CSS */}
            <div className={styles.mobileHeader}>
                <button className={styles.hamburgerBtn} onClick={toggleMobileMenu}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <span className={styles.mobileTitle}>VISIOCONF</span>
                
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
                    ${isExpanded ? styles.expanded : styles.collapsed}
                    ${isMobileOpen ? styles.mobileOpen : ''}
                `}
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
                    {/* Close button for mobile */}
                    <button className={styles.mobileCloseBtn} onClick={() => setIsMobileOpen(false)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <nav className={styles.nav}>
                    {menuItems.map((item, index) => {
                        const isActive = pathname === item.link;
                        return (
                            <Link 
                                href={item.link} 
                                key={index} 
                                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                                onClick={() => setIsMobileOpen(false)} // Close drawer on navigation
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
                        <div className={styles.profileContainer}>
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
                        </div>
                    )}
                </div>

            </div>
        </>
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
