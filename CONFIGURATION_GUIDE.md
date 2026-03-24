# Configuration Guide - Cloud Resource Tracker

## Overview

This guide explains how the centralized configuration system works and how to set up your environment for local development, testing, and production deployment.

---

## Configuration Architecture

The application now uses a **centralized configuration system** that removes hardcoded values from code:

### Backend Configuration (PHP)
- **File**: `.env` (Root directory)
- **Loader**: `backend/Config.php`
- **Used by**: All PHP backend files

### Frontend Configuration (JavaScript)
- **File**: `frontend/js/config.js`
- **Used by**: `auth.js`, `api.js`, and all frontend components

---

## Environment Setup

### 1. Backend Environment (.env file)

Create a `.env` file in the **root directory** with the following variables:

```bash
# ===== ENVIRONMENT TYPE =====
APP_ENV=local  # Options: local, development, production

# ===== DATABASE CONFIGURATION =====
DB_HOST=database-2.cba0moeueydx.ap-southeast-2.rds.amazonaws.com
DB_NAME=cloud_resource_tracker
DB_USER=admin
DB_PASSWORD=Bhavya12345
DB_CHARSET=utf8mb4

# ===== AWS COGNITO CONFIGURATION =====
AWS_REGION=ap-southeast-2
COGNITO_USER_POOL_ID=ap-southeast-2_ZMufTlAjo
COGNITO_CLIENT_ID=6tkb0i2gbosk9j00f4ue3rq5ca
COGNITO_DOMAIN=ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com

# ===== API ENDPOINTS CONFIGURATION =====
# Local Development
LOCAL_API_BASE_URL=http://localhost:8000
LOCAL_BACKEND_URL=http://localhost:8000/backend

# Production/Hosted
PRODUCTION_API_BASE_URL=https://cloud-resource-tracker.duckdns.org
PRODUCTION_BACKEND_URL=https://cloud-resource-tracker.duckdns.org/backend

# Amplify Hosted Frontend  
AMPLIFY_API_BASE_URL=https://cloud-resource-tracker.amplifyapp.com
AMPLIFY_BACKEND_URL=https://cloud-resource-tracker.duckdns.org/backend

# ===== CORS ALLOWED ORIGINS =====
CORS_ORIGINS=http://localhost,http://localhost:5501,http://127.0.0.1:5501,https://cloud-resource-tracker.duckdns.org,https://cloud-resource-tracker.amplifyapp.com

# ===== JWT CONFIGURATION =====
JWT_ISSUER=https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_ZMufTlAjo
JWT_TIMEOUT=5

# ===== LOGGING =====
LOG_LEVEL=debug
```

### 2. How Configuration is Loaded

#### In PHP (Backend)
```php
<?php
require_once 'backend/Config.php';

// Get database config
$dbConfig = Config::getDbConfig();

// Get Cognito config
$cognitoConfig = Config::getCognitoConfig();

// Get CORS origins
$origins = Config::getCorsOrigins();

// Get API base URL (environment-aware)
$apiUrl = Config::getApiBaseUrl();
?>
```

#### In JavaScript (Frontend)
```javascript
// FrontendConfig automatically detects environment
const apiBaseUrl = FrontendConfig.getApiBaseUrl();
const backendUrl = FrontendConfig.getBackendUrl();
const endpointUrl = FrontendConfig.getEndpointUrl('/endpoint');

// Or use predefined API_CONFIG (loaded from config.js)
const url = API_CONFIG.getUrl('/backend/auth.php');
```

---

## Using the Configuration System

### Backend (PHP) Example

```php
<?php
// File: backend/auth.php

require_once 'Config.php';
require_once 'db.php';

// Automatically loads CORS origins from Config
$allowed_origins = Config::getCorsOrigins();

// Sets CORS headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

// Gets Cognito configuration
$cognitoConfig = Config::getCognitoConfig();
$region = $cognitoConfig['region'];
$userPoolId = $cognitoConfig['userPoolId'];
?>
```

### Frontend (JavaScript) Example

```javascript
// Automatically detects local vs production environment
const API_BASE_URL = API_CONFIG.baseUrl;
// http://localhost:8000 (if local)
// or
// https://cloud-resource-tracker.duckdns.org (if production)

// Make API call with correct endpoint
fetch(API_CONFIG.getUrl('/backend/auth.php'), {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
});
```

---

## Environment-Specific Behavior

### Local Development (localhost)
```
Hostname: localhost or 127.0.0.1
API Base URL: http://localhost:8000
Backend URL: http://localhost:8000/backend
Port: 8000
Cognito: Works via CSP allow-listed Cognito domains
```

### Production (duckdns.org)
```
Hostname: cloud-resource-tracker.duckdns.org
API Base URL: https://cloud-resource-tracker.duckdns.org
Backend URL: https://cloud-resource-tracker.duckdns.org/backend
Protocol: HTTPS
Cognito: Works via CORS configuration
```

### Amplify Hosted
```
Hostname: *.amplifyapp.com
Frontend: Amplify App URL
Backend: https://cloud-resource-tracker.duckdns.org (via CORS proxy)
Cognito: Works via Amplify domain
```

---

## Script Loading Order (Critical)

All HTML files must load scripts in this order:

