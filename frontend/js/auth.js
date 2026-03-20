/* ═══════════════════════════════════════
   CLOUD RESOURCE TRACKER — auth.js
   AWS Cognito authentication logic
   ═══════════════════════════════════════ */

'use strict';
console.log('%c🚀 CLOUD RESOURCE TRACKER AUTH V4.0: Loaded', 'color: #3b82f6; font-weight: bold;');

// ── COGNITO CONFIG ───────────────────────────────────
// From AWS Cognito User Pool console
const COGNITO_USER_POOL_ID = 'ap-southeast-2_ZMufTlAjo';
const COGNITO_CLIENT_ID = '6tkb0i2gbosk9j00f4ue3rq5ca';

// ── COGNITO SETUP ────────────────────────────────────
let userPool;

// Initialize Cognito User Pool (SDK must load from script tag first)
function initializeCognitoPool() {
    if (typeof AmazonCognitoIdentity === 'undefined') {
        console.warn('⚠️ AmazonCognitoIdentity SDK not available yet');
        return false;
    }

    const poolData = {
        UserPoolId: COGNITO_USER_POOL_ID,
        ClientId: COGNITO_CLIENT_ID,
    };
    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    console.log('✅ Cognito User Pool initialized');
    return true;
}

// Try to initialize immediately
initializeCognitoPool();

// Also try on DOMContentLoaded as fallback
document.addEventListener('DOMContentLoaded', () => {
    if (!userPool) {
        initializeCognitoPool();
    }
});

// Holds the pending-verification email
let pendingEmail = '';

// ── HELPERS ───────────────────────────────────────────
/**
 * Show/hide loading state on button
 */
function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    
    btn.disabled = loading;
    
    if (text) text.classList.toggle('hidden', loading);
    if (spinner) spinner.classList.toggle('hidden', !loading);
}

/**
 * Display error message
 */
function showError(elementId, msg) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = msg;
        el.classList.add('visible');
    }
}

/**
 * Clear all error messages
 */
function clearErrors() {
    document.querySelectorAll('.auth-error').forEach(e => {
        e.textContent = '';
        e.classList.remove('visible');
    });
}

/**
 * Store authentication tokens in localStorage
 */
function storeSession(idToken, userId) {
    localStorage.setItem('idToken', idToken);
    localStorage.setItem('userId', userId);
    console.log('✅ Session stored successfully');
}

/**
 * Retrieve stored ID token
 */
function getStoredToken() {
    return localStorage.getItem('idToken');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getStoredToken();
}

/**
 * Clear session data
 */
function clearSession() {
    localStorage.removeItem('idToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('tokenExpiry');
    sessionStorage.removeItem('pendingEmail');
}

// ── PASSWORD SHOW/HIDE ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Password toggle buttons
    document.querySelectorAll('.eye-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.dataset.target;
            const input = document.getElementById(target);
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
                btn.textContent = input.type === 'password' ? '👁' : '🙈';
            }
        });
    });

    // Sign In Form Handler
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
        signinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }

    // Sign Up Form Handler
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            signup();
        });
    }

    // Verify Form Handler
    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            verifyCode();
        });
    }

    // Resend Code Button Handler
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) {
        resendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resendCode();
        });
    }
});

// ── SIGN IN (index.html) ───────────────────────────────
function login() {
    // Check if Cognito SDK is available
    if (typeof AmazonCognitoIdentity === 'undefined') {
        console.error('❌ Cognito SDK not loaded yet');
        showError('signin-error', 'Authentication service not ready. Please refresh the page.');
        setLoading('signin-btn', false);
        return;
    }

    const email = document.getElementById('signin-email');
    const password = document.getElementById('signin-password');
    
    if (!email || !password) {
        console.warn('⚠️ Email or password input not found');
        window.location.href = 'signup.html';
        return;
    }
    
    const emailVal = email.value.trim();
    const passwordVal = password.value;
    
    if (!emailVal || !passwordVal) {
        showError('signin-error', 'Please enter your email and password.');
        return;
    }
    
    clearErrors();
    setLoading('signin-btn', true);
    
    try {
        const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: emailVal,
            Password: passwordVal,
        });
        
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: emailVal,
            Pool: userPool,
        });
        
        cognitoUser.authenticateUser(authDetails, {
            onSuccess(result) {
                console.log('✅ Sign in successful');
                const idToken = result.getIdToken().getJwtToken();
                const payload = result.getIdToken().decodePayload();
                storeSession(idToken, payload.sub);
                localStorage.setItem('userEmail', payload.email || emailVal);
                
                // Brief delay to ensure storage is written before redirect
                setTimeout(() => {
                    window.location.replace('dashboard.html');
                }, 100);
            },
            onFailure(err) {
                setLoading('signin-btn', false);
                console.error('❌ Sign in failed:', err.message);
                showError('signin-error', err.message || 'Sign in failed. Please try again.');
            },
            newPasswordRequired() {
                setLoading('signin-btn', false);
                showError('signin-error', 'A new password is required. Please contact support.');
            },
        });
    } catch (e) {
        setLoading('signin-btn', false);
        console.error('❌ Error during sign in:', e);
        showError('signin-error', 'An error occurred. Please try again.');
    }
}

