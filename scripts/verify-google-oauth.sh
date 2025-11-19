#!/bin/bash
# Quick verification script for Google OAuth setup
# This script checks if your Google OAuth is properly configured

echo "🔍 Verifying Google OAuth Setup for LatamTCG..."
echo ""

# Check if Supabase environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set"
else
  echo "✅ NEXT_PUBLIC_SUPABASE_URL is set: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
else
  echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set (length: ${#NEXT_PUBLIC_SUPABASE_ANON_KEY})"
fi

echo ""
echo "📋 Manual Verification Checklist:"
echo ""
echo "1. Google Cloud Console:"
echo "   [ ] OAuth consent screen shows 'LatamTCG' as app name"
echo "   [ ] App logo is uploaded (optional)"
echo "   [ ] Authorized domains include: latamtcg.com, supabase.co"
echo "   [ ] Redirect URIs include your Supabase callback URL"
echo ""
echo "2. Supabase Dashboard:"
echo "   [ ] Google provider is enabled"
echo "   [ ] Custom Google Client ID is configured (not Supabase default)"
echo "   [ ] Custom Google Client Secret is configured"
echo "   [ ] Site URL is set to: https://latamtcg.com"
echo "   [ ] Redirect URLs include: https://latamtcg.com/auth/callback"
echo ""
echo "3. Testing:"
echo "   [ ] Visit https://latamtcg.com/auth"
echo "   [ ] Click 'Continue with Google'"
echo "   [ ] Verify Google login shows 'LatamTCG' (not Supabase domain)"
echo "   [ ] Complete login and verify redirect works"
echo ""
echo "📖 For detailed setup instructions, see: GOOGLE_OAUTH_SETUP.md"
echo ""

