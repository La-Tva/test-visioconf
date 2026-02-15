import React from 'react';
import Link from 'next/link';
import styles from './info.module.css';

export default function Info() {
  return (
    <div className={styles.wrapper} id="info">
        {/* SECTION 1: HOW IT WORKS (Workflow) - NEW */}
        <section className={styles.section}>
            <div className={styles.containerColumn}>
                <div className={styles.centerHeader}>
                    <div className={styles.tagline}>DÉMARRAGE RAPIDE</div>
                    <h2 className={styles.title}>Comment ça marche ?</h2>
                    <p className={styles.subtitle}>Votre salle de classe virtuelle en 3 étapes simples.</p>
                </div>

                <div className={styles.workflowGrid}>
                    {/* Step 1 */}
                    <div className={styles.workflowStep}>
                        <div className={styles.stepNumber}>1</div>
                        <div className={styles.stepContent}>
                            <div className={styles.stepIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                            </div>
                            <h3 className={styles.stepTitle}>Inscrivez-vous</h3>
                            <p className={styles.stepDesc}>Créez votre compte étudiant ou enseignant en quelques secondes avec votre email universitaire.</p>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className={styles.workflowArrow}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </div>

                    {/* Step 2 */}
                    <div className={styles.workflowStep}>
                        <div className={styles.stepNumber}>2</div>
                        <div className={styles.stepContent}>
                            <div className={styles.stepIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <h3 className={styles.stepTitle}>Rejoignez une équipe</h3>
                            <p className={styles.stepDesc}>Créez ou rejoignez un groupe de travail pour vos projets ou vos cours magistraux.</p>
                        </div>
                    </div>

                    {/* Arrow */}
                    <div className={styles.workflowArrow}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </div>

                    {/* Step 3 */}
                    <div className={styles.workflowStep}>
                        <div className={styles.stepNumber}>3</div>
                        <div className={styles.stepContent}>
                            <div className={styles.stepIcon}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                </svg>
                            </div>
                            <h3 className={styles.stepTitle}>Lancez l'appel</h3>
                            <p className={styles.stepDesc}>Démarrez une visioconférence HD avec partage d'écran et chat intégré.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* SECTION 2: WHY CHOOSE US (Features) - REDESIGNED */}
        <section className={styles.hasBackground}>
            <div className={styles.containerColumn}>
                <div className={styles.centerHeader}>
                    <div className={styles.tagline}>POURQUOI NOUS CHOISIR ?</div>
                    <h2 className={styles.title}>Une solution pensée pour l'université</h2>
                    <p className={styles.subtitle}>
                        Oubliez les outils complexes. VisioConf offre une expérience fluide, sécurisée et centrée sur la pédagogie.
                    </p>
                </div>

                <div className={styles.featureGridFull}>
                    <div className={styles.miniFeatureCard}>
                        <div className={styles.miniIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                        <div className={styles.miniFeatureContent}>
                            <h4>Sécurité Maximale</h4>
                            <p>Chiffrement de bout en bout et hébergement souverain pour protéger vos données académiques.</p>
                        </div>
                    </div>
                    <div className={styles.miniFeatureCard}>
                        <div className={styles.miniIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                            </svg>
                        </div>
                        <div className={styles.miniFeatureContent}>
                            <h4>Performance</h4>
                            <p>Optimisé pour les réseaux universitaires et la 4G/5G, assurant une fluidité même en mobilité.</p>
                        </div>
                    </div>
                    <div className={styles.miniFeatureCard}>
                        <div className={styles.miniIcon}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 10v6M2 10v6"></path>
                                <path d="M22 16.1A5 5 0 0 1 18 20H6a5 5 0 0 1-5-5.9"></path>
                                <path d="M2 10a5 5 0 0 1 8-4h4a5 5 0 0 1 8 4"></path>
                                <line x1="12" y1="2" x2="12" y2="6"></line>
                            </svg>
                        </div>
                        <div className={styles.miniFeatureContent}>
                            <h4>Outils Pédagogiques</h4>
                            <p>Tableau blanc dématérialisé, partage de documents et création de sous-groupes de travail.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* SECTION 3: CTA */}
        <section className={styles.ctaSection}>
            <div className={styles.ctaBackground}></div>
            <div className={styles.ctaContent}>
                <h2 className={styles.ctaTitle}>Prêt à collaborer autrement ?</h2>
                <p className={styles.ctaText}>
                    Rejoignez dès maintenant la communauté universitaire sur VisioConf.
                </p>
                <div className={styles.ctaButtons}>
                     <Link href="/register">
                        <button className={styles.ctaButtonPrimary}>Créer un compte</button>
                    </Link>
                    <Link href="/login">
                        <button className={styles.ctaButtonSecondary}>Se connecter</button>
                    </Link>
                </div>
            </div>
        </section>
    </div>
  );
}
