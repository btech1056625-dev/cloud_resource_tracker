# Authentication Service Debugging Report - Cloud Resource Tracker

## Overview
This report documents the debugging of authentication service connectivity issues in the Cloud Resource Tracker application. The main issue was that AWS Cognito authentication endpoints were being blocked by restrictive Content Security Policy (CSP) rules.

---

## Issues Found & Fixed

### 1. **MALFORMED HTML FILE** ✅ FIXED
**File**: `frontend/add_resource.html`

**Problem**: 
- Stray `br` tag appeared before the DOCTYPE declaration
- This breaks HTML parsing and prevents proper loading of CSP meta tags

**Fix Applied**:
```html
<!-- BEFORE (Line 1) -->
br
<!DOCTYPE html>

<!-- AFTER (Line 1) -->
<!DOCTYPE html>
```

---

### 2. **MISSING LOCALHOST IN CSP** ✅ FIXED
**Files Affected**: All HTML files in `frontend/`
- `add_resource.html`
- `dashboard.html`
- `index.html`
- `profile.html`
- `signup.html`
- `verify.html`
- `view_resources.html`

**Problem**:
- CSP policies did not allow `localhost` connections
- This prevented local development/testing from connecting to Cognito
- Users developing locally would see browser CSP violations

**Fix Applied**:
Added `http://localhost:*` and `https://localhost:*` to all `connect-src` directives:

```html
<!-- BEFORE -->
connect-src 'self' https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com https://cognito-idp.ap-southeast-2.amazonaws.com https://cloud-resource-tracker.duckdns.org

<!-- AFTER -->
connect-src 'self' http://localhost:* https://localhost:* https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com https://cognito-idp.ap-southeast-2.amazonaws.com https://cloud-resource-tracker.duckdns.org
```

---

### 3. **INCORRECTLY FORMATTED NETLIFY HEADERS FILE** ✅ FIXED
**File**: `frontend/_headers`

**Problem**:
- The entire Content-Security-Policy header was wrapped in JavaScript multi-line comment syntax `/* ... */`
- Netlify/Amplify _headers files must use proper Netlify format, not JavaScript comments
- The header was not being applied by the deployment platform

**Fix Applied**:
Converted to proper Netlify _headers format:

```
BEFORE:
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...*/

AFTER:
/:
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
```

---

## Current Authentication Configuration

### Cognito Configuration
- **Region**: `ap-southeast-2`
- **User Pool ID**: `ap-southeast-2_ZMufTlAjo`
- **Client ID**: `6tkb0i2gbosk9j00f4ue3rq5ca`
- **Auth Domain**: `ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com`
- **IDP Endpoint**: `https://cognito-idp.ap-southeast-2.amazonaws.com/`

### CORS Configuration
**Backend** (`backend/auth.php`, `backend/signup.php`, `backend/confirm-signup.php`)

Allowed Origins:
- `http://localhost`
- `http://localhost:5501`
- `http://127.0.0.1:5501`
- `https://frontend.d1v2anpquopal6.amplifyapp.com`
- `https://cloud-resource-tracker.duckdns.org`
- `https://cloud-resource-tracker.amplifyapp.com`

### CSP Directives (Updated)
After fixes, all HTML files include:

```
default-src 'self'
script-src 'self' 'unsafe-inline' https://d3sdmrdkgkaitg.cloudfront.net https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://d3sdmrdkgkaitg.cloudfront.net https://dkifvm4b8a1j4.cloudfront.net https://cdnjs.cloudflare.com
connect-src 'self' http://localhost:* https://localhost:* https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com https://cognito-idp.ap-southeast-2.amazonaws.com https://cloud-resource-tracker.duckdns.org
img-src 'self' https://d19nijclqkl93.cloudfront.net data:
font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
object-src 'none'
upgrade-insecure-requests
```

---

## Authentication Flow

### Sign Up Flow
1. User fills signup form with email, password, first name, last name
2. Frontend calls AWS Cognito `SignUp` API directly via:
   - **Endpoint**: `https://cognito-idp.ap-southeast-2.amazonaws.com/`
   - **Method**: POST with `X-Amz-Target: AWSCognitoIdentityProviderService.SignUp`
3. User receives confirmation code via email
4. User submits confirmation code via `confirm-signup.php`

### Login Flow
1. User submits email and password on login form
2. Frontend makes request to Cognito OAuth2 token endpoint:
   - **Endpoint**: `https://ap-southeast-2zmuftlajo.auth.ap-southeast-2.amazoncognito.com/oauth2/token`
   - **Method**: POST with `grant_type: password`
3. Cognito returns ID token and access token
4. Tokens stored in localStorage (prefixed with `tasky_`)

---

## Testing the Fix

### Local Development
To test authentication locally:

1. Ensure your frontend is running on `localhost` or `localhost:5501`
2. Check browser console for CSP violations - there should be NONE related to Cognito endpoints
3. Attempt signup:
   - Should see successful requests to Cognito IDP endpoint
   - Should receive confirmation code email
4. Attempt login:
   - Should see successful requests to OAuth2 token endpoint
   - Should receive tokens and redirect to dashboard

### Browser Console Verification
After fixes, you should NOT see:
- ❌ "Connecting to 'https://cognito-idp.ap-southeast-2.amazonaws.com/' violates CSP"
- ❌ "Fetch API cannot load ... CSP violation"
- ❌ "frame-ancestors 'none'" errors

You SHOULD see:
- ✅ "✅ AUTH script fully loaded and ready"
- ✅ "✅ Checking for existing session..."
- ✅ Successful fetch requests to Cognito endpoints

---

## Files Modified

1. **frontend/add_resource.html** - Removed stray `br`, added localhost to CSP
2. **frontend/dashboard.html** - Added localhost to CSP
3. **frontend/index.html** - Added localhost to CSP
4. **frontend/profile.html** - Added localhost to CSP
5. **frontend/signup.html** - Added localhost to CSP
6. **frontend/verify.html** - Added localhost to CSP
7. **frontend/view_resources.html** - Added localhost to CSP
8. **frontend/_headers** - Fixed Netlify format and added localhost to CSP

---

## Next Steps

1. **Test locally** - Start a local web server and test the authentication flow
2. **Deploy to Amplify** - The updated _headers file should now be properly applied
3. **Monitor browser console** - Watch for any remaining CSP violations
4. **Verify token storage** - Confirm tokens are being stored in localStorage with `tasky_` prefix
5. **Test dashboard redirect** - Ensure successful login redirects to dashboard

---

## Troubleshooting

### If you still see CSP errors:
1. **Clear browser cache** - CSP policies may be cached
2. **Check network tab** - Verify requests are being made to Cognito endpoints
3. **Check console errors** - Look for specific CSP violation messages
4. **Verify URL** - Ensure you're accessing app from allowed origin (localhost, cloud-resource-tracker.duckdns.org, etc.)

### If signup fails:
1. Check network tab for response from Cognito IDP
2. Verify Cognito user pool ID and client ID are correct
3. Ensure password meets Cognito requirements (8+ chars, uppercase, lowercase, number, symbol)

### If login fails:
1. Verify OAuth2 endpoint is accessible
2. Check email/password are correct
3. Verify user is confirmed (check confirmation email)

---

## References

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Netlify _headers Documentation](https://docs.netlify.com/routing/headers/)
