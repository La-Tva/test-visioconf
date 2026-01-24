import React from 'react';
import Link from 'next/link';
import styles from './info.module.css';

export default function Info() {
  return (
    <div className={styles.wrapper}>
        {/* SECTION 1: ORIGINAL INTRO */}
        <section className={styles.section} id="intro">
            <div className={styles.container}>
                <div className={styles.visualContent}>
                    <div className={styles.imageCard}>
                        <img 
                            src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                            alt="Collaboration" 
                            className={styles.image} 
                        />
                    </div>
                </div>

                <div className={styles.textContent}>
                    <div className={styles.tagline}>POURQUOI NOUS CHOISIR ?</div>
                    <h2 className={styles.title}>Une solution adaptée à l'enseignement supérieur</h2>
                    <p className={styles.text}>
                        Découvrez une plateforme conçue spécifiquement pour les besoins des universités. 
                        Sécurité des données, facilité d'utilisation et intégration transparente avec vos outils existants.
                    </p>

                    <ul className={styles.featureList}>
                        <li className={styles.featureItem}>
                            <span className={styles.checkIcon}>✓</span>
                            Qualité Haute Définition
                        </li>
                        <li className={styles.featureItem}>
                            <span className={styles.checkIcon}>✓</span>
                            Sécurité renforcée (RGPD)
                        </li>
                        <li className={styles.featureItem}>
                            <span className={styles.checkIcon}>✓</span>
                            Accessibilité multi-supports
                        </li>
                    </ul>
                </div>
            </div>
        </section>

        {/* SECTION 2: CARDS (FEATURES) */}
        <section className={styles.hasBackground}>
            <div className={styles.containerColumn}>
                <div className={styles.centerHeader}>
                    <h2 className={styles.title}>Tout ce dont vous avez besoin</h2>
                    <p className={styles.subtitle}>Des fonctionnalités pensées pour la pédagogie et la collaboration.</p>
                </div>

                <div className={styles.grid}>
                    {/* Card 1 */}
                    <div className={styles.card}>
                        <div className={styles.cardIcon}>🔒</div>
                        <h3 className={styles.cardTitle}>Sécurisé</h3>
                        <p className={styles.cardDesc}>
                            Vos échanges sont chiffrés de bout en bout. Respect total du RGPD et hébergement en France.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className={styles.card}>
                        <div className={styles.cardIcon}>⚡</div>
                        <h3 className={styles.cardTitle}>Rapide</h3>
                        <p className={styles.cardDesc}>
                            Une latence minimale pour des échanges fluides, même avec une connexion limitée.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className={styles.card}>
                        <div className={styles.cardIcon}>🎓</div>
                        <h3 className={styles.cardTitle}>Intuitif</h3>
                        <p className={styles.cardDesc}>
                            Interface épurée ne nécessitant aucune formation préalable pour les étudiants et enseignants.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* SECTION 3: SLIDER (Horizontal Scroll) */}
        <section className={styles.section}>
            <div className={styles.containerColumn}>
                <div className={styles.centerHeader}>
                    <h2 className={styles.title}>En immersion</h2>
                    <p className={styles.subtitle}>Découvrez l'expérience utilisateur en images.</p>
                </div>

                <div className={styles.slider}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={styles.slide}>
                             <img 
                                src={`https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80&sig=${i}`} 
                                alt={`Slide ${i}`} 
                                className={styles.slideImage} 
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* SECTION 4: CTA */}
        <section className={styles.ctaSection}>
            <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>Prêt à transformer vos cours ?</h2>
                <p className={styles.ctaText}>
                    Rejoignez dès maintenant la plateforme de visioconférence de l'Université.
                </p>
                <Link href="/register">
                    <button className={styles.ctaButton}>Créer un compte étudiant</button>
                </Link>
            </div>
        </section>
    </div>
  );
}
