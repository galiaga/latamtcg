# Google OAuth Quick Start - LatamTCG

## Current Status

✅ **You are using Supabase's default Google OAuth provider**

This means:
- Google login shows: "Continue to nhnclzdwxwjpgdtxeizh.supabase.co"
- No custom Google credentials are configured
- Configuration is done entirely in Supabase dashboard

## Quick Answer to Your Questions

### 1. Current Setup: **Option A - Supabase's Default Provider**

**Files/Environment Variables:**
- `src/app/auth/page.tsx` - Uses `supabase.auth.signInWithOAuth({ provider: 'google' })`
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- **No Google-specific environment variables** (credentials are in Supabase dashboard)

### 2. Switch to Custom Google OAuth: **Follow Steps Below**

### 3. Google OAuth Consent Screen: **Configure in Google Cloud Console**

### 4. Custom Domain: **Optional - Requires Supabase paid plan**

---

## Step-by-Step Implementation

### Step 1: Create Google Cloud OAuth Client (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** > **Credentials** > **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Choose **Web application**
4. Name: "LatamTCG Web Client"
5. **Save Client ID and Secret** (you'll need these for Supabase)

### Step 2: Configure OAuth Consent Screen (10 minutes)

1. **APIs & Services** > **OAuth consent screen**
2. **App name**: `LatamTCG`
3. **User support email**: Your email
4. **App logo**: Upload 120x120px logo (optional)
5. **Application home page**: `https://latamtcg.com`
6. **Privacy policy**: `https://latamtcg.com/privacy`
7. **Terms of service**: `https://latamtcg.com/terms`
8. **Authorized domains**: 
   - `latamtcg.com`
   - `supabase.co`
9. **Scopes**: `email`, `profile`, `openid`
10. **Publish** the app

### Step 3: Get Supabase Redirect URL (2 minutes)

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Your project > **Authentication** > **URL Configuration**
3. Your callback URL is: `https://[your-project-ref].supabase.co/auth/v1/callback`
   - Replace `[your-project-ref]` with your actual project reference
   - Example: `https://nhnclzdwxwjpgdtxeizh.supabase.co/auth/v1/callback`

### Step 4: Add Redirect URI to Google Cloud (2 minutes)

1. Go back to Google Cloud Console > **Credentials** > Your OAuth Client
2. **Authorized redirect URIs** > **+ ADD URI**
3. Add:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   https://latamtcg.com/auth/callback
   ```
4. **Save**

### Step 5: Configure Supabase with Your Credentials (3 minutes)

1. Supabase Dashboard > **Authentication** > **Providers** > **Google**
2. **Enable Google provider**: ON
3. **Client ID (for OAuth)**: Paste your Google Client ID
4. **Client Secret (for OAuth)**: Paste your Google Client Secret
5. **Save**

### Step 6: Test (2 minutes)

1. Visit `https://latamtcg.com/auth`
2. Click **Continue with Google**
3. ✅ You should now see: **"Continue to LatamTCG"** (or your app name)
4. Complete login and verify redirect works

**Total Time: ~25 minutes**

---

## Optional: Custom Auth Domain

To show `auth.latamtcg.com` instead of Supabase domain:

1. **Check Supabase Plan**: Custom domains may require paid plan
2. **Supabase Dashboard** > **Settings** > Look for custom domain option
3. **DNS**: Add CNAME record `auth.latamtcg.com` → `[supabase-provided].supabase.co`
4. **Update Google**: Add `https://auth.latamtcg.com/auth/v1/callback` to redirect URIs
5. **Update Supabase**: Add custom domain in URL configuration

**Note**: This is optional and may require Supabase Pro plan or higher.

---

## Troubleshooting

### "redirect_uri_mismatch"
- Verify redirect URI in Google Cloud matches exactly (including https://)
- Check for trailing slashes

### Still shows Supabase domain
- Wait 5-10 minutes for changes to propagate
- Clear browser cache
- Verify you're using custom Client ID in Supabase (not default)

### Logo not showing
- Wait a few minutes for Google to process
- Verify logo is 120x120px, PNG or JPG

---

## Full Documentation

For detailed instructions, troubleshooting, and security best practices, see:
**[GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)**

---

## Verification

Run the verification script:
```bash
./scripts/verify-google-oauth.sh
```

