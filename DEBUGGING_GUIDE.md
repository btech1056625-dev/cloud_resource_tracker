# Cloud Resource Tracker - Debugging & Troubleshooting Guide

## Quick Diagnostics

### 1. Check Browser Console (F12)
Watch the console for detailed logs when testing authentication:
```
✓ Look for: "Cognito callback detected, processing authentication..."
✓ Look for: "✅ Token stored successfully in localStorage"
✓ Look for: "✅ Authentication successful! Redirecting to dashboard..."
✗ Look for errors: "❌ Nonce mismatch", "❌ State mismatch", "❌ Token has expired"
```

---

## Common Issues & Solutions

### Issue 1: Landing Page Shows 404

**Symptoms:**
- Browser shows "404 Not Found" when accessing index.html
- Nothing loads on the landing page

**Causes & Solutions:**
1. **Web server not running**
   ```bash
   # Check if your PHP/Node server is running
   # For PHP: php -S localhost:8000
   # For Node: npm start or similar
   ```

2. **Incorrect URL path**
   - Ensure accessing: `http://localhost:xxxx/index.html`
   - NOT: `http://localhost:xxxx/frontend/index.html`

3. **File structure issue**
   - Verify `frontend/index.html` exists
   - Check file permissions (readable)

---

### Issue 2: "Get Started" Button Doesn't Work

**Symptoms:**
- Clicking button does nothing
- No redirect to Cognito

**Causes & Solutions:**
1. **JavaScript not loading**
   ```javascript
   // Test in browser console:
   > typeof login === 'function'
   // Should return: true
   ```

2. **Network issue**
   - Check browser console (F12 → Network tab)
   - Ensure Cognito domain is accessible: 
     ```
     https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com
     ```

3. **CSP (Content Security Policy) blocking**
   - Check console for CSP errors
   - Verify CSP in `<meta>` tag allows Cognito domains

---

### Issue 3: Redirects to Cognito but Doesn't Return

**Symptoms:**
- Login works, redirects to Cognito
- Cognito login succeeds
- But browser stays on Cognito page or shows error

**Causes & Solutions:**
1. **Cognito callback URL mismatch**
   ```javascript
   // Debug in browser console after Cognito login:
   > console.log(window.location.href)
   > console.log(window.location.hash)
   // Should show token in hash after login
   ```

2. **Redirect URI not configured in Cognito**
   - Check AWS Cognito settings
   - Allowed callback URLs must include:
     - `http://localhost:xxxx/index.html` (development)
     - `https://cloud-resource-tracker.duckdns.org/index.html` (production)

3. **Nonce mismatch**
   - Check console: "Nonce mismatch - possible attack"
   - **Solution**: Clear browse cache and localStorage
     ```javascript
     localStorage.clear()
     location.reload()
     ```

---

### Issue 4: Token Validation Fails

**Symptoms:**
- Returns from Cognito with token
- Console shows "Token found"
- But then shows security error

**Causes & Solutions:**
1. **Nonce validation failed**
   ```javascript
   // Debug in console at Cognito login:
   > sessionStorage.setItem("nonce", "test-nonce")
   > sessionStorage.getItem("nonce")
   // Verify these match after return
   ```

2. **Token format invalid**
   - JWT should have 3 parts separated by dots: `header.payload.signature`
   - Check in console:
     ```javascript
     > window.location.hash
     // Should show: #id_token=eyXxx.eyYyy.ezZzz&state=...
     ```

3. **Token expired**
   - Cognito tokens expire after time
   - Solution: Try authentication flow again

---

### Issue 5: Dashboard Doesn't Load After Login

**Symptoms:**
- Authentication succeeds
- Redirected to dashboard
- Dashboard loads but shows no data

**Causes & Solutions:**
1. **API endpoint unreachable**
   - Test in browser console:
     ```javascript
     > fetch('https://cloud-resource-tracker.duckdns.org/cloud_resource_tracker/get_resource.php')
     ```
   - Check error in Network tab (F12)

2. **Authorization header missing**
   - Verify token is in localStorage:
     ```javascript
     > localStorage.getItem("idToken")
     // Should return token starting with "eyJ..."
     ```

3. **Backend not processing token**
   - Check if backend auth.php is loading correctly
   - Verify database connection works

4. **CORS blocked**
   - Check console for CORS error
   - Verify backend returns proper CORS headers

---

### Issue 6: Styling Looks Broken

**Symptoms:**
- Text colors wrong
- Layout misaligned
- Buttons don't style properly

**Causes & Solutions:**
1. **CSS file not loading**
   - Check Network tab (F12)
   - Verify `css/index.css` returns 200
   - Check file path: `frontend/css/index.css`

2. **CSS variables not defined**
   - Check in console:
     ```javascript
     > getComputedStyle(document.body).getPropertyValue('--text-primary')
     // Should return: " #f8fafc"
     ```

3. **Mobile viewport not set**
   - Check HTML has: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`
   - Ensure using responsive CSS media queries

---

### Issue 7: Mobile View Broken

**Symptoms:**
- Sidebar overlaps content
- Buttons too large to tap
- Text too small to read

**Causes & Solutions:**
1. **Viewport meta tag missing**
   - Verify in `<head>`:
     ```html
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
     ```

2. **Mobile CSS not loaded**
   - Test with browser DevTools device emulation (F12 → Ctrl+Shift+M)
   - Check mobile breakpoint: max-width: 767px

3. **Font too small**
   - Minimum font size should be 16px on mobile
   - Check: body { font-size: 14px; } in mobile media query

---

## Detailed Testing Procedure

### Step 1: Test Landing Page Load
```bash
# Terminal 1: Start your web server
php -S localhost:8000

# Terminal 2: Test with curl
curl http://localhost:8000/index.html

