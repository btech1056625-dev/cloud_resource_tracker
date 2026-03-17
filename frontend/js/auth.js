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
    // Use Cognito via OAuth2 /authorize endpoint
    const redirectUri = getRedirectUri();
    const loginUrl = 
        `${COGNITO_DOMAIN}/oauth2/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=code&` +
        `scope=openid+email+profile&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log("Redirecting to Cognito OAuth2 Authorize endpoint");
    console.log("Login URL:", loginUrl);
    window.location.href = loginUrl;
}

function signup() {
    // Use Cognito via OAuth2 /authorize endpoint (same as login, Cognito handles signup)
    const redirectUri = getRedirectUri();
    const signupUrl = 
        `${COGNITO_DOMAIN}/oauth2/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=code&` +
        `scope=openid+email+profile&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log("Redirecting to Cognito OAuth2 Authorize endpoint (signup)");
    window.location.href = signupUrl;
}

function handleAuth() {
    console.log("=== handleAuth function invoked ===");
    console.log("Current URL:", window.location.href);
    console.log("Search params:", window.location.search);

    // Check for authorization code in URL parameters (from Cognito hosted UI)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");

    // Handle Cognito error responses
    if (error) {
        console.error("❌ Cognito authorization error:", error);
        console.error("Error description:", errorDescription);
        alert(`Login failed: ${error} - ${errorDescription}`);
        window.history.replaceState({}, document.title, "/index.html");
        return;
    }

    if (code) {
        console.log("✅ Authorization code received from Cognito");
        console.log("Code:", code.substring(0, 20) + "...");
        
        // Save the code for backend exchange
        sessionStorage.setItem("authCode", code);
        
        // In a real app, you would exchange this code on your backend for tokens
        // For now, set a mock token to allow testing
        const mockToken = "mock_id_token_" + Math.random().toString(36).substring(7);
        localStorage.setItem("idToken", mockToken);
        localStorage.setItem("userEmail", "user@example.com");
        
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

    console.log("ℹ️  No authorization code found in URL");
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