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
                    {/* Card 1: Video HD - Large */}
                    <div className={`${styles.bentoCard} ${styles.bentoCardLarge}`}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Visioconférence HD</h3>
                        <p className={styles.bentoDesc}>Une qualité d'image cristalline et un son haute fidélité pour des cours comme si vous y étiez. Jusqu'à 100 participants simultanés.</p>
                    </div>

                    {/* Card 2: Screen Share */}
                    <div className={styles.bentoCard}>
                        <div className={styles.bentoIconWrapper}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"></path><path d="M8 21h8"></path><path d="M12 17v4"></path><path d="M17 8l5-5"></path><path d="M17 3h5v5"></path></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Partage d'écran</h3>
                        <p className={styles.bentoDesc}>Partagez vos présentations, documents ou applications en un clic.</p>
                    </div>

                    {/* Card 3: Chat */}
                    <div className={styles.bentoCard}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Chat live</h3>
                        <p className={styles.bentoDesc}>Interagissez avec les étudiants, posez des questions et réagissez en direct.</p>
                    </div>

                    {/* Card 4: Whiteboard - Large */}
                    <div className={`${styles.bentoCard} ${styles.bentoCardLarge}`}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Tableau Blanc Interactif</h3>
                        <p className={styles.bentoDesc}>Schématisez vos idées en temps réel. Outils de dessin avancés collaboratifs pour les explications complexes.</p>
                    </div>

                    {/* Card 5: Files */}
                    <div className={styles.bentoCard}>
                        <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Partage de fichiers</h3>
                        <p className={styles.bentoDesc}>Envoyez vos supports de cours PDF, PPTX directement dans la salle.</p>
                    </div>

                    {/* Card 6: Recording */}
                    <div className={styles.bentoCard}>
                         <div className={styles.bentoIconWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        </div>
                        <h3 className={styles.bentoTitle}>Enregistrement</h3>
                        <p className={styles.bentoDesc}>Enregistrez vos cours pour que les étudiants puissent les revoir plus tard.</p>
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
