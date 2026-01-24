"use client";
import React, { useState, useEffect, useRef } from 'react';
import Controleur from '@/controllers/controleur';
import CanalSocketio from '@/controllers/canalsocketio';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Register.module.css';

export default function Register() {
  const [firstname, setFirstname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const controleurRef = useRef(null);
  const registerCompRef = useRef(null);

  useEffect(() => {
    const ctrl = new Controleur();
    const canal = new CanalSocketio(ctrl, "SocketCanal");
    
    controleurRef.current = ctrl;

    const registerComp = {
        nomDInstance: "RegisterComponent",
        traitementMessage: (msg) => {
            if (msg.registration_status) {
                const response = msg.registration_status;
                setIsLoading(false);
                if (response.success) {
                    setStatus(`Inscription réussie! Redirection...`);
                    // Store user info
                    localStorage.setItem('user', JSON.stringify(response.user));
                    setTimeout(() => {
                        router.push('/home'); 
                    }, 1000);
                } else {
                    setStatus(`Erreur: ${response.error}`);
                }
            }
        }
    };
    registerCompRef.current = registerComp;

    ctrl.inscription(registerComp, ['register'], ['registration_status']);

    return () => {
       if (canal.socket) canal.socket.disconnect();
    };
  }, [router]);

  const handleRegister = (e) => {
    e.preventDefault();
    setStatus('Inscription...');
    setIsLoading(true);

    const ctrl = controleurRef.current;
    if (!ctrl || !ctrl.listeAbonnement['register']) {
        // Wait or retry?
        setStatus("Connexion au serveur en cours... Réessayez dans un instant.");
        setIsLoading(false);
        // Force refresh of subscriptions just in case
        // canalRef.current.socket.emit("demande_liste", {}); 
        return;
    }

    if (password.length < 6) {
        setStatus("Le mot de passe doit contenir au moins 6 caractères");
        setIsLoading(false);
        return;
    }

    ctrl.envoie(registerCompRef.current, {
        register: {
            firstname,
            email,
            password
        }
    });
  };

  return (
    <div className={styles.container}>
        <div className={styles.card}>
            {/* Left Side: Form */}
            <div className={styles.leftSide}>
                 <img 
                    src="/assets/Logo-univ.svg" 
                    alt="Université de Toulon" 
                    className={styles.logo}
                    onError={(e) => e.target.style.display = 'none'} 
                />
                
                <h1 className={styles.welcomeText}>Créer un compte</h1>
                
                <form onSubmit={handleRegister} className={styles.form}>
                    <input 
                        type="text" 
                        placeholder="Prénom"
                        value={firstname}
                        onChange={(e) => setFirstname(e.target.value)}
                        className={styles.input}
                        required
                    />

                    <input 
                        type="email" 
                        placeholder="Votre Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                        required
                    />
                    
                    <div style={{ position: 'relative' }}>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Votre Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.inputWithIcon}
                            required
                        />
                         <span 
                            className={styles.eyeIcon}
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            )}
                        </span>
                    </div>

                    <button 
                        type="submit" 
                        className={styles.loginButton} 
                        disabled={isLoading}
                    >
                        {isLoading ? "Inscription..." : "S'inscrire →"}
                    </button>
                    
                     {status && (
                        <div style={{color: status.startsWith('Erreur') ? 'red' : 'green', textAlign: 'center', fontSize: '0.9rem'}}>
                            {status}
                        </div>
                    )}
                </form>

                <div className={styles.signupText}>
                    Déjà un compte ? 
                    <Link href="/login">
                        <span className={styles.signupLink}>Se connecter</span>
                    </Link>
                </div>
            </div>

            {/* Right Side: Visuals */}
            <div className={styles.rightSide}>
                <div className={styles.updateTag}>
                    <div className={styles.updateTitle}>Rejoignez la communauté</div>
                    <div className={styles.updateDesc}>Accédez à tous les outils de visioconférence.</div>
                </div>

                <div className={styles.illustrationContainer}>
                     <img 
                        src="/assets/Login.png" 
                        alt="Join us" 
                        className={styles.visualImage}
                        onError={(e) => e.target.style.display = 'none'} 
                    />
                </div>
            </div>
        </div>
    </div>
  );
}
