// ===== Cognito Configuration =====
const COGNITO_DOMAIN = "https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com";
const CLIENT_ID = "132pgtcdjm1eiaq26m426cfbo1";
const REDIRECT_URI = "https://frontend.d1v2anpquopal6.amplifyapp.com/index.html";
const LOGOUT_URI = "https://frontend.d1v2anpquopal6.amplifyapp.com/index.html";

function login() {
    // Generate nonce for security
    const nonce = generateNonce();
    sessionStorage.setItem("nonce", nonce);

    const loginUrl =
        `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}` +
        `&response_type=id_token` +
        `&scope=email+openid+profile` +
        `&nonce=${nonce}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    console.log("Redirecting to Cognito with nonce:", nonce);
    window.location.href = loginUrl;
}

function signup() {
    // Generate nonce for security
    const nonce = generateNonce();
    sessionStorage.setItem("nonce", nonce);

    const signupUrl =
        `${COGNITO_DOMAIN}/signup?client_id=${CLIENT_ID}` +
        `&response_type=id_token` +
        `&scope=email+openid+profile` +
        `&nonce=${nonce}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    console.log("Redirecting to Cognito signup with nonce:", nonce);
    window.location.href = signupUrl;
}

function generateNonce() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function handleAuth() {
    console.log("handleAuth page:", window.location.href);
    console.log("handleAuth hash:", window.location.hash);
    console.log("handleAuth search:", window.location.search);

    // Try to extract token from hash
    const hash = window.location.hash;
    let idToken = null;

    if (hash) {
        // Remove the leading '#' and split by '&'
        const hashParams = hash.substring(1);
        console.log("Hash params:", hashParams);

        // Parse the hash parameters
        const params = new URLSearchParams(hashParams);
        idToken = params.get("id_token");
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