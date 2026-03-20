<?php

require 'vendor/autoload.php';
require_once 'db.php';

use Firebase\JWT\JWT;
use Firebase\JWT\JWK;

// ===== CORS Configuration =====
// Determine allowed origin based on environment
$allowed_origins = [
    'http://localhost',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'https://cloud-resource-tracker.duckdns.org',
    'https://cloud-resource-tracker.amplifyapp.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else if (!empty($origin)) {
    error_log("Unauthorized CORS origin attempted: $origin");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 3600");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== Cognito Configuration =====
$region = 'ap-southeast-2';
$userPoolId = 'ap-southeast-2_ZMufTlAjo';

// Extract and validate authorization header
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

if (!$authHeader) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized',
        'message' => 'No authorization header provided'
    ]);
    exit;
}

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized',
        'message' => 'Invalid authorization header format. Expected: Bearer <token>'
    ]);
    exit;
}

$jwt = $matches[1];

try {
    // Fetch public keys from Cognito
    $jwksUrl = "https://cognito-idp.$region.amazonaws.com/$userPoolId/.well-known/jwks.json";
    
    $context = stream_context_create([
        'http' => [
            'timeout' => 5,
            'method' => 'GET'
        ],
        'ssl' => [
            'verify_peer' => true
        ]
    ]);
    
    $jwksJson = @file_get_contents($jwksUrl, false, $context);
    
    if ($jwksJson === false) {
        throw new Exception("Failed to fetch JWKS from Cognito: " . error_get_last()['message']);
    }
    
    $jwks = json_decode($jwksJson, true);
    
    if (!$jwks || !isset($jwks['keys'])) {
        throw new Exception("Invalid JWKS response from Cognito");
    }

    // Parse and validate the JWT
    $parsedKeys = JWK::parseKeySet($jwks);
    $decoded = JWT::decode($jwt, $parsedKeys);

    // Verify token claims
    $issuer = "https://cognito-idp.$region.amazonaws.com/$userPoolId";

    if ($decoded->iss !== $issuer) {
        throw new Exception("Invalid token issuer. Expected: $issuer, Got: " . $decoded->iss);
    }

    if ($decoded->token_use !== "id") {
        throw new Exception("Invalid token type. Expected 'id' token, got: " . $decoded->token_use);
    }

    // Extract user information
    $email = $decoded->email ?? null;
    $name = $decoded->name ?? $decoded->email ?? 'AWS User';
    $cognito_sub = $decoded->sub ?? null;

    if (!$email) {
        throw new Exception("Email claim missing from token");
    }

    if (!$cognito_sub) {
        throw new Exception("Subject (sub) claim missing from token");
    }

    // Upsert user in database
    $stmt = $pdo->prepare("
        SELECT user_id FROM users WHERE email = ? LIMIT 1
    ");
    $stmt->execute([$email]);
    $userRow = $stmt->fetch();

    if ($userRow) {
        $current_user_id = $userRow['user_id'];
        // Update last login time if table structure supports it
        $stmt = $pdo->prepare("
            UPDATE users SET last_login = NOW() WHERE user_id = ?
        ");
        $stmt->execute([$current_user_id]);
    } else {
        // Create new user
        $stmt = $pdo->prepare("
            INSERT INTO users (email, name, cognito_sub) VALUES (?, ?, ?)
        ");
        $stmt->execute([$email, $name, $cognito_sub]);
        $current_user_id = $pdo->lastInsertId();
        error_log("New user registered: $email (ID: $current_user_id)");
    }

    // Return success with user info
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Token validated successfully',
        'user' => [
            'user_id' => $current_user_id,
            'email' => $email,
            'name' => $name
        ]
    ]);
    exit;

} catch (\Firebase\JWT\SignatureInvalidException $e) {
    error_log("JWT Signature Invalid: " . $e->getMessage());
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized',
        'message' => 'Invalid token signature'
    ]);
    exit;

} catch (\Firebase\JWT\BeforeValidException $e) {
    error_log("JWT Before Valid: " . $e->getMessage());
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized',
        'message' => 'Token not yet valid'
    ]);
    exit;

} catch (\Firebase\JWT\ExpiredException $e) {
    error_log("JWT Expired: " . $e->getMessage());
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized',
        'message' => 'Token has expired'
    ]);
    exit;

} catch (\PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server Error',
        'message' => 'Database operation failed'
    ]);
    exit;

} catch (Exception $e) {
    error_log("Authentication Error: " . $e->getMessage());
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Unauthorized',
        'message' => $e->getMessage()
    ]);
    exit;
}

?>