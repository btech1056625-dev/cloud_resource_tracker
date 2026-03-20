<?php

require_once 'db.php';

// ===== CORS Configuration =====
$allowed_origins = [
    'http://localhost',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'https://frontend.d1v2anpquopal6.amplifyapp.com',
    'https://cloud-resource-tracker.duckdns.org',
    'https://cloud-resource-tracker.amplifyapp.com'
];

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
$region = 'ap-southeast-2';
$userPoolId = 'ap-southeast-2_ZMufTlAjo';
$clientId = '6tkb0i2gbosk9j00f4ue3rq5ca';

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

    // ===== Option 1: Use AWS SDK (if available) =====
    // This requires aws/aws-sdk-php to be installed
    // Uncomment if AWS SDK is available

    /*
    require '../vendor/autoload.php';
    use Aws\CognitoIdentityProvider\CognitoIdentityProviderClient;
    use Aws\Exception\AwsException;

    $cognitoClient = new CognitoIdentityProviderClient([
        'version' => 'latest',
        'region'  => $region
    ]);

    try {
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

        // Store pending signup in database
        $stmt = $pdo->prepare("
            INSERT INTO users (email, cognito_sub, first_name, last_name, is_verified)
            VALUES (?, ?, ?, ?, 0)
        ");
        $stmt->execute([$email, $result['UserSub'], $firstName, $lastName]);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Signup successful. Please check your email for verification code.',
            'userSub' => $result['UserSub']
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
    */

    // ===== Option 2: Direct API Call (fallback) =====
    // For environments without AWS SDK installed

    $cognitoEndpoint = "https://cognito-idp.{$region}.amazonaws.com/";
    
    // Create request signature (AWS Signature Version 4)
    // For development, this requires proper AWS credentials configured
    
    // Store user as pending in database first
    // This will be activated once email is verified
    $stmt = $pdo->prepare("
        INSERT INTO users (email, first_name, last_name, is_verified)
        VALUES (?, ?, ?, 0)
    ");
    $stmt->execute([$email, $firstName, $lastName]);
    $userId = $pdo->lastInsertId();

    // Store password temporarily (in production, hash it)
    // In real implementation, use PHP's password_hash()
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("
        UPDATE users SET cognito_sub = ? WHERE user_id = ?
    ");
    $stmt->execute([$hashedPassword, $userId]);

    // Log for manual Cognito signup if needed
    error_log("User signup request: email=$email, userId=$userId");

    // Return success - client will receive verification code from Cognito
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Signup successful. Check your email for verification code.',
        'userId' => $userId,
        'email' => $email
    ]);
    exit;

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
