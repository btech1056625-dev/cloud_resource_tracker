# Backend API Testing Guide

## Authentication API Endpoints

### 1. Signup Endpoint
**URL:** `https://cloud-resource-tracker.duckdns.org/backend/signup.php`  
**Method:** POST  
**Content-Type:** application/json

#### Request:
```json
{
  "email": "user@example.com",
  "password": "TestPassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Response (Success):
```json
{
  "success": true,
  "message": "Signup successful. Please check your email for verification code.",
  "userSub": "ap-southeast-2_ZMufTlAjo_xxxxx"
}
```

#### Response (Error):
```json
{
  "success": false,
  "message": "An account with this email already exists."
}
```

#### HTTP Status Codes:
- `200` - Signup successful
- `400` - Invalid input (missing fields, invalid email, weak password)
- `409` - Email already registered
- `500` - Server error

---

### 2. Confirm Signup Endpoint
**URL:** `https://cloud-resource-tracker.duckdns.org/backend/confirm-signup.php`  
**Method:** POST  
**Content-Type:** application/json

#### Request:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### Response (Success):
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### Response (Error):
```json
{
  "success": false,
  "message": "Invalid verification code. Please try again."
}
```

#### HTTP Status Codes:
- `200` - Email verified successfully
- `400` - Invalid verification code
- `404` - User not found
- `500` - Server error

---

### 3. Resend Confirmation Code Endpoint
**URL:** `https://cloud-resource-tracker.duckdns.org/backend/resend-confirmation-code.php`  
**Method:** POST  
**Content-Type:** application/json

#### Request:
```json
{
  "email": "user@example.com"
}
```

#### Response (Success):
```json
{
  "success": true,
  "message": "Verification code resent to your email"
}
```

#### Response (Error):
```json
{
  "success": false,
  "message": "User not found"
}
```

#### HTTP Status Codes:
- `200` - Code resent successfully
- `400` - User already verified
- `404` - User not found
- `500` - Server error

---

## Testing with cURL

### Test Signup
```bash
curl -X POST https://cloud-resource-tracker.duckdns.org/backend/signup.php \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Test Confirm Signup
```bash
curl -X POST https://cloud-resource-tracker.duckdns.org/backend/confirm-signup.php \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### Test Resend Code
```bash
curl -X POST https://cloud-resource-tracker.duckdns.org/backend/resend-confirmation-code.php \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

---

## Testing with Postman

1. Create new Request
2. Set Method to `POST`
3. Paste URL: `https://cloud-resource-tracker.duckdns.org/backend/signup.php`
4. Go to **Body** tab
5. Select **raw** and **JSON**
6. Paste the request JSON
7. Click **Send**

---

## JavaScript Fetch Testing

```javascript
// Test signup in browser console
fetch('https://cloud-resource-tracker.duckdns.org/backend/signup.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe'
  })
})
.then(r => r.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

---

## Debugging Backend Errors

### Check PHP Logs
```bash
# On the backend server
tail -f /var/log/php/error.log
# or
tail -f /var/log/php-fpm.log
```

### Enable Debug Mode
Add to backend PHP files to log errors:
```php
error_log("DEBUG: " . print_r($_POST, true));
```

### Test Database Connection
```bash
# On backend server
php -r "include 'backend/db.php'; echo 'DB Connected';"
```

### Test AWS Credentials
```bash
# On backend server
aws sts get-caller-identity
```

---

## Common Issues & Solutions

### Issue: "User not found" error

**Solution:**
- Verify user was actually created in previous signup step
- Check database: `SELECT * FROM users WHERE email='test@example.com';`
- User may not have been saved if signup failed

### Issue: "Verification code rejected"

**Solution:**
- Verify correct code from email (check spam folder)
- Code may have expired (typically 24-30 minutes)
- Try "Resend code" button
- Check for typos in the code

### Issue: 500 Server Error

**Solution:**
- Check PHP error logs
- Verify AWS credentials are configured
- Verify Cognito region and Client ID are correct
- Verify database connection is working

### Issue: CORS Error (from browser perspective)

**Solution:**
- This shouldn't happen anymore - backend should handle CORS
- Check backend CORS headers in auth.php
- Verify API_CONFIG.baseUrl in auth.js matches your backend domain

---

## Security Notes

- Passwords are sent over HTTPS only (never HTTP)
- AWS SDK handles secure Cognito communication
- Verification codes are generated and sent by AWS Cognito
- Database stores only email and verified status, not passwords
- JWT tokens are validated server-side before API access

---

## Frontend Integration Flow

```
User enters signup form
    ↓
JavaScript calls signup()
    ↓
Fetch POST to: https://cloud-resource-tracker.duckdns.org/backend/signup.php
    ↓
Backend receives request with AWS SDK enabled
    ↓
Backend calls AWS Cognito SignUp API (signed with credentials)
    ↓
AWS Cognito sends verification code to email
    ↓
Backend returns success response
    ↓
Frontend redirects to verify.html?email=...
    ↓
User checks email for code
    ↓
User enters code on verify page
    ↓
Frontend calls verifyCode()
    ↓
Fetch POST to: https://cloud-resource-tracker.duckdns.org/backend/confirm-signup.php
    ↓
Backend calls AWS Cognito ConfirmSignUp API
    ↓
Frontend automatically calls login()
    ↓
User gets JWT tokens from Cognito OAuth endpoint
    ↓
Frontend stores tokens in localStorage
    ↓
Frontend redirects to dashboard
    ↓
🎉 Authentication Complete!
```
