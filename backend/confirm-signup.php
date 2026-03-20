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
$region = 'ap-southeast-2';
$userPoolId = 'ap-southeast-2_ZMufTlAjo';
$clientId = '6tkb0i2gbosk9j00f4ue3rq5ca';

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
    $code = trim($input['code'] ?? '');

    // Validation
    if (!$email || !$code) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields: email, code'
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

    // ===== Option 1: Use AWS SDK (if available) =====
    /*
    require '../vendor/autoload.php';
    use Aws\CognitoIdentityProvider\CognitoIdentityProviderClient;
    use Aws\Exception\AwsException;

    $cognitoClient = new CognitoIdentityProviderClient([
        'version' => 'latest',
        'region'  => $region
    ]);

    try {
        $result = $cognitoClient->confirmSignUp([
            'ClientId' => $clientId,
            'Username' => $email,
            'ConfirmationCode' => $code
        ]);

        // Mark user as verified in database
        $stmt = $pdo->prepare("
            UPDATE users SET is_verified = 1, updated_at = NOW() WHERE email = ?
        ");
        $stmt->execute([$email]);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Email verified successfully'
        ]);
        exit;

    } catch (AwsException $e) {
        error_log("Cognito ConfirmSignUp Error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => $e->getAwsErrorMessage() ?? 'Verification failed'
        ]);
        exit;
    }
    */

    // ===== Option 2: Simplified verification (for development) =====
    // In production, implement proper code validation and storage

    // For now, accept any 6-digit code
    // In real implementation, validate against sent code
    if (!preg_match('/^\d{6}$/', $code) && $code !== '000000') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid verification code format'
        ]);
        exit;
    }

    // Mark user as verified in database
    $stmt = $pdo->prepare("
        UPDATE users SET is_verified = 1, updated_at = NOW() WHERE email = ?
    ");
    $stmt->execute([$email]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Email verified successfully'
    ]);
    exit;

} catch (\PDOException $e) {
    error_log("Database Error in confirm-signup: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error occurred'
    ]);
    exit;
} catch (Exception $e) {
    error_log("Confirmation Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An error occurred during verification'
    ]);
    exit;
}
?>
