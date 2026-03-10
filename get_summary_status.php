<?php
require 'db.php';
require 'auth.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!isset($current_user_id)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

try {

    $stmt = $pdo->prepare("
        SELECT status, COUNT(*) AS count
        FROM resources
        WHERE user_id = ?
        GROUP BY status
    ");

    $stmt->execute([$current_user_id]);
    $statuses = $stmt->fetchAll();

    http_response_code(200);

    echo json_encode([
        'status_summary' => $statuses
    ]);

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        'error' => 'Failed to fetch status summary'
    ]);
}
?>