/**
 * Cloud Resource Tracker Authentication Handler (v6.0)
 * Direct Cognito API calls via fetch - NO external SDK dependency
 * Eliminates "SDK failed to load" timeout issues completely
 */

'use strict';

console.log('🚀 CLOUD RESOURCE TRACKER AUTH V6.0: Loaded');

// ──────────────────────────────────────────────────────
// CONFIG - COGNITO CREDENTIALS (UPDATED)
// ──────────────────────────────────────────────────────
const COGNITO_CONFIG = {
    userPoolId: 'ap-southeast-2_ZMufTlAjo',
    clientId: '6tkb0i2gbosk9j00f4ue3rq5ca',
    region: 'ap-southeast-2',
    cognitoDomain: 'ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com',
};

// ──────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────
function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.btn-spinner');
    btn.disabled = loading;
    if (text) text.classList.toggle('hidden', loading);
    if (spinner) spinner.classList.toggle('hidden', !loading);
}

function showError(elementId, msg) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = msg;
        el.classList.add('visible');
    }
}

function clearErrors() {
    document.querySelectorAll('.auth-error').forEach(e => {
        e.textContent = '';
        e.classList.remove('visible');
    });
}

function storeSession(idToken, userId, email = null) {
    localStorage.setItem('tasky_id_token', idToken);
    localStorage.setItem('tasky_user_id', userId);
    if (email) localStorage.setItem('userEmail', email);
}

function clearSession() {
    localStorage.removeItem('tasky_id_token');
    localStorage.removeItem('tasky_user_id');
    localStorage.removeItem('userEmail');
    sessionStorage.removeItem('pendingEmail');
    sessionStorage.removeItem('pendingPassword');
}

function getStoredToken() {
    return localStorage.getItem('tasky_id_token');
}

function getStoredUserId() {
    return localStorage.getItem('tasky_user_id');
}

// ──────────────────────────────────────────────────────
// JWT UTILITIES
// ──────────────────────────────────────────────────────
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('❌ Failed to parse JWT:', e);
        return null;
    }
}

function isTokenExpired(token) {
    const payload = parseJwt(token);
    if (!payload || !payload.exp) return true;
    return Math.floor(Date.now() / 1000) > payload.exp;
}

// ──────────────────────────────────────────────────────
// PASSWORD VISIBILITY TOGGLE
// ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Password eye buttons
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

    // Sign In Form
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
        signinForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login();
        });
    }

    // Sign Up Form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            signup();
        });
    }

    // Verify Form
    const verifyForm = document.getElementById('verify-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            verifyCode();
        });
    }

    // Resend Code Button
    const resendBtn = document.getElementById('resend-btn');
    if (resendBtn) {
        resendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            resendCode();
        });
    }

    // Check existing session on page load
    checkExistingSession();
});

// ──────────────────────────────────────────────────────
// LOGIN - USER_PASSWORD_AUTH FLOW
// ──────────────────────────────────────────────────────
async function login() {
    clearErrors();
    const email = document.getElementById('signin-email')?.value;
    const password = document.getElementById('signin-password')?.value;

    if (!email || !password) {
        showError('signin-error', 'Email and password required');
        return;
    }

    setLoading('signin-btn', true);

    try {
        const response = await fetch(
            `https://${COGNITO_CONFIG.cognitoDomain}/oauth2/token`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'password',
                    client_id: COGNITO_CONFIG.clientId,
                    username: email,
                    password: password,
                    scope: 'openid profile email',
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            setLoading('signin-btn', false);
            console.error('❌ Login error:', data);
            showError('signin-error', data.error_description || 'Login failed. Please check your credentials.');
            return;
        }

        // Success - store tokens
        console.log('✅ Login successful');
        const idToken = data.id_token;
        const payload = parseJwt(idToken);

        storeSession(idToken, payload.sub, payload.email);

        // Redirect to dashboard
        setTimeout(() => {
            window.location.replace('dashboard.html');
        }, 300);
    } catch (err) {
        setLoading('signin-btn', false);
        console.error('❌ Login error:', err);
        showError('signin-error', 'Network error. Please try again.');
    }
}

// ──────────────────────────────────────────────────────
// SIGN UP
// ──────────────────────────────────────────────────────
async function signup() {
    clearErrors();

    const firstName = document.getElementById('firstName')?.value.trim();
    const lastName = document.getElementById('lastName')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

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
        // Call backend Lambda function for sign-up
        const response = await fetch('https://cloud-resource-tracker.duckdns.org/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
                firstName,
                lastName,
                userPoolId: COGNITO_CONFIG.userPoolId,
                clientId: COGNITO_CONFIG.clientId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            setLoading('signup-btn', false);
            console.error('❌ Sign up error:', data);
            showError('signup-error', data.message || 'Sign up failed. Email may already exist.');
            return;
        }

        console.log('✅ Sign up successful, verify email to continue');

        // Store pending info
        sessionStorage.setItem('pendingEmail', email);
        sessionStorage.setItem('pendingPassword', password);

        // Redirect to verify page
        window.location.href = `verify.html?email=${encodeURIComponent(email)}`;
    } catch (err) {
        setLoading('signup-btn', false);
        console.error('❌ Sign up error:', err);
        showError('signup-error', 'Network error. Please try again.');
    }
}

