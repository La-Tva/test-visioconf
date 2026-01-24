"use client";
import React from 'react';
import Link from 'next/link';
import styles from './landing.module.css';
import Info from './components/section/info';
import Footer from './components/Footer';

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
            {/* Left Column: Text & CTA */}
            <div className={styles.leftColumn}>
                
                {/* Social Proof Widget */}
                <div className={styles.socialProof}>
                    <div className={styles.avatars}>
                        {[1,2,3,4].map((i) => (
                            <img 
                                key={i} 
                                src={`https://i.pravatar.cc/100?u=${i + 10}`} 
                                alt="User Avatar" 
                                className={styles.avatar} 
                            />
                        ))}
                    </div>
                    <div className={styles.rating}>
                        <span className={styles.stars}>★★★★★</span>
                        <span>+ de 200 groupes créés</span>
                    </div>
                </div>

                <h1 className={styles.title}>
                    <span>VOTRE PORTAIL</span>
                    <span className={styles.highlight}>VISIOCONFÉRENCE</span>
                </h1>

                <p className={styles.description}>
                    Bienvenue sur la plateforme de communication de l'Université de Toulon. 
                    Connectez-vous pour accéder à vos services de visioconférence sécurisés.
                </p>

                <div className={styles.buttons}>
                    {isLoggedIn ? (
                        <Link href="/home">
                            <button className={styles.btnPrimary}>Accéder à mon espace</button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/login">
                                <button className={styles.btnPrimary}>Se connecter</button>
                            </Link>
                            <Link href="/register">
                                <button className={styles.btnSecondary}>Créer un compte</button>
                            </Link>
                        </>
                    )}
                </div>
            </div>

            {/* Right Column: Visuals */}
            <div className={styles.rightColumn}>
                {/* CSS-only Dashboard Mockup to avoid needing an asset */}
                <div className={styles.dashboardMockupCard}>
                    <div className={styles.mockupHeader}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Bonjour, John Doe 👋</div>
                        <div style={{ fontSize: '0.8rem', color: '#999' }}>Historique d'appels</div>
                    </div>
                    <div className={styles.mockupContent}>
                        <div className={styles.sidebar}>
                            {/* Fake Icons */}
                            <span>☷</span>
                            <span>💬</span>
                            <span>👤</span>
                        </div>
                        <div className={styles.mainArea}>
                            <div style={{ marginBottom: '15px' }}>
                                 <div style={{ fontSize: '0.9rem', marginBottom: '5px', fontWeight: 'bold' }}>Vos groupes :</div>
                                 <div style={{ display: 'flex', gap: '10px' }}>
                                    {[1,2,3,4].map(i => <div key={i} style={{width: '40px', height: '40px', borderRadius: '10px', background: '#eee'}} />)}
                                 </div>
                            </div>
                            
                            <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>6 nouvelles notifications</div>
                                {[1,2,3].map(i => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#ddd' }} />
                                        <div style={{ flex: 1, height: '8px', background: '#eee', borderRadius: '4px' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Character Overlay */}
                 <img 
                    src="/assets/Landing-avatar.png" 
                    alt="Character Illustration" 
                    className={styles.characterImage}
                    onError={(e) => e.target.style.display = 'none'} 
                />
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
