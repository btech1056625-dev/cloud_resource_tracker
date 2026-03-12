// ===== Cognito Configuration =====
const COGNITO_DOMAIN = "https://ap-southeast-2os7g4ap3m.auth.ap-southeast-2.amazoncognito.com";
const CLIENT_ID = "6s2hctvj6iovhn8i34hahohsmh";
const REDIRECT_URI = "https://frontend.d1v2anpquopal6.amplifyapp.com/index.html";
const LOGOUT_URI = "https://frontend.d1v2anpquopal6.amplifyapp.com/index.html";
function login() {
    // Generate nonce for security
    const nonce = generateNonce();
    sessionStorage.setItem("nonce", nonce);

    const loginUrl = new URL(`${COGNITO_DOMAIN}/login`);
    loginUrl.searchParams.set("client_id", CLIENT_ID);
    loginUrl.searchParams.set("response_type", "id_token");
    loginUrl.searchParams.set("scope", "email openid profile");
    loginUrl.searchParams.set("nonce", nonce);
    loginUrl.searchParams.set("redirect_uri", REDIRECT_URI);

    console.log("LOGIN REDIRECT:", loginUrl.toString());
    window.location.assign(loginUrl.toString());
}

function signup() {
    // Generate nonce for security
    const nonce = generateNonce();
    sessionStorage.setItem("nonce", nonce);

    const signupUrl = new URL(`${COGNITO_DOMAIN}/signup`);
    signupUrl.searchParams.set("client_id", CLIENT_ID);
    signupUrl.searchParams.set("response_type", "id_token");
    signupUrl.searchParams.set("scope", "email openid profile");
    signupUrl.searchParams.set("nonce", nonce);
    signupUrl.searchParams.set("redirect_uri", REDIRECT_URI);

    console.log("SIGNUP REDIRECT:", signupUrl.toString());
    window.location.assign(signupUrl.toString());
}

function generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function handleAuth() {
    console.log("handleAuth URL:", window.location.href);

    // Check both hash and search (sometimes Cognito behaves differently)
    const hash = window.location.hash.substring(1);
    const search = window.location.search.substring(1);
    
    const params = new URLSearchParams(hash || search);
    let idToken = params.get("id_token");
        const state = params.get("state");

        console.log("Extracted id_token:", idToken ? "Token found" : "No token found");
        console.log("State:", state);

        if (idToken) {
            // Validate token format (JWT has 3 parts separated by dots)
            if (!idToken.includes(".")) {
                console.error("Invalid token format: Missing dots in JWT");
                return;
            }

            try {
                // Verify nonce
                const payload = JSON.parse(atob(idToken.split(".")[1]));
                const storedNonce = sessionStorage.getItem("nonce");

                console.log("Token payload nonce:", payload.nonce);
                console.log("Stored nonce:", storedNonce);

                if (storedNonce && payload.nonce !== storedNonce) {
                    console.error("Nonce mismatch - possible attack");
                    return;
                }

                localStorage.setItem("idToken", idToken);
                console.log("✓ Token stored successfully in localStorage");
                console.log("Token expires at:", new Date(payload.exp * 1000).toLocaleString());

                // Clean up
                sessionStorage.removeItem("nonce");

                // Clean up the URL without reloading
                window.history.replaceState({}, document.title, "/index.html");

                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = "/dashboard.html";
                }, 100);
                return;
            } catch (e) {
                console.error("Error validating token:", e);
                return;
            }
        }
    }

    console.log("No id_token found in URL hash");
}

function getToken() {
    const token = localStorage.getItem("idToken");
    console.log("getToken called - Token exists:", !!token);
    return token;
}

function logout() {
    console.log("Logging out...");
    localStorage.removeItem("idToken");

    const logoutUrl =
        `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}` +
        `&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;

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