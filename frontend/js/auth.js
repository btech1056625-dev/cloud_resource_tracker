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

function login() {
    // Use Cognito OAuth2 /authorize endpoint with implicit grant (id_token response)
    const redirectUri = getRedirectUri();
    const loginUrl = 
        `${COGNITO_DOMAIN}/oauth2/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=id_token&` +
        `scope=openid+email+profile&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log("Redirecting to Cognito OAuth2 Authorize endpoint");
    console.log("Login URL:", loginUrl);
    window.location.href = loginUrl;
}

function signup() {
    // Use Cognito via OAuth2 /authorize endpoint with implicit grant
    const redirectUri = getRedirectUri();
    const signupUrl = 
        `${COGNITO_DOMAIN}/oauth2/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=id_token&` +
        `scope=openid+email+profile&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log("Redirecting to Cognito OAuth2 Authorize endpoint (signup)");
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

        if (idToken) {
            console.log("✅ ID token received from Cognito");
            
            // Store the token
            localStorage.setItem("idToken", idToken);
            
            // Try to decode and extract email from token
            try {
                const tokenParts = idToken.split(".");
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    localStorage.setItem("userEmail", payload.email || "user@example.com");
                }
            } catch (e) {
                console.log("Could not decode token payload:", e);
                localStorage.setItem("userEmail", "user@example.com");
            }
            
            // Clean up URL without reloading
            window.history.replaceState({}, document.title, "/index.html");
            
            // Redirect to dashboard
            console.log("✅ Authentication successful! Redirecting to dashboard...");
            alert("Login successful!");
            setTimeout(() => {
                window.location.href = "/dashboard.html";
            }, 500);
            return;
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