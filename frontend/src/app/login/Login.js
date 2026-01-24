"use client";
import React, { useState, useEffect, useRef } from 'react';
import Controleur from '@/controllers/controleur';
import CanalSocketio from '@/controllers/canalsocketio';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const controleurRef = useRef(null);
  const loginCompRef = useRef(null);
  
  // Refs for current state access in callbacks
  const emailRef = useRef(email);
  const passwordRef = useRef(password);
  const rememberMeRef = useRef(rememberMe);

  useEffect(() => { emailRef.current = email; }, [email]);
  useEffect(() => { passwordRef.current = password; }, [password]);
  useEffect(() => { rememberMeRef.current = rememberMe; }, [rememberMe]);

  useEffect(() => {
    // Pre-fill from localStorage if available
    try {
        const remembered = localStorage.getItem('remembered_user');
        if (remembered) {
            const data = JSON.parse(remembered);
            if (data.email) setEmail(data.email);
            if (data.password) setPassword(data.password);
            setRememberMe(true);
        }
    } catch(e) { console.error(e); }

    const ctrl = new Controleur();
    const canal = new CanalSocketio(ctrl, "SocketCanal");
    
    controleurRef.current = ctrl;

    const loginComp = {
        nomDInstance: "LoginComponent",
        traitementMessage: (msg) => {
            if (msg.login_status) {
                const response = msg.login_status;
                setIsLoading(false);
                if (response.success) {
                    // Store user info in localStorage for simple session management
                    localStorage.setItem('user', JSON.stringify(response.user));

                    // Remember Me persist (Pre-fill)
                    if (rememberMeRef.current) {
                        localStorage.setItem('remembered_user', JSON.stringify({
                            email: emailRef.current,
                            password: passwordRef.current
                        }));
                    } else {
                        localStorage.removeItem('remembered_user');
                    }
                    
                    setStatus(`Connexion réussie!`);
                    router.push('/home'); 
                } else {
                    setStatus(`Erreur: ${response.error}`);
                }
            }
        }
    };
    loginCompRef.current = loginComp;

    ctrl.inscription(loginComp, ['login'], ['login_status']);

    // Check if duplicate connection (already logged in)
    const userStr = localStorage.getItem('user');
    if (userStr) {
        router.push('/home');
    }

    return () => {
       if (canal.socket) canal.socket.disconnect();
    };
  }, [router]);

  const handleLogin = (e) => {
      e.preventDefault();
      if (!email || !password) return;
      
      setIsLoading(true);
      setStatus('');

      if (controleurRef.current && loginCompRef.current) {
          const messageContent = {
              email: email,
              password: password
          };
          
          controleurRef.current.envoie(loginCompRef.current, {
              login: messageContent
          });
      }
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
                
                <h1 className={styles.welcomeText}>Bon retour !</h1>
                
                {/* Visual SSO Button (Mockup) */}
                <button className={styles.ssoButton} onClick={() => alert("SSO non configuré")}>
                    <span>G</span> Connexion avec l'Université
                </button>

                <div className={styles.divider}>OU CONNEXION EMAIL</div>

                <form onSubmit={handleLogin} className={styles.form}>
                    <input 
                        type="email" 
                        placeholder="Votre Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={styles.input}
                    />
                    
                    <div style={{ position: 'relative' }}>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="Votre Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={styles.inputWithIcon}
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

                    <div className={styles.optionsRow}>
                        <label className={styles.rememberMe}>
                            <input 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            Rester connecté
                        </label>
                        <a href="#" className={styles.forgotPassword}>Mot de passe oublié ?</a>
                    </div>

                    <button 
                        type="submit" 
                        className={styles.loginButton} 
                        disabled={isLoading}
                    >
                        {isLoading ? "Connexion..." : "Se connecter →"}
                    </button>
                    
                     {status && (
                        <div style={{color: status.startsWith('Erreur') ? 'red' : 'green', textAlign: 'center', fontSize: '0.9rem'}}>
                            {status}
                        </div>
                    )}
                </form>

                <div className={styles.signupText}>
                    Vous n'avez pas de compte ? 
                    <Link href="/register">
                        <span className={styles.signupLink}> 
                            S'inscrire
                        </span>
                    </Link>
                </div>
            </div>

            {/* Right Side: Visuals */}
            <div className={styles.rightSide}>
                {/* Update Mockup */}
                <div className={styles.updateTag}>
                    <div className={styles.updateTitle}>Nouvelle Version Disponible</div>
                    <div className={styles.updateDesc}>Découvrez les nouvelles fonctionnalités de conférence.</div>
                    <Link href="/">
                        <button className={styles.learnMore}>EN SAVOIR PLUS</button>
                    </Link>
                </div>

                <div className={styles.illustrationContainer}>
                     <img 
                        src="/assets/Login.png" 
                        alt="Collaboration" 
                        className={styles.visualImage}
                        onError={(e) => e.target.style.display = 'none'} 
                    />
                </div>
            </div>
        </div>
    </div>
  );
}