# Expected: HTML content returned, no 404
```

### Step 2: Check JavaScript Loads
```javascript
// In browser console (F12):
> typeof login === 'function'  // Should be: true
> typeof handleAuth === 'function'  // Should be: true
> typeof logout === 'function'  // Should be: true
> COGNITO_DOMAIN  // Should be: https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com
> CLIENT_ID  // Should be: 6tkb0i2gbosk9j00f4ue3rq5ca
```

### Step 3: Test Login Flow
```javascript
// In browser console:
> login()
// Check:
// 1. Browser redirects to Cognito
// 2. Clear console
// 3. Login with your test account
// 4. Should return to index.html
// 5. Console should show: "Cognito callback detected, processing authentication..."
```

### Step 4: Verify Token Storage
```javascript
// In browser console:
> localStorage.getItem("idToken")
// Should return JWT (starts with eyJ...)

> localStorage.getItem("userEmail")
// Should return your email

> JSON.parse(atob(localStorage.getItem("idToken").split('.')[1]))
// Should show token claims (email, exp, nonce, etc.)
```

### Step 5: Test API Connectivity
```javascript
// In browser console:
> fetch('https://cloud-resource-tracker.duckdns.org/cloud_resource_tracker/get_resource.php', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem("idToken")}` }
  }).then(r => r.json()).then(d => console.log(d))

// Check response:
// Success: { success: true, data: [...] }
// Failure: Check error message
```

### Step 6: Test on Mobile
```bash
# Get your laptop IP:
# Windows: ipconfig (look for IPv4 Address under your network)
# Mac: ifconfig

# On mobile (same WiFi):
# Open: http://<YOUR_IP>:8000/index.html
```

---

## Browser Dev Tools Guide

### Console Tab (F12 → Console)
```javascript
// Clear console
console.clear()

// Search for messages
// Ctrl+F to find "error" or "❌"

// Copy logs
// Right-click → Save as...
```

### Network Tab (F12 → Network)
```javascript
// Monitor API calls
// Look for:
// ✓ 200 status codes (success)
// ✗ 401 (Unauthorized - token issue)
// ✗ 404 (Not found - URL issue)
// ✗ 500 (Server error)

// Check headers:
// Request → Authorization: Bearer eyJ...
```

### Application Tab (F12 → Application)
```javascript
// Check localStorage:
// idToken (should exist after login)
// userEmail (should exist)
// tokenExpiry (should exist)

// Check sessionStorage:
// Should be empty after successful login (cleaned up)
```

### Responsive Design Mode (Ctrl+Shift+M)
```javascript
// Test on different screen sizes:
// Mobile: 375×667
// Tablet: 768×1024
// Desktop: 1920×1080

// Check:
// - Text is readable
// - Buttons are tappable (min 44px)
// - No horizontal scroll
```

---

## Log Analysis

### What to look for in Console:

**Success Indicators:**
```
✅ Cognito callback detected, processing authentication...
✅ Hash params string: id_token=eyJ...&state=...
✅ Token found
✅ Token payload: {email: "user@example.com", ...}
✅ Token stored successfully in localStorage
✅ Authentication successful! Redirecting to dashboard...
```

**Error Indicators:**
```
❌ Nonce mismatch - possible attack
❌ State mismatch - possible CSRF attack  
❌ Invalid token format: Missing dots in JWT
❌ Token has expired
❌ Cognito authorization error: invalid_request
```

---

## Recovery Procedures

### Clear Browser Data
```javascript
// Clear all stored authentication data
localStorage.clear()
sessionStorage.clear()

// Clear cookies (if used in future)
document.cookie.split(";").forEach(c => {
    document.cookie = c.replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
})

// Reload page
location.reload()
```

### Reset Cognito Session
```javascript
// Manually trigger logout
logout()
// This will:
// 1. Clear localStorage
// 2. Clear sessionStorage
// 3. Redirect to Cognito logout
// 4. Return to index.html
```

### Check Backend Logs
```bash
# PHP logs location (varies by setup):
# Linux: tail -f /var/log/apache2/error.log
# Or check PHP error_log in your project

# Look for messages like:
# [error] "Unauthorized: No token provided"
# [error] "Invalid token signature"
# [error] "Database connection failed"
```

---

## Performance Testing

### Measure Page Load Time
```javascript
// In console:
> performance.getEntriesByType('navigation')[0]
// Check: domContentLoaded, loadEventEnd times
```

### Monitor API Response Time
```javascript
// In console:
> const start = Date.now()
> fetch('...').then(r => r.json()).then(d => {
    console.log('Response time:', Date.now() - start, 'ms')
    console.log('Data:', d)
  })
```

### Check CSS/JS File Sizes
```bash
# Terminal:
ls -lh frontend/js/*.js  # File sizes
ls -lh frontend/css/*.css

# Minify if needed:
# npm install -g minify
# minify frontend/js/auth.js > frontend/js/auth.min.js
```

---

## Security Checklist

Before going to production:

- [ ] Change default database password in `backend/db.php`
- [ ] Update CORS whitelist with your actual domain
- [ ] Enable HTTPS everywhere
- [ ] Remove console.log statements that show sensitive data
- [ ] Implement rate limiting on backend
- [ ] Add CSRF token validation
- [ ] Use httpOnly cookies for token storage
- [ ] Implement token refresh mechanism
- [ ] Add database encryption
- [ ] Set up logging and monitoring
- [ ] Perform security audit
- [ ] Test with OWASP ZAP tool

---

## Contact & Support

If issues persist:
1. Check this guide thoroughly
2. Review error messages in console (F12)
3. Check Network tab for failed requests
4. Verify Cognito configuration in AWS console
5. Check database connection with `debug_db.php`
6. Review logs in `CODEBASE_ANALYSIS.md`

