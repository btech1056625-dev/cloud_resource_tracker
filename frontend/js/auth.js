// ===== Cognito Configuration =====
// Fixed domain format: https://cognito-idp.REGION.amazonaws.com/USERPOOLID
const COGNITO_DOMAIN = "https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com";
const CLIENT_ID = "6tkb0i2gbosk9j00f4ue3rq5ca";
const REGION = "ap-southeast-2";
const USER_POOL_ID = "ap-southeast-2_ZMufTlAjo";

// Dynamically determine redirect URI based on current environment
const getRedirectUri = () => {
    const origin = window.location.origin;
    // Must match the callback URL registered in Cognito App Client settings
    // Cognito expects: https://frontend.d1v2anpquopal6.amplifyapp.com/index.html
    return `${origin}/index.html`;
};

// Generate random nonce for OAuth2 security (prevents token replay attacks)
// Required by AWS Cognito for implicit grant flow with id_token response type
const generateNonce = () => {
    const length = 32;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < length; i++) {
        nonce += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return nonce;
};

// Generate random state parameter for CSRF protection
// Required by AWS Cognito for OAuth2 security
const generateState = () => {
    const length = 32;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let state = '';
    for (let i = 0; i < length; i++) {
        state += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return state;
};

function login() {
    // Use Cognito OAuth2 /authorize endpoint with implicit grant (id_token response)
    const redirectUri = getRedirectUri();
    const nonce = generateNonce();
    const state = generateState();
    
    // Store nonce and state in sessionStorage for verification when token is returned
    sessionStorage.setItem("oauth_nonce", nonce);
    sessionStorage.setItem("oauth_state", state);
    
    // DEBUG: Log redirect URI configuration
    console.log("=== LOGIN DEBUG INFO ===");
    console.log("Current Origin:", window.location.origin);
    console.log("Redirect URI being sent:", redirectUri);
    console.log("Client ID:", CLIENT_ID);
    console.log("Cognito Domain:", COGNITO_DOMAIN);
    console.log("Nonce (for replay attack prevention):", nonce);
    console.log("State (for CSRF protection):", state);
    
    const loginUrl = 
        `${COGNITO_DOMAIN}/oauth2/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=id_token&` +
        `scope=openid+email+profile&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `nonce=${encodeURIComponent(nonce)}&` +
        `state=${encodeURIComponent(state)}&` +
        `response_mode=fragment`;
    
    console.log("%c📍 IMPORTANT: Copy this redirect_uri and verify it's in Cognito's 'Allowed Callback URLs':", "color: red; font-weight: bold;");
    console.log("%c" + redirectUri, "color: orange; font-weight: bold; font-size: 12px;");
    console.log("Full Login URL:", loginUrl);
    
    window.location.href = loginUrl;
}

function signup() {
    const redirectUri = getRedirectUri();
    const nonce = generateNonce();
    const state = generateState();
    
    sessionStorage.setItem("oauth_nonce", nonce);
    sessionStorage.setItem("oauth_state", state);
    
    // DEBUG: Log redirect URI configuration
    console.log("=== SIGNUP DEBUG INFO ===");
    console.log("Current Origin:", window.location.origin);
    console.log("Redirect URI being sent:", redirectUri);
    console.log("Client ID:", CLIENT_ID);
    
    const signupUrl = 
        `${COGNITO_DOMAIN}/oauth2/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=id_token&` +
        `scope=openid+email+profile&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `nonce=${encodeURIComponent(nonce)}&` +
        `state=${encodeURIComponent(state)}&` +
        `response_mode=fragment`;
    
    console.log("%c📍 IMPORTANT: Copy this redirect_uri and verify it's in Cognito's 'Allowed Callback URLs':", "color: red; font-weight: bold;");
    console.log("%c" + redirectUri, "color: orange; font-weight: bold; font-size: 12px;");
    
    window.location.href = signupUrl;
}

function handleAuth() {
    console.log("=== handleAuth function invoked ===");
    console.log("Current URL:", window.location.href);
    console.log("Hash:", window.location.hash);
    console.log("Search:", window.location.search);

    // Check for id_token in URL hash (from Cognito implicit grant)
    const hash = window.location.hash;
    
    if (hash) {
        // Remove the leading '#' and parse hash parameters
        const hashParams = hash.substring(1);
        const params = new URLSearchParams(hashParams);
        
        const idToken = params.get("id_token");
        const state = params.get("state");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        // Handle Cognito error responses
        if (error) {
            console.error("❌ Cognito authorization error:", error);
            console.error("Error description:", errorDescription);
            alert(`Login failed: ${error} - ${errorDescription}`);
            window.history.replaceState({}, document.title, "/index.html");
            sessionStorage.removeItem("oauth_nonce");
            sessionStorage.removeItem("oauth_state");
            return;
        }
        
        // SECURITY: Validate state parameter (CSRF protection)
        if (state) {
            const storedState = sessionStorage.getItem("oauth_state");
            if (!storedState || state !== storedState) {
                console.error("❌ State mismatch - possible CSRF attack");
                console.error("Expected state:", storedState);
                console.error("Returned state:", state);
                alert("Security validation failed: State mismatch. Please log in again.");
                window.history.replaceState({}, document.title, "/index.html");
                sessionStorage.removeItem("oauth_nonce");
                sessionStorage.removeItem("oauth_state");
                return;
            }
        }

        if (idToken) {
            console.log("✅ ID token received from Cognito");
            
            // Decode and validate token
            try {
                const tokenParts = idToken.split(".");
                if (tokenParts.length !== 3) {
                    throw new Error("Invalid token format (must have 3 parts)");
                }
                
                const payload = JSON.parse(atob(tokenParts[1]));
                
                // Log token claims for debugging
                console.log("Token payload:", {
                    email: payload.email,
                    nonce: payload.nonce,
                    aud: payload.aud,
                    iss: payload.iss,
                    exp: new Date(payload.exp * 1000).toLocaleString()
                });
                
                // SECURITY: Validate token expiration
                if (payload.exp * 1000 < Date.now()) {
                    console.error("❌ Token has expired");
                    alert("Token has expired. Please log in again.");
                    window.history.replaceState({}, document.title, "/index.html");
                    return;
                }
                
                // SECURITY: Validate nonce (CSRF protection)
                const storedNonce = sessionStorage.getItem("oauth_nonce");
                if (!storedNonce || payload.nonce !== storedNonce) {
                    console.error("❌ Nonce mismatch - possible attack");
                    console.error("Expected nonce:", storedNonce);
                    console.error("Token nonce:", payload.nonce);
                    alert("Security validation failed: Nonce mismatch. Please log in again.");
                    window.history.replaceState({}, document.title, "/index.html");
                    sessionStorage.removeItem("oauth_nonce");
                    sessionStorage.removeItem("oauth_state");
                    return;
                }
                
                // SECURITY: Validate audience (client_id)
                if (payload.aud !== CLIENT_ID) {
                    console.error("❌ Audience mismatch");
                    alert("Security validation failed: Invalid audience. Please log in again.");
                    window.history.replaceState({}, document.title, "/index.html");
                    return;
                }
                
                // Store the token and user data
                localStorage.setItem("idToken", idToken);
                localStorage.setItem("userEmail", payload.email || "user@example.com");
                localStorage.setItem("tokenExpiry", payload.exp * 1000);
                
                // Clean up session storage
                sessionStorage.removeItem("oauth_nonce");
                sessionStorage.removeItem("oauth_state");
                
                // Clean up URL without reloading
                window.history.replaceState({}, document.title, "/index.html");
                
                // Redirect to dashboard
                console.log("✅ Authentication successful! Redirecting to dashboard...");
                alert("Login successful!");
                setTimeout(() => {
                    window.location.href = "/dashboard.html";
                }, 500);
                return;
                
            } catch (e) {
                console.error("❌ Error processing token:", e);
                alert("Error processing authentication. Please log in again.");
                window.history.replaceState({}, document.title, "/index.html");
                return;
            }
        }
    }

    console.log("ℹ️  No ID token found in URL hash");
}

function getToken() {
    const token = localStorage.getItem("idToken");
    console.log("getToken called - Token exists:", !!token);
    return token;
}

function logout() {
    console.log("Logging out...");
    localStorage.removeItem("idToken");
    localStorage.removeItem("userEmail");
    sessionStorage.removeItem("authCode");

    const redirectUri = getRedirectUri();
    const logoutUrl =
        `${COGNITO_DOMAIN}/logout?` +
        `client_id=${CLIENT_ID}&` +
        `logout_uri=${encodeURIComponent(redirectUri)}`;

    console.log("Redirecting to Cognito logout");
    window.location.href = logoutUrl;
}

function requireAuth() {
    const token = localStorage.getItem("idToken");
    console.log("requireAuth called - Token found:", !!token);

    if (!token) {
        console.log("No token found, redirecting to login page");
        window.location.href = "/index.html";
    } else {
        console.log("User is authenticated");
    }
}

function isAuthenticated() {
    return !!localStorage.getItem("idToken");
}