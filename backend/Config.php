<?php

/**
 * Cloud Resource Tracker - Centralized Configuration Loader
 * Loads environment variables from .env file
 */

class Config {
    private static $config = null;
    private static $envPath = null;

    /**
     * Initialize config by loading .env file
     * Automatically finds .env from current location or parent directories
     */
    public static function init() {
        if (self::$config !== null) {
            return; // Already loaded
        }

        self::$envPath = self::findEnvFile();
        self::$config = [];

        if (self::$envPath) {
            self::loadEnv(self::$envPath);
        } else {
            error_log("WARNING: .env file not found. Using fallback defaults.");
            self::loadDefaults();
        }
    }

    /**
     * Find .env file by traversing up directory structure
     */
    private static function findEnvFile() {
        $currentDir = __DIR__;
        
        // Search up to 3 levels up
        for ($i = 0; $i < 3; $i++) {
            $envFile = $currentDir . DIRECTORY_SEPARATOR . '.env';
            if (file_exists($envFile)) {
                return $envFile;
            }
            $currentDir = dirname($currentDir);
        }
        
        return null;
    }

    /**
     * Load environment variables from .env file
     */
    private static function loadEnv($filePath) {
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            // Parse KEY=VALUE format
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value) - 1) ||
                    (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value) - 1)) {
                    $value = substr($value, 1, -1);
                }
                
                self::$config[$key] = $value;
            }
        }

        error_log("✅ Configuration loaded from: " . $filePath);
    }

    /**
     * Load fallback defaults (for backward compatibility)
     */
    private static function loadDefaults() {
        self::$config = [
            'APP_ENV' => 'production',
            'DB_HOST' => 'database-2.cba0moeueydx.ap-southeast-2.rds.amazonaws.com',
            'DB_NAME' => 'cloud_resource_tracker',
            'DB_USER' => 'admin',
            'DB_PASSWORD' => 'Bhavya12345',
            'DB_CHARSET' => 'utf8mb4',
            'AWS_REGION' => 'ap-southeast-2',
            'COGNITO_USER_POOL_ID' => 'ap-southeast-2_ZMufTlAjo',
            'COGNITO_CLIENT_ID' => '6tkb0i2gbosk9j00f4ue3rq5ca',
            'COGNITO_DOMAIN' => 'ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com',
            'CORS_ORIGINS' => 'http://localhost,http://localhost:5501,http://127.0.0.1:5501,https://cloud-resource-tracker.duckdns.org,https://cloud-resource-tracker.amplifyapp.com',
            'JWT_TIMEOUT' => '5',
        ];
    }

    /**
     * Get configuration value
     */
    public static function get($key, $default = null) {
        if (self::$config === null) {
            self::init();
        }

        return isset(self::$config[$key]) ? self::$config[$key] : $default;
    }

    /**
     * Get database configuration as array
     */
    public static function getDbConfig() {
        self::init();
        return [
            'host' => self::get('DB_HOST'),
            'name' => self::get('DB_NAME'),
            'user' => self::get('DB_USER'),
            'password' => self::get('DB_PASSWORD'),
            'charset' => self::get('DB_CHARSET', 'utf8mb4'),
        ];
    }

    /**
     * Get Cognito configuration
     */
    public static function getCognitoConfig() {
        self::init();
        return [
            'region' => self::get('AWS_REGION'),
            'userPoolId' => self::get('COGNITO_USER_POOL_ID'),
            'clientId' => self::get('COGNITO_CLIENT_ID'),
            'domain' => self::get('COGNITO_DOMAIN'),
            'issuer' => self::get('JWT_ISSUER'),
            'timeout' => (int) self::get('JWT_TIMEOUT', 5),
        ];
    }

    /**
     * Get CORS allowed origins as array
     */
    public static function getCorsOrigins() {
        self::init();
        $originsStr = self::get('CORS_ORIGINS', '');
        return array_map('trim', explode(',', $originsStr));
    }

    /**
     * Get API base URL based on current environment
     */
    public static function getApiBaseUrl() {
        self::init();
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $appEnv = self::get('APP_ENV', 'production');

        // Check if local request
        if (strpos($origin, 'localhost') !== false || strpos($origin, '127.0.0.1') !== false) {
            return self::get('LOCAL_API_BASE_URL', 'http://localhost:8000');
        }

        // Check if Amplify
        if (strpos($origin, 'amplifyapp.com') !== false) {
            return self::get('AMPLIFY_API_BASE_URL', 'https://cloud-resource-tracker.amplifyapp.com');
        }

        // Default to production
        return self::get('PRODUCTION_API_BASE_URL', 'https://cloud-resource-tracker.duckdns.org');
    }
}

// Auto-initialize on include
Config::init();

?>
