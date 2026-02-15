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

        {/* SECTION 3: ALL FEATURES (Bento Grid) - NEW */}
        <section className={styles.bentoSection}>
             <div className={styles.containerColumn}>
                <div className={styles.centerHeader}>
                    <div className={styles.tagline}>TOUT INCLUS</div>
                    <h2 className={styles.title}>Une suite complète d'outils</h2>
                    <p className={styles.subtitle}>
                        Tout ce dont vous avez besoin pour enseigner et apprendre efficacement à distance.
                    </p>
                </div>

                <div className={styles.bentoGrid}>
                    {/* 1. Visioconférence (Blue) */}
                    <div className={`${styles.bentoCard} ${styles.bentoCardBlue}`}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Visioconférence</h3>
                        <p className={styles.bentoDesc}>Conférences en haute définition pour tous vos cours magistraux.</p>
                    </div>

                    {/* 2. Appel Visio (White) */}
                    <div className={styles.bentoCard}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.91 11.67L13.41 14.17L10.5 11.25L13 8.75L15.91 11.67ZM15.91 11.67L18.5 9.08L21.42 12L18.83 14.58L15.91 11.67Z"></path><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Appel Visio</h3>
                        <p className={styles.bentoDesc}>Appels vidéo individuels directs pour le tutorat ou le suivi personnalisé.</p>
                    </div>

                    {/* 3. Appel d'équipe (Blue) */}
                    <div className={`${styles.bentoCard} ${styles.bentoCardBlue}`}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Appel d'équipe</h3>
                        <p className={styles.bentoDesc}>Réunions de groupe instantanées pour la collaboration étudiante.</p>
                    </div>

                    {/* 4. Chat Privé (White) */}
                    <div className={styles.bentoCard}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Chat Privé</h3>
                        <p className={styles.bentoDesc}>Messagerie directe sécurisée pour échanger avec vos pairs ou professeurs.</p>
                    </div>

                    {/* 5. Chat d'équipe (Blue) */}
                    <div className={`${styles.bentoCard} ${styles.bentoCardBlue}`}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Chat d'équipe</h3>
                        <p className={styles.bentoDesc}>Canaux de discussion dédiés par matière, projet ou groupe de travail.</p>
                    </div>

                    {/* 6. Annuaire (White) */}
                    <div className={styles.bentoCard}>
                        <div className={styles.bentoIconWrapper}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Annuaire</h3>
                        <p className={styles.bentoDesc}>Retrouvez facilement tous les étudiants et enseignants de l'université.</p>
                    </div>

                    {/* 7. Espace Fichiers Communs (Blue) */}
                    <div className={`${styles.bentoCard} ${styles.bentoCardBlue}`}>
                        <div className={styles.bentoIconWrapper}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Fichiers Communs</h3>
                        <p className={styles.bentoDesc}>Partagez des ressources accessibles à toute votre promotion instantanément.</p>
                    </div>

                    {/* 8. Espace Fichiers Privé (White) */}
                    <div className={styles.bentoCard}>
                         <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="8" y1="2" x2="8" y2="4"></line><line x1="12" y1="2" x2="12" y2="4"></line></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Espace Privé</h3>
                        <p className={styles.bentoDesc}>Stockez vos notes, devoirs et documents personnels en toute sécurité.</p>
                    </div>

                    {/* 9. Partage Équipe (Blue) */}
                    <div className={`${styles.bentoCard} ${styles.bentoCardBlue}`}>
                        <div className={styles.bentoIconWrapper}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"></path><path d="M14 2v6h6"></path><path d="M3 15h6"></path><path d="M6 12v6"></path></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Fichiers d'Équipe</h3>
                        <p className={styles.bentoDesc}>Collaborer sur des documents partagés au sein de vos groupes de projet.</p>
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
