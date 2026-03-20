<?php

/**
 * Cloud Resource Tracker API Router
 * Routes requests to appropriate endpoint handlers
 */

// Get the request path
$request_uri = $_SERVER['REQUEST_URI'];
$script_name = $_SERVER['SCRIPT_NAME'];

// Remove the script name from the URI to get the path
if (strpos($request_uri, $script_name) === 0) {
    $path = substr($request_uri, strlen($script_name));
} else {
    $path = $request_uri;
}

// Parse the path (remove query string)
$path = parse_url($path, PHP_URL_PATH);
$path = trim($path, '/');

// Route to appropriate handler
$parts = explode('/', $path);
$endpoint = $parts[0] ?? '';

// ===== CORS Configuration =====
$allowed_origins = [
    'http://localhost',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'https://frontend.d1v2anpquopal6.amplifyapp.com',
    'https://cloud-resource-tracker.duckdns.org',
    'https://cloud-resource-tracker.amplifyapp.com'
];

// Set CORS headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else if (!empty($origin)) {
    error_log("Unauthorized CORS origin: $origin");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 3600");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json; charset=UTF-8");

// Route to appropriate handler
switch ($endpoint) {
    case 'signup':
        require __DIR__ . '/backend/signup.php';
        exit;
    
    case 'confirm-signup':
        require __DIR__ . '/backend/confirm-signup.php';
        exit;
    
    case 'resend-confirmation-code':
        require __DIR__ . '/backend/resend-confirmation-code.php';
        exit;
    
    case 'auth':
        require __DIR__ . '/auth.php';
        exit;
    
    case 'add_resource':
        require __DIR__ . '/add_resource.php';
        exit;
    
    case 'get_resource':
        require __DIR__ . '/get_resource.php';
        exit;
    
    case 'delete_resource':
        require __DIR__ . '/delete_resource.php';
        exit;
    
    case 'get_cost_by_service':
        require __DIR__ . '/get_cost_by_service.php';
        exit;
    
    case 'get_summary_status':
        require __DIR__ . '/get_summary_status.php';
        exit;
    
    default:
        http_response_code(404);
        echo json_encode([
            'error' => 'Not Found',
            'message' => "Endpoint '/$endpoint' does not exist",
            'available_endpoints' => [
                '/signup',
                '/confirm-signup',
                '/resend-confirmation-code',
                '/auth',
                '/add_resource',
                '/get_resource',
                '/delete_resource',
                '/get_cost_by_service',
                '/get_summary_status'
            ]
        ]);
        exit;
}
?>
