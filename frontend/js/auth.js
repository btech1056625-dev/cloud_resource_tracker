// ===== Cognito Configuration =====
const COGNITO_DOMAIN = "https://ap-southeast-2os7g4ap3m.auth.ap-southeast-2.amazoncognito.com";
const CLIENT_ID = "6s2hctvj6iovhn8i34hahohsmh";
const REDIRECT_URI = "https://frontend.d1v2anpquopal6.amplifyapp.com/index.html";
const LOGOUT_URI = "https://frontend.d1v2anpquopal6.amplifyapp.com/index.html";

// NOTE: This Cognito domain uses the NEW Cognito Managed Login.
// The new managed login ONLY supports the /oauth2/authorize endpoint.
// The old /login and /signup paths do NOT exist in this version.

function login() {
    const nonce = generateNonce();
    sessionStorage.setItem("nonce", nonce);

    const url = new URL(`${COGNITO_DOMAIN}/oauth2/authorize`);
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("response_type", "id_token");
    url.searchParams.set("scope", "email openid profile");
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("redirect_uri", REDIRECT_URI);

    console.log("LOGIN REDIRECT:", url.toString());
    window.location.assign(url.toString());
}

function signup() {
    const nonce = generateNonce();
    sessionStorage.setItem("nonce", nonce);

    // New Cognito Managed Login: signup is the same endpoint with screen_hint=signup
    const url = new URL(`${COGNITO_DOMAIN}/oauth2/authorize`);
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("response_type", "id_token");
    url.searchParams.set("scope", "email openid profile");
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("redirect_uri", REDIRECT_URI);
    url.searchParams.set("screen_hint", "signup");

    console.log("SIGNUP REDIRECT:", url.toString());
    window.location.assign(url.toString());
}

function generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function handleAuth() {
    console.log("handleAuth URL:", window.location.href);

    // Check both hash and search (Cognito may return tokens in either location)
    const hash = window.location.hash.substring(1);
    const search = window.location.search.substring(1);

    const params = new URLSearchParams(hash || search);
    const idToken = params.get("id_token");
    const state = params.get("state");

    console.log("id_token found:", !!idToken);
    console.log("state:", state);

    if (idToken) {
        if (!idToken.includes(".")) {
            console.error("Invalid token format");
            return;
        }

        try {
            const payload = JSON.parse(atob(idToken.split(".")[1]));
            const storedNonce = sessionStorage.getItem("nonce");

            console.log("Token nonce:", payload.nonce);
            console.log("Stored nonce:", storedNonce);

            if (storedNonce && payload.nonce !== storedNonce) {
                console.error("Nonce mismatch - possible CSRF attack");
                return;
            }

            localStorage.setItem("idToken", idToken);
            console.log("✓ Token stored. Expires:", new Date(payload.exp * 1000).toLocaleString());

            sessionStorage.removeItem("nonce");
            window.history.replaceState({}, document.title, "/index.html");

            setTimeout(() => {
                window.location.href = "/dashboard.html";
            }, 100);
        } catch (e) {
            console.error("Error parsing token:", e);
        }
    } else {
        console.log("No id_token found in URL");
    }
}

function getToken() {
    return localStorage.getItem("idToken");
}

function logout() {
    localStorage.removeItem("idToken");

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