// ── SIGN UP (signup.html) ──────────────────────────────
function signup() {
    // Check if Cognito SDK is available
    if (typeof AmazonCognitoIdentity === 'undefined') {
        console.error('❌ Cognito SDK not loaded yet');
        showError('signup-error', 'Authentication service not ready. Please refresh the page.');
        setLoading('signup-btn', false);
        return;
    }

    clearErrors();
    
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (!firstNameInput || !lastNameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
        console.error('❌ Required form fields not found');
        return;
    }
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showError('signup-error', 'Please fill in all fields.');
        return;
    }
    
    if (password.length < 8) {
        showError('signup-error', 'Password must be at least 8 characters.');
        return;
    }
    
    if (password !== confirmPassword) {
        showError('signup-error', 'Passwords do not match.');
        return;
    }
    
    setLoading('signup-btn', true);
    
    try {
        const attributeList = [
            new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'email', Value: email }),
            new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'given_name', Value: firstName }),
            new AmazonCognitoIdentity.CognitoUserAttribute({ Name: 'family_name', Value: lastName }),
        ];
        
        userPool.signUp(email, password, attributeList, null, (err, result) => {
            setLoading('signup-btn', false);
            
            if (err) {
                console.error('❌ Sign up failed:', err.message);
                showError('signup-error', err.message || 'Sign up failed. Please try again.');
                return;
            }
            
            console.log('✅ Sign up successful, showing verification form');
            
            // Store pending email and password for auto-sign-in after verification
            pendingEmail = email;
            sessionStorage.setItem('pendingPassword', password);
            sessionStorage.setItem('pendingEmail', email);
            
            // Redirect to verification page
            window.location.href = 'verify.html';
        });
    } catch (e) {
        setLoading('signup-btn', false);
        console.error('❌ Error during sign up:', e);
        showError('signup-error', 'An error occurred. Please try again.');
    }
}

// ── VERIFY EMAIL CODE ──────────────────────────────────
function verifyCode() {
    // Check if Cognito SDK is available
    if (typeof AmazonCognitoIdentity === 'undefined') {
        console.error('❌ Cognito SDK not loaded yet');
        showError('verify-error', 'Authentication service not ready. Please refresh the page.');
        setLoading('verify-btn', false);
        return;
    }

    clearErrors();
    
    const codeInput = document.getElementById('verify-code');
    if (!codeInput) {
        console.error('❌ Verify code input not found');
        return;
    }
    
    const code = codeInput.value.trim();
    if (!code) {
        showError('verify-error', 'Please enter the verification code.');
        return;
    }
    
    // Get email from URL parameter or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || sessionStorage.getItem('pendingEmail') || pendingEmail;
    
    if (!email) {
        showError('verify-error', 'Email not found. Please sign up again.');
        return;
    }
    
    setLoading('verify-btn', true);
    
    try {
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
            Username: email,
            Pool: userPool,
        });
        
        cognitoUser.confirmRegistration(code, true, (err) => {
            if (err) {
                setLoading('verify-btn', false);
                console.error('❌ Verification failed:', err.message);
                showError('verify-error', err.message || 'Invalid code. Please try again.');
                return;
            }
            
            console.log('✅ Email verified successfully');
            
            // Get password from sessionStorage
            const password = sessionStorage.getItem('pendingPassword');
            
            if (!password) {
                // Password not available, redirect to sign in
                console.warn('⚠️ Password not found in session, redirecting to sign in');
                window.location.href = 'index.html';
                return;
            }
            
            // Auto sign-in after verification
            const authDetails = new AmazonCognitoIdentity.AuthenticationDetails({
                Username: email,
                Password: password,
            });
            
            cognitoUser.authenticateUser(authDetails, {
                onSuccess(result) {
                    console.log('✅ Auto sign-in successful after verification');
                    const idToken = result.getIdToken().getJwtToken();
                    const payload = result.getIdToken().decodePayload();
                    storeSession(idToken, payload.sub);
                    localStorage.setItem('userEmail', payload.email || email);
                    
                    // Clear session data
                    sessionStorage.removeItem('pendingPassword');
                    sessionStorage.removeItem('pendingEmail');
                    
                    setTimeout(() => {
                        window.location.replace('dashboard.html');
                    }, 100);
                },
                onFailure(err) {
                    setLoading('verify-btn', false);
                    console.error('❌ Auto sign-in failed:', err.message);
                    // Verified but auto-sign-in failed — redirect to sign-in page
                    showError('verify-error', 'Email verified! Please sign in with your credentials.');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                },
            });
        });
    } catch (e) {
        setLoading('verify-btn', false);
        console.error('❌ Error during verification:', e);
        showError('verify-error', 'An error occurred. Please try again.');
    }
}

