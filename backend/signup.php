<?php

use Aws\CognitoIdentityProvider\CognitoIdentityProviderClient;
use Aws\Exception\AwsException;

require_once 'Config.php';
require_once 'db.php';

// ===== CORS Configuration =====
$allowed_origins = Config::getCorsOrigins();

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Methods: POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
        header("Access-Control-Max-Age: 3600");
    }
    http_response_code(200);
    exit();
}

// Set CORS headers for actual request
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else if (!empty($origin)) {
    error_log("Unauthorized CORS origin attempted: $origin");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ===== Cognito Configuration =====
$cognitoConfig = Config::getCognitoConfig();
$region = $cognitoConfig['region'];
$userPoolId = $cognitoConfig['userPoolId'];
$clientId = $cognitoConfig['clientId'];

// AWS SDK initialization - requires aws/aws-sdk-php
// Using environment variables or assume IAM role
$cognitoProvider = 'cognito-idp';

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid request body'
        ]);
        exit;
    }

    // Extract fields
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $firstName = trim($input['firstName'] ?? '');
    $lastName = trim($input['lastName'] ?? '');

    // Validation
    if (!$email || !$password || !$firstName || !$lastName) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields: email, password, firstName, lastName'
        ]);
        exit;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email format'
        ]);
        exit;
    }

    if (strlen($password) < 8) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 8 characters'
        ]);
        exit;
    }

    // Check if user already exists in database
    $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();

    if ($existing) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Email already registered'
        ]);
        exit;
    }

    // ===== Use AWS SDK to create Cognito user =====
    require_once '../vendor/autoload.php';

    try {
        $cognitoClient = new CognitoIdentityProviderClient([
            'version' => 'latest',
            'region'  => $region
        ]);

        $result = $cognitoClient->signUp([
            'ClientId' => $clientId,
            'Username' => $email,
            'Password' => $password,
            'UserAttributes' => [
                ['Name' => 'email', 'Value' => $email],
                ['Name' => 'given_name', 'Value' => $firstName],
                ['Name' => 'family_name', 'Value' => $lastName]
            ]
        ]);

        $userSub = $result['UserSub'] ?? null;

        // Store user in database with Cognito sub
        $stmt = $pdo->prepare("
            INSERT INTO users (email, cognito_sub, first_name, last_name, is_verified)
            VALUES (?, ?, ?, ?, 0)
        ");
        $stmt->execute([$email, $userSub, $firstName, $lastName]);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Signup successful. Please check your email for verification code.',
            'userSub' => $userSub
        ]);
        exit;

    } catch (AwsException $e) {
        error_log("Cognito SignUp Error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $e->getAwsErrorMessage() ?? 'Signup failed'
        ]);
        exit;
    }

} catch (\PDOException $e) {
    error_log("Database Error in signup: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
    exit;
} catch (Exception $e) {
    error_log("Signup Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred during signup'
    ]);
    exit;
}
?>
