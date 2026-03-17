// ===== Cognito Configuration =====
// Fixed domain format: https://cognito-idp.REGION.amazonaws.com/USERPOOLID
const COGNITO_DOMAIN = "https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com";
const CLIENT_ID = "6tkb0i2gbosk9j00f4ue3rq5ca";
const REGION = "ap-southeast-2";
const USER_POOL_ID = "ap-southeast-2_ZMufTlAjo";

// Dynamically determine redirect URI based on current environment
const getRedirectUri = () => {
    const origin = window.location.origin;
    // For Amplify hosting, use the origin path directly (e.g., https://frontend.d1v2anpquopal6.amplifyapp.com/)
    // Cognito callback URL must match exactly what's registered in the app client settings
    return origin.endsWith('/') ? origin : `${origin}/`;
};

const LOGOUT_URI = getRedirectUri();

function login() {
    // Generate nonce and state for security
    const nonce = generateNonce();
    const state = generateNonce(); // Using same generator for state
    sessionStorage.setItem("nonce", nonce);
    sessionStorage.setItem("state", state);

    const redirectUri = getRedirectUri();
    const loginUrl =
        `${COGNITO_DOMAIN}/oauth2/authorize?client_id=${CLIENT_ID}` +
        `&response_type=id_token` +
        `&scope=email+openid+profile` +
        `&nonce=${nonce}` +
        `&state=${state}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log("Redirecting to Cognito via /oauth2/authorize with nonce:", nonce);
    window.location.href = loginUrl;
}

function signup() {
    // Generate nonce and state for security
    const nonce = generateNonce();
    const state = generateNonce();
    sessionStorage.setItem("nonce", nonce);
    sessionStorage.setItem("state", state);

    const redirectUri = getRedirectUri();
    const signupUrl =
        `${COGNITO_DOMAIN}/signup?client_id=${CLIENT_ID}` +
        `&response_type=id_token` +
        `&scope=email+openid+profile` +
        `&nonce=${nonce}` +
        `&state=${state}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log("Redirecting to Cognito signup with nonce:", nonce);
    window.location.href = signupUrl;
}

function generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function handleAuth() {
    console.log("=== handleAuth function invoked ===");
    console.log("Current URL:", window.location.href);
    console.log("Hash:", window.location.hash);
    console.log("Search:", window.location.search);

    // Try to extract token from hash
    const hash = window.location.hash;
    let idToken = null;

    if (hash) {
        // Remove the leading '#' and split by '&'
        const hashParams = hash.substring(1);
        console.log("Hash params string:", hashParams);

        // Parse the hash parameters
        const params = new URLSearchParams(hashParams);
        idToken = params.get("id_token");
        const state = params.get("state");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        // Handle Cognito error responses
        if (error) {
            console.error("❌ Cognito authorization error:", error);
            console.error("Error description:", errorDescription);
            alert(`Login failed: ${error} - ${errorDescription}`);
            window.history.replaceState({}, document.title, "/index.html");
            return;
        }

        console.log("Extracted id_token:", idToken ? "✓ Token found" : "✗ No token found");
        console.log("State from URL:", state);

        if (idToken) {
            console.log("Processing ID token...");
            
            // Validate token format (JWT has 3 parts separated by dots)
            if (!idToken.includes(".")) {
                console.error("❌ Invalid token format: Missing dots in JWT");
                alert("Invalid token received from Cognito");
                return;
            }

            try {
                // Split JWT and decode payload
                const tokenParts = idToken.split(".");
                const payload = JSON.parse(atob(tokenParts[1]));
                
                console.log("Token payload:", {
                    email: payload.email,
                    nonce: payload.nonce,
                    aud: payload.aud,
                    iss: payload.iss,
                    exp: new Date(payload.exp * 1000).toLocaleString()
                });

                const storedNonce = sessionStorage.getItem("nonce");
                const storedState = sessionStorage.getItem("state");

                console.log("Verification:");
                console.log("  Stored nonce:", storedNonce);
                console.log("  Token nonce:", payload.nonce);
                console.log("  Stored state:", storedState);
                console.log("  URL state:", state);

                // Verify nonce - critical for security
                if (storedNonce && payload.nonce !== storedNonce) {
                    console.error("❌ Nonce mismatch - possible CSRF/replay attack");
                    alert("Security check failed: Nonce mismatch");
                    sessionStorage.clear();
                    return;
                }
                
                // Verify state for CSRF protection
                if (storedState && state !== storedState) {
                    console.error("❌ State mismatch - possible CSRF attack");
                    alert("Security check failed: State mismatch");
                    sessionStorage.clear();
                    return;
                }

                // Check token expiration
                if (payload.exp * 1000 < Date.now()) {
                    console.error("❌ Token has expired");
                    alert("Token has expired. Please log in again.");
                    return;
                }

                // Store token securely
                localStorage.setItem("idToken", idToken);
                localStorage.setItem("tokenExpiry", payload.exp);
                localStorage.setItem("userEmail", payload.email);
                
                console.log("✅ Token stored successfully in localStorage");
                console.log("Token expires at:", new Date(payload.exp * 1000).toLocaleString());

                // Clean up sensitive session data
                sessionStorage.removeItem("nonce");
                sessionStorage.removeItem("state");

                // Clean up the URL without reloading to remove token from browser history
                window.history.replaceState({}, document.title, "/index.html");

                console.log("✅ Authentication successful! Redirecting to dashboard...");
                
                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = "/dashboard.html";
                }, 200);
                return;
                
            } catch (e) {
                console.error("❌ Error processing token:", e);
                console.error("Stack:", e.stack);
                alert("Failed to process authentication token: " + e.message);
                sessionStorage.clear();
                return;
            }
        }
    }

    console.log("ℹ️  No id_token found in URL hash - user may not be returning from login");
    return false;
}

function getToken() {
    const token = localStorage.getItem("idToken");
    console.log("getToken called - Token exists:", !!token);
    return token;
}

function logout() {
    console.log("Logging out...");
    localStorage.removeItem("idToken");

    const redirectUri = getRedirectUri();
    const logoutUrl =
        `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}` +
        `&logout_uri=${encodeURIComponent(redirectUri)}`;

    console.log("Redirecting to Cognito logout:", logoutUrl);
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