// ──────────────────────────────────────────────────────
// VERIFY EMAIL CODE
// ──────────────────────────────────────────────────────
async function verifyCode() {
    clearErrors();

    const code = document.getElementById('verify-code')?.value.trim();
    if (!code) {
        showError('verify-error', 'Please enter the verification code.');
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || sessionStorage.getItem('pendingEmail');

    if (!email) {
        showError('verify-error', 'Email not found. Please sign up again.');
        return;
    }

    setLoading('verify-btn', true);

    try {
        // Call backend Lambda function for confirmation
        const response = await fetch('https://cloud-resource-tracker.duckdns.org/confirm-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                code,
                userPoolId: COGNITO_CONFIG.userPoolId,
                clientId: COGNITO_CONFIG.clientId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            setLoading('verify-btn', false);
            console.error('❌ Verification error:', data);
            showError('verify-error', data.message || 'Invalid code. Please try again.');
            return;
        }

        console.log('✅ Email verified successfully');

        // Auto sign-in after verification
        const password = sessionStorage.getItem('pendingPassword');
        if (password) {
            // Sign in with verified email
            const loginData = {
                email,
                password,
            };

            // Store credentials temporarily
            sessionStorage.setItem('_login_email', email);
            sessionStorage.setItem('_login_password', password);

            // Auto-trigger login
            setTimeout(() => {
                autoLogin(email, password);
            }, 500);
        } else {
            showError('verify-error', 'Email verified! Please sign in with your credentials.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    } catch (err) {
        setLoading('verify-btn', false);
        console.error('❌ Verification error:', err);
        showError('verify-error', 'Network error. Please try again.');
    }
}

// ──────────────────────────────────────────────────────
// AUTO-LOGIN AFTER VERIFICATION
// ──────────────────────────────────────────────────────
async function autoLogin(email, password) {
    try {
        const response = await fetch(
            `https://${COGNITO_CONFIG.cognitoDomain}/oauth2/token`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'password',
                    client_id: COGNITO_CONFIG.clientId,
                    username: email,
                    password: password,
                    scope: 'openid profile email',
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.warn('⚠️ Auto sign-in failed after verification');
            showError('verify-error', 'Email verified! Please sign in with your credentials.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }

        console.log('✅ Auto sign-in successful after verification');
        const idToken = data.id_token;
        const payload = parseJwt(idToken);

        storeSession(idToken, payload.sub, payload.email);
        clearSession(); // Clear pending info

        setTimeout(() => {
            window.location.replace('dashboard.html');
        }, 300);
    } catch (err) {
        console.error('❌ Auto sign-in error:', err);
        showError('verify-error', 'Email verified! Please sign in manually.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
}

// ──────────────────────────────────────────────────────
// RESEND VERIFICATION CODE
// ──────────────────────────────────────────────────────
async function resendCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email') || sessionStorage.getItem('pendingEmail');

    if (!email) {
        console.error('❌ Email not found for resend');
        return;
    }

    try {
        const response = await fetch('https://cloud-resource-tracker.duckdns.org/resend-confirmation-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                userPoolId: COGNITO_CONFIG.userPoolId,
                clientId: COGNITO_CONFIG.clientId,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Resend error:', data);
            showError('verify-error', data.message || 'Failed to resend code.');
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
    } catch (err) {
        console.error('❌ Resend error:', err);
        showError('verify-error', 'Network error. Please try again.');
    }
}

// ──────────────────────────────────────────────────────
// LOGOUT
// ──────────────────────────────────────────────────────
function logout() {
    console.log('Logging out...');
    clearSession();
    window.location.href = 'index.html';
}

// ──────────────────────────────────────────────────────
// CHECK EXISTING SESSION ON PAGE LOAD
// ──────────────────────────────────────────────────────
function checkExistingSession() {
    console.log('🔍 Checking for existing session...');

    const showPage = () => {
        document.body.style.opacity = '1';
    };

    const token = getStoredToken();

    // No token stored
    if (!token) {
        console.log('ℹ️ No session token found');
        showPage();
        return;
    }

    // Token exists but is expired
    if (isTokenExpired(token)) {
        console.log('⚠️ Session token expired');
        clearSession();
        showPage();
        return;
    }

    // Token is valid
    console.log('✅ Valid session found');
    const payload = parseJwt(token);
    const userEmail = payload?.email;

    if (userEmail) {
        localStorage.setItem('userEmail', userEmail);
    }

    // Only redirect if not already on a protected page
    const currentPage = window.location.pathname.toLowerCase();
    const isAuthPage = currentPage.includes('index.html') || 
                       currentPage.includes('signup.html') ||
                       currentPage.includes('verify.html') ||
                       currentPage === '/';

    if (isAuthPage) {
        // User has valid session, redirect to dashboard
        console.log('✅ Redirecting to dashboard...');
        window.location.replace('dashboard.html');
    } else {
        // Already on protected page, just show page
        showPage();
    }
}

// ──────────────────────────────────────────────────────
// SESSION VALIDATION FOR PROTECTED PAGES
// ──────────────────────────────────────────────────────
function validateSessionOrRedirect() {
    const token = getStoredToken();

    if (!token) {
        console.warn('⚠️ No session token found - redirecting to login');
        window.location.href = 'index.html';
        return false;
    }

    if (isTokenExpired(token)) {
        console.warn('⚠️ Session token expired - redirecting to login');
        clearSession();
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