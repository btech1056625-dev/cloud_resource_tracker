/**
 * Minimal Cognito Authentication using native fetch (no SDK required)
 * Works around CSP restrictions by using direct API calls
 */

'use strict';

const COGNITO_CONFIG = {
    userPoolId: 'ap-southeast-2_ZMufTlAjo',
    clientId: '6tkb0i2gbosk9j00f4ue3rq5ca',
    region: 'ap-southeast-2',
    authDomain: 'ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com',
    cognitoIdpEndpoint: 'https://cognito-idp.ap-southeast-2.amazonaws.com/'
};

console.log('✅ Cognito Auth (native fetch) loaded');

/**
 * Store session tokens
 */
function storeSession(idToken, accessToken, refreshToken, userId) {
    localStorage.setItem('idToken', idToken);
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userId', userId);
    console.log('✅ Session stored');
}

/**
 * Get stored ID token
 */
function getStoredToken() {
    return localStorage.getItem('idToken');
}

/**
 * Check if authenticated
 */
function isAuthenticated() {
    return !!getStoredToken();
}

/**
 * Clear session
 */
function clearSession() {
    localStorage.removeItem('idToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    console.log('✅ Session cleared');
}

/**
 * Sign up (InitiateAuth with USER_PASSWORD_AUTH)
 */
async function signUp(email, password, firstName, lastName) {
    try {
        // Use AdminCreateUser or SignUp via Cognito
        const response = await fetch(COGNITO_CONFIG.cognitoIdpEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                Username: email,
                Password: password,
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'given_name', Value: firstName },
                    { Name: 'family_name', Value: lastName }
                ]
            })
        });

        const data = await response.json();
        
        if (data.UserSub) {
            console.log('✅ User registered, confirm email required');
            return { success: true, userSub: data.UserSub };
        } else {
            console.error('❌ Signup failed:', data);
            return { success: false, error: data.message || 'Signup failed' };
        }
    } catch (err) {
        console.error('❌ Signup error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Confirm signup (verify email)
 */
async function confirmSignUp(email, code) {
    try {
        const response = await fetch(COGNITO_CONFIG.cognitoIdpEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                Username: email,
                ConfirmationCode: code
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Email confirmed');
            return { success: true };
        } else {
            console.error('❌ Confirmation failed:', data);
            return { success: false, error: data.message || 'Confirmation failed' };
        }
    } catch (err) {
        console.error('❌ Confirm error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Sign in with email/password
 */
async function signIn(email, password) {
    try {
        const response = await fetch(COGNITO_CONFIG.cognitoIdpEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
            },
            body: JSON.stringify({
                ClientId: COGNITO_CONFIG.clientId,
                AuthFlow: 'USER_PASSWORD_AUTH',
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password
                }
            })
        });

        const data = await response.json();

        if (data.AuthenticationResult) {
            const tokens = data.AuthenticationResult;
            const payload = JSON.parse(atob(tokens.IdToken.split('.')[1]));
            
            storeSession(tokens.IdToken, tokens.AccessToken, tokens.RefreshToken, payload.sub);
            localStorage.setItem('userEmail', payload.email);
            
            console.log('✅ Sign in successful');
            return { success: true, tokens };
        } else if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            console.log('⚠️ New password required');
            return { success: false, error: 'New password required', challengeName: 'NEW_PASSWORD_REQUIRED' };
        } else {
            console.error('❌ Sign in failed:', data);
            return { success: false, error: data.message || 'Invalid credentials' };
        }
    } catch (err) {
        console.error('❌ Sign in error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Check if user has valid session
 */
async function checkSession() {
    const token = getStoredToken();
    if (!token) return false;

    try {
        // Decode and check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        
        if (isExpired) {
            clearSession();
            return false;
        }
        return true;
    } catch (err) {
        clearSession();
        return false;
    }
}

// Expose globally
window.CognitoAuth = {
    signUp,
    confirmSignUp,
    signIn,
    checkSession,
    getStoredToken,
    isAuthenticated,
    clearSession,
    storeSession
};
