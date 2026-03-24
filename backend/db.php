<?php

/**
 * Cloud Resource Tracker - Database Connection
 * Uses centralized configuration from Config.php
 */

require_once __DIR__ . '/Config.php';

// Get database credentials from configuration
$config = Config::getDbConfig();
$host = $config['host'];
$db   = $config['name'];
$user = $config['user'];
$pass = $config['password'];
$charset = $config['charset'];

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    error_log("✅ Database connection established");
} catch (\PDOException $e) {
    error_log("❌ Database connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}
?>
