// ===== Cognito Configuration =====
const COGNITO_DOMAIN = "https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com";
const CLIENT_ID = "132pgtcdjm1eiaq26m426cfbo1";
const REDIRECT_URI = "https://master.d83hzis7nnfol.amplifyapp.com/dashboard.html";
const LOGOUT_URI = "https://master.d83hzis7nnfol.amplifyapp.com/index.html";

// Login
function login() {
    const loginUrl =
        `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}` +
        `&response_type=token` +
        `&scope=email+openid+profile` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    window.location.href = loginUrl;
}

// Signup
function signup() {
    const signupUrl =
        `${COGNITO_DOMAIN}/signup?client_id=${CLIENT_ID}` +
        `&response_type=token` +
        `&scope=email+openid+profile` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    window.location.href = signupUrl;
}

// Handle Cognito token after redirect
function handleAuth() {
    const hash = window.location.hash;

    if (hash && hash.includes("id_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get("id_token");

        if (idToken) {
            localStorage.setItem("idToken", idToken);
            window.history.replaceState({}, document.title, "/dashboard.html");
        }
    }
}

// Get token
function getToken() {
    return localStorage.getItem("idToken");
}

// Logout
function logout() {
    localStorage.removeItem("idToken");

    const logoutUrl =
        `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}` +
        `&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;

    window.location.href = logoutUrl;
}

// Protect private pages
function requireAuth() {
    const token = localStorage.getItem("idToken");

    if (!token) {
        window.location.href = "/index.html";
    }
}