```html
<!-- 1. Centralized configuration FIRST -->
<script src="js/config.js"></script>

<!-- 2. Authentication module (depends on config) -->
<script src="js/auth.js?v=6.2"></script>

<!-- 3. API module (uses API_CONFIG from config) -->
<script src="js/api.js?v=3"></script>

<!-- 4. Application logic -->
<script src="js/app.js?v=3"></script>
```

**If config.js is not loaded before auth.js and api.js, fallback values will be used ⚠️**

---

## Configuration Files affected by this Update

### Backend Files Updated:
- ✅ `backend/Config.php` - NEW configuration loader
- ✅ `backend/db.php` - Now uses Config.php
- ✅ `backend/auth.php` - Now uses Config.getCognitoConfig()
- ✅ `backend/signup.php` - Now uses Config.getCognitoConfig()
- ✅ `backend/confirm-signup.php` - Now uses Config.getCognitoConfig()
- ✅ `backend/resend-confirmation-code.php` - Now uses Config.getCognitoConfig()

### Frontend Files Updated:
- ✅ `frontend/js/config.js` - NEW centralized frontend config
- ✅ `frontend/js/auth.js` - Updated to use config.js
- ✅ `frontend/js/api.js` - Updated to use API_CONFIG.baseUrl
- ✅ All HTML files - Added config.js before auth.js

### Configuration Files:
- ✅ `.env` - NEW environment configuration
- ✅ `.gitignore` - NEW to protect sensitive files

---

## Security Improvements

### Before
- Database credentials hardcoded in `db.php` ❌
- Cognito config hardcoded in multiple files ❌
- API URLs hardcoded in JavaScript ❌
- Can't switch environments easily ❌

### After
- Database credentials in `.env` (not in Git) ✅
- Cognito config in `.env` ✅
- API URLs determined dynamically from hostname ✅
- Easy environment switching with `.env` ✅
- Credentials protected by `.gitignore` ✅

---

## Troubleshooting Configuration Issues

### Issue: API calls returning 404

**Check:**
1. Is `config.js` loaded before `auth.js`?
   ```html
   <script src="js/config.js"></script>
   <script src="js/auth.js"></script>
   ```

2. Check API base URL in browser console:
   ```javascript
   console.log(API_CONFIG.baseUrl);  // Should show correct URL
   ```

3. Verify `.env` file exists and is readable by PHP:
   ```bash
   ls -la .env  # Linux/Mac
   dir .env     # Windows
   ```

### Issue: Database connection failed

**Check:**
1. `.env` file is readable (not in `.gitignore`)
2. Database credentials in `.env` are correct:
   ```bash
   DB_HOST=database-2.cba0moeueydx.ap-southeast-2.rds.amazonaws.com
   DB_USER=admin
   DB_PASSWORD=Bhavya12345
   ```

3.  Check error logs:
   ```php
   error_log("DB Config: " . print_r(Config::getDbConfig(), true));
   ```

### Issue: CORS errors from Cognito

**Check:**
1. CORS origins in `.env` include your hostname:
   ```
   CORS_ORIGINS=http://localhost,http://localhost:5501,...
   ```

2. CSP policy in HTML headers allows Cognito domain:
   ```html
   connect-src ... https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com ...
   ```

### Issue: "Config file not found" errors

**Solution:**
```php
// Config.php automatically searches:
// 1. __DIR__/.env
// 2. dirname(__DIR__)/.env  
// 3. dirname(dirname(__DIR__))/.env

// Falls back to defaults if not found
```

---

## Loading Priority

### Backend Configuration Load Order
1. `Config::init()` called when `Config.php` is included
2. Searches for `.env` file (up to 3 directory levels)
3. If found: Loads variables from `.env`
4. If not found: Loads hardcoded defaults
5. Provides methods to access configuration

### Frontend Configuration Load Order
1. `config.js` executes on page load
2. `FrontendConfig` class detects current hostname
3. Selects appropriate API base URL
4. Provides `COGNITO_CONFIG` and `API_CONFIG` globally
5. `auth.js` and `api.js` use these global objects

---

## Updating Configuration in Production

### To update production environment:

1. **SSH into production server:**
   ```bash
   ssh user@cloud-resource-tracker.duckdns.org
   cd /var/www/html/cloud_resource_tracker
   ```

2. **Edit .env file:**
   ```bash
   nano .env
   # or
   vi .env
   ```

3. **Update variables (e.g., database password):**
   ```bash
   DB_PASSWORD=NewPasswordHere
   ```

4. **Save and test:**
   ```bash
   php -r "require 'backend/Config.php'; print_r(Config::get('DB_PASSWORD'));"
   ```

5. **Verify no cache issues:**
   ```bash
   # Clear PHP opcode cache if needed
   sudo systemctl restart php-fpm
   ```

---

## Next Steps

1. ✅ Create `.env` file from the template above
2. ✅ Verify PHP can load `.env`:
   ```bash
   php backend/Config.php
   ```

3. ✅ Test frontend configuration:
   - Open browser console
   - Check: `console.log(API_CONFIG.baseUrl)`
   - Should show correct URL for your environment

4. ✅ Run connectivity test:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/backend/get_resource.php
   ```

---

## Questions?

Refer to:
- `backend/Config.php` - Configuration loader implementation
- `frontend/js/config.js` - Frontend configuration
- `.env` - Environment variables template
