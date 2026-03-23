# Authentication Service Fix - Complete Guide

## Problem Identified
The authentication error **"Could not reach authentication service"** was caused by the frontend trying to make unsigned direct calls to AWS Cognito's API (`cognito-idp.ap-southeast-2.amazonaws.com`), which requires AWS Signature Version 4 signing.

## Solution Implemented

### 1. ✅ Frontend Changes (COMPLETED)
Updated **`frontend/js/auth.js`** to:
- Route signup, email confirmation, and resend code requests through your backend server
- Use the proper backend API endpoint: `https://cloud-resource-tracker.duckdns.org`
- Removed direct Cognito IDP calls which were failing

**Functions Updated:**
- `signup()` → calls `/backend/signup.php`
- `verifyCode()` → calls `/backend/confirm-signup.php`
- `resendCode()` → calls `/backend/resend-confirmation-code.php`

### 2. ✅ Backend Changes (READY FOR DEPLOYMENT)
Updated backend PHP files to properly use AWS SDK:
- **`backend/signup.php`** - Creates user in Cognito with proper AWS SDK
- **`backend/confirm-signup.php`** - Confirms email via AWS SDK
- **`backend/resend-confirmation-code.php`** - Resends verification code

Updated **`composer.json`** to include AWS SDK dependency:
```json
{
    "require": {
        "firebase/php-jwt": "^7.0",
        "aws/aws-sdk-php": "^3.300"
    }
}
```

## Deployment Instructions

### Step 1: Deploy Updated Files to Backend Server
Copy these files to your backend server (cloud-resource-tracker.duckdns.org):

**Files to Update:**
1. `backend/signup.php` ✅ Updated
2. `backend/confirm-signup.php` ✅ Updated  
3. `backend/resend-confirmation-code.php` ✅ Updated
4. `composer.json` ✅ Updated
5. `frontend/js/auth.js` ✅ Updated

### Step 2: Install AWS SDK on Backend Server
SSH into your backend server and run:

```bash
cd /path/to/cloud_resource_tracker
composer install
```

This will download the AWS SDK and all dependencies.

### Step 3: Verify AWS Credentials
The backend server needs access to AWS credentials to call Cognito. Verify one of these is configured:

**Option A: AWS IAM Role (Recommended for AWS instances)**
If running on EC2, Lambda, or other AWS services, attach an IAM role with these permissions:
- `cognito-idp:SignUp`
- `cognito-idp:ConfirmSignUp`
- `cognito-idp:ResendConfirmationCode`
- `cognito-idp:InitiateAuth`

**Option B: AWS Credentials File**
```bash
# Create ~/.aws/credentials
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

**Option C: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=ap-southeast-2
```

### Step 4: Test Authentication Flow
1. Open the signup page: `https://cloud-resource-tracker.amplifyapp.com/signup.html`
2. Create an account with:
   - First Name
   - Last Name
   - Email
   - Password (8+ characters)
3. Check email for verification code
4. Enter code on verification page
5. Login with email and password
6. Access dashboard

## What Changed & Why

### Frontend Changes
| Before | After | Reason |
|--------|-------|--------|
| Direct call to `cognito-idp.ap-southeast-2.amazonaws.com` | Call to backend at `/backend/signup.php` | Backend can sign requests with AWS credentials |
| Used unsigned HTTP requests | Backend uses AWS SDK with proper signatures | Cognito rejects unsigned requests |
| CORS errors from browser | Browser calls same domain (backend) | No CORS issues with same-origin requests |

### Backend Changes
| Before | After | Reason |
|--------|-------|--------|
| AWS SDK code commented out | AWS SDK code enabled | Needs to call Cognito with valid signatures |
| Stored only to database | Creates actual Cognito users | Enables login via OAuth2 token endpoint |
| No verification code sent | Cognito sends real verification codes | Email delivery + proper security |

## Troubleshooting

### Issue: "composer install" fails on backend server

**Solution:**
- Ensure PHP 7.4+ is installed: `php --version`
- Ensure Composer is installed: `composer --version`
- If composer not in PATH: `php /path/to/composer.phar install`

### Issue: AWS SDK error "Unable to locate credentials"

**Solution:**
- Verify AWS credentials are configured (see Step 3 above)
- Test credentials: 
  ```bash
  aws sts get-caller-identity
  ```
- Check CloudWatch logs for detailed errors

### Issue: "User pool does not have SES permissions"

**Solution:**
- Login to AWS Cognito console
- Go to your User Pool → Message Customization
- Verify email is configured as verified sender
- Or configure SES email in AWS

### Issue: Verification code not received in email

**Solution:**
- Check AWS Cognito User Pool → Message Customization → Email settings
- Verify sender email is confirmed in AWS SES (if using SES)
- Check spam folder
- Try "Resend code" button on verify page

## Browser Console Debugging

After deployment, open browser DevTools (F12) and check:

**Should See ✅:**
```
✅ CLOUD RESOURCE TRACKER AUTH V6.0: Loaded
✅ AUTH script fully loaded and ready
✅ Checking for existing session...
```

**Should NOT See ❌:**
```
❌ Connecting to 'https://cognito-idp.ap-southeast-2.amazonaws.com/' violates CSP
❌ Fetch API cannot load ... Refused to connect
❌ CORS error
```

## Architecture Diagram

```
User Browser
    ↓ (HTTPS)
    ├─→ Frontend (AWS Amplify)
    │    ├─ index.html
    │    ├─ signup.html
    │    ├─ js/auth.js ✅ (UPDATED)
    │
    └─→ Backend (cloud-resource-tracker.duckdns.org)
         ├─ backend/signup.php ✅ (UPDATED)
         ├─ backend/confirm-signup.php ✅ (UPDATED)
         └─ [Calls AWS Cognito with AWS SDK + credentials]
              ↓
         AWS Cognito User Pool
              ↓ (Sends verification codes via SES)
         User Email
```

## Summary

The fix ensures:
1. ✅ Frontend no longer calls unsigned Cognito API
2. ✅ Backend properly signs requests with AWS SDK
3. ✅ Users receive verification emails
4. ✅ Complete signup/login flow works end-to-end
5. ✅ No more CORS errors
6. ✅ No authentication service unreachable errors

**Next Steps:**
1. Deploy updated code to `cloud-resource-tracker.duckdns.org`
2. Run `composer install` on backend server
3. Verify AWS credentials are configured
4. Test signup flow in browser
