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

// Set CORS headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else if (!empty($origin)) {
    error_log("Unauthorized CORS origin: $origin");
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

    // Validation
    if (!$email) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing required field: email'
        ]);
        exit;
    }

    // Check user exists
    $stmt = $pdo->prepare("
        SELECT user_id, is_verified FROM users WHERE email = ? LIMIT 1
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'User not found'
        ]);
        exit;
    }

    if ($user['is_verified']) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'User already verified'
        ]);
        exit;
    }

    // ===== Use AWS SDK to resend confirmation code =====
    require_once '../vendor/autoload.php';

    $cognitoClient = new CognitoIdentityProviderClient([
        'version' => 'latest',
        'region'  => $region
    ]);

    try {
        $result = $cognitoClient->resendConfirmationCode([
            'ClientId' => $clientId,
            'Username' => $email
        ]);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Verification code resent to your email'
        ]);
        exit;

    } catch (AwsException $e) {
        error_log("Cognito ResendConfirmationCode Error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $e->getAwsErrorMessage() ?? 'Failed to resend code'
        ]);
        exit;
    }

} catch (\PDOException $e) {
    error_log("Database Error in resend-confirmation-code: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
    exit;
} catch (Exception $e) {
    error_log("Resend Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred while resending code'
    ]);
    exit;
}
?>
