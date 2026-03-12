// ===== Cognito Configuration =====
const COGNITO_DOMAIN = "https://ap-southeast-2os7g4ap3m.auth.ap-southeast-2.amazoncognito.com";
const CLIENT_ID = "6s2hctvj6iovhn8i34hahohsmh";
const REDIRECT_URI = "https://frontend.d1v2anpquopal6.amplifyapp.com/index.html";
const LOGOUT_URI = "https://frontend.d1v2anpquopal6.amplifyapp.com/index.html";

// NOTE: New Cognito Managed Login only supports response_type=code (Authorization Code flow).
// Implicit flow (id_token) is deprecated and not supported.

function login() {
    const state = generateNonce(); // Use state as CSRF protection
    sessionStorage.setItem("oauth_state", state);

    const url = new URL(`${COGNITO_DOMAIN}/oauth2/authorize`);
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", REDIRECT_URI);

    console.log("LOGIN REDIRECT:", url.toString());
    window.location.assign(url.toString());
}

function signup() {
    const state = generateNonce();
    sessionStorage.setItem("oauth_state", state);

    const url = new URL(`${COGNITO_DOMAIN}/oauth2/authorize`);
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("screen_hint", "signup");

    console.log("SIGNUP REDIRECT:", url.toString());
    window.location.assign(url.toString());
}

function generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Exchange the authorization code for tokens via /oauth2/token
async function exchangeCodeForTokens(code) {
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("client_id", CLIENT_ID);
    body.set("code", code);
    body.set("redirect_uri", REDIRECT_URI);

    try {
        const response = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString()
        });

        const data = await response.json();
        console.log("Token response:", data);

        if (data.id_token) {
            localStorage.setItem("idToken", data.id_token);
            if (data.access_token) localStorage.setItem("accessToken", data.access_token);
            if (data.refresh_token) localStorage.setItem("refreshToken", data.refresh_token);
            console.log("✓ Tokens stored successfully.");
            return true;
        } else {
            console.error("Token exchange failed:", data);
            return false;
        }
    } catch (err) {
        console.error("Token exchange error:", err);
        return false;
    }
}

async function handleAuth() {
    console.log("handleAuth URL:", window.location.href);

    // Check query params for ?code= returned by Authorization Code flow
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
        console.error("OAuth error:", error, params.get("error_description"));
        return;
    }

    if (code) {
        console.log("Auth code received, exchanging for tokens...");

        // Validate state to prevent CSRF
        const storedState = sessionStorage.getItem("oauth_state");
        if (storedState && state !== storedState) {
            console.error("State mismatch! Possible CSRF attack.");
            return;
        }

        sessionStorage.removeItem("oauth_state");

        // Clean URL
        window.history.replaceState({}, document.title, "/index.html");

        const success = await exchangeCodeForTokens(code);
        if (success) {
            setTimeout(() => { window.location.href = "/dashboard.html"; }, 100);
        }
    } else {
        console.log("No auth code in URL.");
    }
}

function getToken() {
    return localStorage.getItem("idToken");
}

function logout() {
    localStorage.removeItem("idToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    sessionStorage.removeItem("oauth_state");

    const url = new URL(`${COGNITO_DOMAIN}/logout`);
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("logout_uri", LOGOUT_URI);

    console.log("LOGOUT REDIRECT:", url.toString());
    window.location.href = url.toString();
}

function requireAuth() {
    const token = localStorage.getItem("idToken");
    if (!token) {
        console.log("Not authenticated, redirecting to login");
        window.location.href = "/index.html";
    }
}

function isAuthenticated() {
    return !!localStorage.getItem("idToken");
}