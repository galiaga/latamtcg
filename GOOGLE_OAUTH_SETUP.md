# Google OAuth Setup Guide for LatamTCG

This guide will help you configure Google OAuth to show "LatamTCG" instead of the default Supabase domain during login.

## Current Setup Analysis

**Status**: You are currently using **Supabase's default Google OAuth provider**.

**Evidence**:
- No `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` environment variables in the codebase
- Google OAuth is configured entirely through Supabase dashboard
- The code uses `supabase.auth.signInWithOAuth({ provider: 'google' })` without custom credentials

**Current Behavior**:
- Google login screen shows: "Continue to nhnclzdwxwjpgdtxeizh.supabase.co"
- This is Supabase's default OAuth client

---

## Step 1: Create Your Own Google Cloud OAuth Client

### 1.1 Go to Google Cloud Console

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project (e.g., "LatamTCG" or "LatamTCG Production")

### 1.2 Enable Google+ API (if not already enabled)

1. Go to **APIs & Services** > **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click **Enable** (if not already enabled)

### 1.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen first (see Step 2 below)
4. Choose **Web application** as the application type
5. Name it: "LatamTCG Web Client" or similar

### 1.4 Configure Authorized Redirect URIs

Add these redirect URIs (you'll get the exact URLs from Supabase in Step 3):

**For Production:**
```
https://nhnclzdwxwjpgdtxeizh.supabase.co/auth/v1/callback
https://latamtcg.com/auth/callback
```

**For Development (if needed):**
```
http://localhost:3000/auth/callback
```

**Important**: You'll need to add the exact Supabase callback URL. Get this from:
- Supabase Dashboard > Authentication > URL Configuration > Site URL
- The format is: `https://[your-project-ref].supabase.co/auth/v1/callback`

### 1.5 Save Your Credentials

After creating, you'll see:
- **Client ID**: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`

**Save these securely** - you'll need them for Supabase configuration.

---

## Step 2: Configure Google OAuth Consent Screen

### 2.1 Access OAuth Consent Screen

1. In Google Cloud Console, go to **APIs & Services** > **OAuth consent screen**

### 2.2 Choose User Type

- Select **External** (unless you have a Google Workspace account)
- Click **Create**

### 2.3 Fill in App Information

**App name**: `LatamTCG`

**User support email**: Your email (e.g., `hola@latamtcg.com`)

**App logo** (optional but recommended):
- Upload your LatamTCG logo
- Size: 120x120px minimum
- Format: PNG or JPG
- This will appear on the Google login screen

**App domain**:
- **Application home page**: `https://latamtcg.com`
- **Application privacy policy link**: `https://latamtcg.com/privacy`
- **Application terms of service link**: `https://latamtcg.com/terms`

**Authorized domains**:
- `latamtcg.com`
- `supabase.co` (required for Supabase callbacks)

**Developer contact information**:
- Your email address

### 2.4 Configure Scopes

1. Click **Add or Remove Scopes**
2. Add these scopes:
   - `email`
   - `profile`
   - `openid`
3. Click **Update** > **Save and Continue**

### 2.5 Add Test Users (if in Testing mode)

If your app is in "Testing" mode:
1. Add test users (email addresses that can test the login)
2. Once verified, you can publish the app

### 2.6 Publish Your App

1. Click **Back to Dashboard**
2. If in Testing mode, click **PUBLISH APP**
3. Confirm publishing

**Note**: It may take a few minutes for changes to propagate.

---

## Step 3: Configure Supabase with Your Google Credentials

### 3.1 Access Supabase Dashboard

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project

### 3.2 Navigate to Authentication Settings

1. Go to **Authentication** > **Providers**
2. Find **Google** in the list
3. Click to expand Google settings

### 3.3 Enable Google Provider (if not already enabled)

1. Toggle **Enable Google provider** to ON

### 3.4 Add Your Google OAuth Credentials

1. **Client ID (for OAuth)**: Paste your Google Client ID
   - Format: `123456789-abcdefghijklmnop.apps.googleusercontent.com`

2. **Client Secret (for OAuth)**: Paste your Google Client Secret
   - Format: `GOCSPX-xxxxxxxxxxxxxxxxxxxxx`

3. Click **Save**

### 3.5 Get Your Supabase Redirect URL

1. Go to **Authentication** > **URL Configuration**
2. Note your **Site URL** (e.g., `https://latamtcg.com`)
3. Your Supabase callback URL is: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Replace `[your-project-ref]` with your actual project reference (e.g., `nhnclzdwxwjpgdtxeizh`)

**Important**: Copy this exact URL and add it to Google Cloud Console (Step 1.4) if you haven't already.

---

## Step 4: Update Environment Variables (Optional)

While Supabase stores the credentials in its dashboard, you can also set them via environment variables for consistency. However, **Supabase dashboard configuration takes precedence**.

If you want to document them locally (for reference only):

```bash
# .env.local (for reference - Supabase dashboard is the source of truth)
# These are optional and Supabase dashboard settings take precedence
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

**Note**: The codebase doesn't currently use these variables, but you can add them for documentation purposes.

---

## Step 5: Test the Configuration

### 5.1 Test Google Login

1. Go to your app's login page: `https://latamtcg.com/auth`
2. Click **Continue with Google**
3. You should now see:
   - **App name**: "LatamTCG" (instead of Supabase domain)
   - **App logo**: Your uploaded logo (if configured)
   - **Domain**: Still shows Supabase domain initially (see Step 6 for custom domain)

### 5.2 Verify Redirect Works

1. Complete the Google login
2. You should be redirected back to `/auth/callback`
3. Then redirected to `/orders` (or your intended destination)

### 5.3 Check for Errors

- If you see "redirect_uri_mismatch" error:
  - Verify the redirect URI in Google Cloud Console matches exactly
  - Check for trailing slashes or protocol mismatches (http vs https)

---

## Step 6: Set Up Custom Auth Domain (Optional but Recommended)

To show `auth.latamtcg.com` instead of `nhnclzdwxwjpgdtxeizh.supabase.co`:

### 6.1 Configure Custom Domain in Supabase

1. Go to **Settings** > **Authentication** > **URL Configuration**
2. Scroll to **Custom SMTP** section (or look for **Custom Domain**)
3. Supabase may offer custom domain configuration in **Project Settings** > **Custom Domain**
4. Follow Supabase's instructions for custom domain setup

**Note**: Custom domain for Supabase Auth may require a paid plan. Check your Supabase plan.

### 6.2 Set Up DNS Records

If Supabase supports custom auth domains, you'll need:

**CNAME Record**:
```
Type: CNAME
Name: auth
Value: [provided-by-supabase].supabase.co
TTL: 3600 (or default)
```

### 6.3 Update Google OAuth Redirect URIs

After setting up custom domain, add to Google Cloud Console:

```
https://auth.latamtcg.com/auth/v1/callback
```

### 6.4 Update Supabase Site URL

In Supabase Dashboard:
1. Go to **Authentication** > **URL Configuration**
2. Update **Site URL** to: `https://latamtcg.com`
3. Add **Redirect URLs**:
   - `https://latamtcg.com/auth/callback`
   - `https://auth.latamtcg.com/auth/v1/callback` (if using custom domain)

---

## Step 7: Update Code for Custom Domain (If Applicable)

If you set up a custom auth domain, you may need to update the redirect URL in code:

### Current Code (src/app/auth/page.tsx):
```typescript
redirectTo: `${window.location.origin}/auth/callback`
```

This should continue to work, but verify the callback URL matches your Supabase configuration.

---

## Troubleshooting

### Issue: "redirect_uri_mismatch"

**Solution**:
1. Check Google Cloud Console > Credentials > Your OAuth Client
2. Verify redirect URIs match exactly (including protocol, trailing slashes)
3. Common formats needed:
   - `https://[project-ref].supabase.co/auth/v1/callback`
   - `https://latamtcg.com/auth/callback`

### Issue: App name still shows Supabase domain

**Solution**:
1. Verify OAuth consent screen is published (not in Testing mode)
2. Wait 5-10 minutes for changes to propagate
3. Clear browser cache and try again
4. Verify you're using your custom Client ID in Supabase (not Supabase's default)

