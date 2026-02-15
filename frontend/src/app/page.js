"use client";
import React from 'react';
import Link from 'next/link';
import styles from './landing.module.css';
import Info from './components/section/info';
import Footer from './components/Footer';
import LandingNavbar from './components/LandingNavbar';

export default function Landing() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    // Check if user exists in localStorage
    const user = localStorage.getItem('user');
    if (user) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className={styles.container}>
      <LandingNavbar isLoggedIn={isLoggedIn} />
      {/* Wrapper for the 80vh Hero Section */}
      <div className={styles.topSection}>
          {/* Header */}
          <header className={styles.header}>
             <img 
                src="/assets/Logo-univ.svg" 
                alt="Université de Toulon" 
                className={styles.logo}
                onError={(e) => e.target.style.display = 'none'} 
              />
          </header>

          {/* Main Hero */}
          <main className={styles.hero}>
            <div className={styles.heroBackground}>
                <div className={styles.blob1}></div>
                <div className={styles.blob2}></div>
            </div>

            {/* Left Column: Text & CTA */}
            <div className={styles.leftColumn}>
                
                {/* Social Proof Widget */}
                <div className={styles.socialProof}>
                    <div className={styles.avatars}>
                        {[1,2,3,4].map((i) => (
                            <img 
                                key={i} 
                                src={`https://i.pravatar.cc/100?u=${i + 20}`} 
                                alt="User Avatar" 
                                className={styles.avatar} 
                            />
                        ))}
                    </div>
                    <div className={styles.rating}>
                        <span className={styles.stars}>★★★★★</span>
                        <span className={styles.ratingText}>Rejoint par +2000 étudiants</span>
                    </div>
                </div>

                <h1 className={styles.title}>
                    L'avenir de l'enseignement <br/>
                    <span className={styles.highlight}>est hybride.</span>
                </h1>

                <p className={styles.description}>
                    La plateforme de visioconférence conçue pour l'excellence universitaire. 
                    Cours magistraux, travaux dirigés et collaboration en temps réel, le tout en haute définition.
                </p>


                <div className={styles.buttons}>
                    {isLoggedIn ? (
                        <Link href="/home">
                            <button className={styles.btnPrimary}>
                                Accéder à mon espace
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft: '8px'}}><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
                            </button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/register">
                                <button className={styles.btnPrimary}>Commencer maintenant</button>
                            </Link>
                            <Link href="/login">
                                <button className={styles.btnSecondary}>Se connecter</button>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Right Column: Visuals */}
            <div className={styles.rightColumn}>
                {/* Abstract Glassmorphism Composition */}
                <div className={styles.heroComposition}>
                    {/* Main Interface Card */}
                    <div className={styles.glassCardMain}>
                        <div className={styles.cardHeader}>
                            <div className={styles.dotRed}></div>
                            <div className={styles.dotYellow}></div>
                            <div className={styles.dotGreen}></div>
                        </div>
                        <div className={styles.videoGrid}>
                            <div className={styles.videoPlaceholder}>
                                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" alt="Student" />
                                <div className={styles.micIcon}>🎤</div>
                            </div>
                            <div className={styles.videoPlaceholder}>
                                <img src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=400&q=80" alt="Student" />
                            </div>
                            <div className={styles.videoPlaceholder}>
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" alt="Student" />
                            </div>
                            <div className={styles.videoPlaceholder}>
                                <img src="https://images.unsplash.com/photo-1544717297-fa95b6ee9643?auto=format&fit=crop&w=400&q=80" alt="Teacher" />
                                <div className={styles.nameTag}>Dr. Sarah Cohen</div>
                            </div>
                        </div>
                        <div className={styles.controlsBar}>
                            <div className={styles.controlBtn}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                            </div>
                            <div className={styles.controlBtn}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                            </div>
                            <div className={styles.controlBtnRed}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
                            </div>
                            <div className={styles.controlBtn}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Floating Elements */}
                    <div className={styles.floatingBadge1}>
                        <div className={styles.iconCircle}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        </div>
                        <div>
                            <div className={styles.badgeTitle}>Connexion stable</div>
                            <div className={styles.badgeSub}>Latence &lt; 30ms</div>
                        </div>
                    </div>
                    
                    <div className={styles.floatingBadge2}>
                        <div className={styles.iconCircle}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <div>
                            <div className={styles.badgeTitle}>100% Sécurisé</div>
                            <div className={styles.badgeSub}>Chiffré de bout en bout</div>
                        </div>
                    </div>

                    <div className={styles.floatingBadge3}>
                        <div className={styles.iconCircle}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <div>
                            <div className={styles.badgeTitle}>+2000 Étudiants</div>
                            <div className={styles.badgeSub}>En ligne</div>
                        </div>
                    </div>

                    <div className={styles.floatingBadge4}>
                        <div className={styles.iconCircle}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <div>
                            <div className={styles.badgeTitle}>Fichiers partagés</div>
                            <div className={styles.badgeSub}>Stockage illimité</div>
                        </div>
                    </div>
                </div>
            </div>
          </main>
          
          <div 
            className={styles.scrollIndicator} 
            onClick={() => document.getElementById('info')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Pour plus d'information <br/> ↓
          </div>
      </div>

      

      <Info />
      <Footer />

    </div>
  );
}
