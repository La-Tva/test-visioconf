"use client";
import React from 'react';

export default function InfoPage() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: '"Inter", sans-serif', color:'#1E293B' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px', color: '#0F172A' }}>Bienvenue sur VISIOCONF</h1>
            <p style={{ fontSize: '16px', color: '#64748B', marginBottom: '40px', lineHeight: '1.6' }}>
                Votre plateforme collaborative tout-en-un pour gérer vos projets, communiquer avec votre équipe et partager vos ressources simplement.
            </p>

            <div style={{ display: 'grid', gap: '30px' }}>
                
                {/* Section Conversation */}
                <section style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ background: '#EFF6FF', padding: '10px', borderRadius: '8px', marginRight: '15px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Conversation</h2>
                    </div>
                    <p style={{ color: '#475569', lineHeight: '1.6' }}>
                        Échangez en temps réel avec vos collègues. Envoyez des messages privés, partagez des idées et restez connecté avec votre réseau professionnel.
                    </p>
                </section>

                {/* Section Équipe */}
                <section style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ background: '#FEF3C7', padding: '10px', borderRadius: '8px', marginRight: '15px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Équipe</h2>
                    </div>
                    <p style={{ color: '#475569', lineHeight: '1.6', marginBottom: '8px' }}>
                        Créez des groupes de travail dédiés à vos projets. 
                    </p>
                    <ul style={{ marginTop: '0', paddingLeft: '20px', color: '#475569', lineHeight: '1.6' }}>
                        <li style={{ marginBottom: '5px' }}><strong>Créer une équipe :</strong> Bouton "Créer une équipe" en haut à droite.</li>
                        <li style={{ marginBottom: '5px' }}><strong>Gérer les membres :</strong> En tant que propriétaire ("Proprio"), vous pouvez ajouter ou retirer des membres depuis le panneau latéral du chat.</li>
                        <li style={{ marginBottom: '5px' }}><strong>Filtrer :</strong> Retrouvez facilement vos groupes grâce aux filtres (Étudiant/Admin) et à la barre de recherche.</li>
                    </ul>
                </section>

                {/* Section Dossier */}
                <section style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ background: '#DCFCE7', padding: '10px', borderRadius: '8px', marginRight: '15px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Dossier</h2>
                    </div>
                    <p style={{ color: '#475569', lineHeight: '1.6' }}>
                        Centralisez vos documents. Importez, organisez et partagez vos fichiers importants avec les membres de vos équipes.
                    </p>
                </section>

                {/* Section Annuaire */}
                <section style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ background: '#F3E8FF', padding: '10px', borderRadius: '8px', marginRight: '15px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333EA" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Annuaire</h2>
                    </div>
                    <p style={{ color: '#475569', lineHeight: '1.6' }}>
                        Retrouvez l'ensemble des utilisateurs de la plateforme. Ajoutez des amis pour commencer à collaborer.
                    </p>
                </section>

            </div>
            
            <div style={{ marginTop: '50px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                VISIOCONF v1.0 • Fait avec ❤️ par l'équipe de dev
            </div>
        </div>
    );
}
