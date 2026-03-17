<?php

require 'vendor/autoload.php';
require_once 'db.php';

use Firebase\JWT\JWT;
use Firebase\JWT\JWK;

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$region = 'ap-southeast-2';
$userPoolId = 'ap-southeast-2_ZMufTlAjo'; 

$authHeader = '';
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
    }
}

if (!preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Unauthorized: No token provided',
        'debug_server' => array_keys($_SERVER) // Helps debug if header is missing
    ]);
    exit;
}

$jwt = $matches[1];

try {

    $jwksUrl = "https://cognito-idp.$region.amazonaws.com/$userPoolId/.well-known/jwks.json";
    $jwksJson = file_get_contents($jwksUrl);
    $jwks = json_decode($jwksJson, true);

    if (!$jwks) {
        throw new Exception("Unable to fetch JWKS from Cognito");
    }

    $parsedKeys = JWK::parseKeySet($jwks);
    $decoded = JWT::decode($jwt, $parsedKeys);

    $issuer = "https://cognito-idp.$region.amazonaws.com/$userPoolId";

    if ($decoded->iss !== $issuer) {
        throw new Exception("Invalid token issuer");
    }

    if ($decoded->token_use !== "id") {
        throw new Exception("Invalid token type");
    }

    $email = $decoded->email ?? null;
    $name = $decoded->name ?? 'AWS User';

    if (!$email) {
        throw new Exception("Email claim missing.");
    }

    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $userRow = $stmt->fetch();

    if ($userRow) {
        $current_user_id = $userRow['user_id'];
    } else {
        $insertStmt = $pdo->prepare("INSERT INTO users (email, name) VALUES (?, ?)");
        $insertStmt->execute([$email, $name]);
        $current_user_id = $pdo->lastInsertId();
    }

} catch (Exception $e) {

    http_response_code(401);

    echo json_encode([
        "error" => "Unauthorized",
        "message" => $e->getMessage(),
        "debug_token_prefix" => isset($jwt) ? substr($jwt, 0, 10) : 'none'
    ]);

    exit;
}