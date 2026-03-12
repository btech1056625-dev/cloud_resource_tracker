// ===== Cognito Configuration =====
const COGNITO_DOMAIN = "https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com";
const CLIENT_ID = "132pgtcdjm1eiaq26m426cfbo1";
const REDIRECT_URI = "https://master.d83hzis7nnfol.amplifyapp.com/dashboard.html";
const LOGOUT_URI = "https://master.d83hzis7nnfol.amplifyapp.com/index.html";

function login() {
    const loginUrl =
        `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}` +
        `&response_type=token` +
        `&scope=email+openid+profile` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    console.log("Redirecting to Cognito:", loginUrl);
    window.location.href = loginUrl;
}

function signup() {
    const signupUrl =
        `${COGNITO_DOMAIN}/signup?client_id=${CLIENT_ID}` +
        `&response_type=token` +
        `&scope=email+openid+profile` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    console.log("Redirecting to Cognito signup:", signupUrl);
    window.location.href = signupUrl;
}

function handleAuth() {
    console.log("handleAuth page:", window.location.href);
    console.log("handleAuth hash:", window.location.hash);
    console.log("handleAuth search:", window.location.search);

    const hash = window.location.hash;

    if (hash && hash.includes("id_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get("id_token");

        if (idToken) {
            localStorage.setItem("idToken", idToken);
            console.log("Token stored successfully");
            window.history.replaceState({}, document.title, "/dashboard.html");
            return;
        }
    }

    console.log("No id_token found in URL");
}

function getToken() {
    return localStorage.getItem("idToken");
}

function logout() {
    localStorage.removeItem("idToken");

    const logoutUrl =
        `${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}` +
        `&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;

    window.location.href = logoutUrl;
}

function requireAuth() {
    const token = localStorage.getItem("idToken");
    console.log("requireAuth token:", token);

    if (!token) {
        window.location.href = "/index.html";
    }
}