### Issue: Logo not showing

**Solution**:
1. Verify logo meets requirements (120x120px, PNG/JPG)
2. Wait a few minutes for Google to process the logo
3. Try in incognito mode to rule out caching

### Issue: "Access blocked: This app's request is invalid"

**Solution**:
1. Check OAuth consent screen is published
2. Verify all required fields are filled (privacy policy, terms of service)
3. If in Testing mode, ensure user email is added to test users list

---

## Security Best Practices

1. **Never commit credentials to git**
   - Keep Client ID and Secret in Supabase dashboard only
   - Use environment variables for local development if needed

2. **Rotate secrets periodically**
   - Update Google Client Secret every 90 days (recommended)
   - Update in Supabase dashboard immediately after rotation

3. **Monitor OAuth usage**
   - Check Google Cloud Console > APIs & Services > Credentials > Usage
   - Monitor for suspicious activity

4. **Use HTTPS only**
   - Never use HTTP redirect URIs in production
   - Google requires HTTPS for OAuth callbacks

---

## Summary Checklist

- [ ] Created Google Cloud OAuth client
- [ ] Configured OAuth consent screen with "LatamTCG" name
- [ ] Added app logo (optional)
- [ ] Added authorized domains (latamtcg.com, supabase.co)
- [ ] Added redirect URIs in Google Cloud Console
- [ ] Configured Google credentials in Supabase dashboard
- [ ] Tested Google login flow
- [ ] Verified app name shows "LatamTCG" in Google login screen
- [ ] (Optional) Set up custom auth domain
- [ ] Updated DNS records (if using custom domain)
- [ ] Tested redirect flow end-to-end

---

## Next Steps

After completing this setup:

1. **Monitor**: Check that Google login works for new users
2. **Test**: Try logging in with different Google accounts
3. **Document**: Update your team documentation with the setup
4. **Backup**: Save your Google Client ID and Secret in a secure password manager

---

## Support Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Support](https://supabase.com/support)