// ── RESEND VERIFICATION CODE ───────────────────────────
function resendCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || sessionStorage.getItem('pendingEmail') || pendingEmail;
    
    if (!email) {
        console.error('❌ Email not found for resend');
        return;
    }
    
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
        Username: email,
        Pool: userPool,
    });
    
    cognitoUser.resendConfirmationCode((err) => {
        if (err) {
            showError('verify-error', err.message || 'Failed to resend code.');
            return;
        }
        
        console.log('✅ Verification code resent');
        
        const btn = document.getElementById('resend-btn');
        if (btn) {
            btn.textContent = 'Code resent ✓';
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = 'Resend code';
                btn.disabled = false;
            }, 3000);
        }
    });
}

// ── LOGOUT ────────────────────────────────────────────
function logout() {
    console.log('Logging out...');
    
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
        currentUser.signOut();
        console.log('✅ User signed out from Cognito');
    }
    
    clearSession();
    window.location.href = 'index.html';
}

// ── CHECK IF ALREADY LOGGED IN ────────────────────────
/**
 * Function to check existing session on page load
 * Prevents infinite redirect loops by only running once at startup
 */
function checkExistingSession() {
    console.log('🔍 Checking for existing session...');
    
    const showPage = () => {
        document.body.style.opacity = '1';
    };
    
    // Wait for Cognito SDK to be available (max 5 seconds with 20 retries)
    let retries = 0;
    const maxRetries = 20;
    
    const waitForSDK = () => {
        if (typeof AmazonCognitoIdentity !== 'undefined' && userPool) {
            // SDK loaded and pool initialized, proceed with session check
            checkSession();
        } else if (retries < maxRetries) {
            retries++;
            setTimeout(waitForSDK, 250);
        } else {
            console.warn('⚠️ Cognito SDK failed to load after timeout, showing page');
            showPage();
        }
    };
    
    function checkSession() {
        // Create pool if not already created
        if (typeof userPool === 'undefined' || !userPool) {
            console.log('ℹ️ User pool not initialized yet');
            showPage();
            return;
        }
    
    const currentUser = userPool.getCurrentUser();
    
    if (!currentUser) {
        console.log('ℹ️ No current user in Cognito SDK');
        showPage();
        return;
    }
    
    currentUser.getSession((err, session) => {
        if (err) {
            console.warn('⚠️ Session check error:', err.message);
            clearSession();
            showPage();
            return;
        }
        
        if (session && session.isValid()) {
            console.log('✅ Valid Cognito session found');
            const idToken = session.getIdToken().getJwtToken();
            const payload = session.getIdToken().decodePayload();
            
            storeSession(idToken, payload.sub);
            localStorage.setItem('userEmail', payload.email || 'user@example.com');
            
            // Only redirect if not already on dashboard
            const currentPage = window.location.pathname.toLowerCase();
            if (!currentPage.includes('dashboard.html') && 
                !currentPage.includes('view_resources.html') &&
                !currentPage.includes('add_resource.html') &&
                !currentPage.includes('profile.html')) {
                console.log('✅ Redirecting to dashboard...');
                window.location.replace('dashboard.html');
            } else {
                showPage();
            }
        } else {
            console.log('⚠️ Invalid or expired session');
            currentUser.signOut();
            clearSession();
            showPage();
        }
    });
    }
    
    waitForSDK();
}

// Call checkExistingSession when DOM is ready
document.addEventListener('DOMContentLoaded', checkExistingSession);

// ── SESSION VALIDATION FOR PROTECTED PAGES ───────────
/**
 * Call this on protected pages (dashboard, resources, etc.)
 * to ensure user is authenticated
 */
function validateSessionOrRedirect() {
    const token = getStoredToken();
    
    if (!token) {
        console.warn('⚠️ No session token found - redirecting to login');
        window.location.href = 'index.html';
        return false;
    }
    
    console.log('✅ Session token validated');
    return true;
}

/**
 * Alias for backward compatibility
 */
function requireAuth() {
    return validateSessionOrRedirect();
}

console.log('%c✅ AUTH script fully loaded and ready', 'color: #10b981; font-weight: bold;');