# Setting Up Google Authentication in Supabase

## Error Explanation

You're encountering this error when trying to sign up with Google:

```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

This means that while your code is correctly implementing Google authentication, the Google provider is not enabled in your Supabase project settings.

## Step-by-Step Solution

### 1. Create OAuth Credentials in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. If prompted, configure the OAuth consent screen first
   - Set User Type to "External" (or "Internal" if this is just for your organization)
   - Fill in the required app information
   - Add the scopes you need (typically `.../auth/userinfo.email` and `.../auth/userinfo.profile`)
   - Add test users if in testing mode
6. Back in the Credentials screen, create an OAuth client ID:
   - Application type: Web application
   - Name: Your app name (e.g., "Chat App")
   - Authorized JavaScript origins: Add your Supabase project URL (e.g., `https://widuixyzsnlnngfrylpa.supabase.co`)
   - Authorized redirect URIs: Add your Supabase authentication callback URL:
     - Format: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - Example: `https://widuixyzsnlnngfrylpa.supabase.co/auth/v1/callback`
7. Click "Create"
8. Note down the generated **Client ID** and **Client Secret**

### 2. Configure Google Auth Provider in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project (the one with URL: `https://widuixyzsnlnngfrylpa.supabase.co`)
3. Navigate to "Authentication" in the left sidebar
4. Click on "Providers"
5. Find "Google" in the list of providers and click on it
6. Toggle the "Enable" switch to ON
7. Enter the **Client ID** and **Client Secret** from Google Cloud Console
8. For "Authorized Redirect URIs", you can leave it as is (Supabase handles this automatically)
9. Click "Save"

### 3. Additional Configuration (Optional but Recommended)

1. In your Supabase Authentication settings, make sure "Site URL" is set correctly

   - This should be your production website URL (e.g., `https://your-chat-app.vercel.app`)
   - For local development, you can add additional redirect URLs in the "Additional Redirect URLs" field
   - Example for local: `http://localhost:3000/auth/callback`

2. If you're using a custom domain, make sure to add it to the authorized domains in both Google Cloud Console and Supabase settings

### 4. Testing

After completing the setup:

1. Try signing up with Google again
2. The error should be resolved, and you should be redirected through the Google authentication flow
3. After successful authentication, you'll be redirected back to your application

## Troubleshooting

If you still encounter issues:

1. Check that the Client ID and Client Secret are entered correctly in Supabase
2. Verify that the redirect URIs are properly configured in Google Cloud Console
3. Make sure your Google Cloud project has the "Google+ API" or "Google People API" enabled
4. Check the Supabase logs for any authentication errors
5. Ensure your application is using the correct Supabase URL and API key

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup Guide](https://developers.google.com/identity/protocols/oauth2)
