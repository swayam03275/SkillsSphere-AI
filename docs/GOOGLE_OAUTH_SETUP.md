# Google OAuth 2.0 Setup Guide

This guide provides a comprehensive, step-by-step walkthrough to configure Google OAuth 2.0 for the SkillsSphere AI platform. It is required for the "Sign in with Google" functionality.

## 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. **Create a New Project**:
   - Click the project dropdown in the top navigation bar.
   - Click **New Project**.
   - Name it (e.g., "SkillsSphere-AI-Auth") and click **Create**.
   - Ensure the new project is selected in the top navigation bar.

## 2. Configure the OAuth Consent Screen

Before generating credentials, you must configure the consent screen that users see when signing in.

1. In the left sidebar, navigate to **APIs & Services > OAuth consent screen**.
2. Select **External** (unless you are restricting this app to a specific Google Workspace organization).
3. Click **Create**.
4. Fill out the mandatory fields:
   - **App name**: SkillsSphere AI
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **Save and Continue**.
6. On the **Scopes** page, click **Add or Remove Scopes**. Select `.../auth/userinfo.email` and `.../auth/userinfo.profile`. Click **Save and Continue**.
7. On the **Test users** page, add your own Google email address so you can test the application while it's in the "Testing" publishing status.
8. Click **Save and Continue**, then review the summary and return to the dashboard.

## 3. Create OAuth 2.0 Credentials

Now, generate the actual Client ID and Client Secret.

1. In the left sidebar, click **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top of the screen and select **OAuth client ID**.
3. Under **Application type**, select **Web application**.
4. Name the client (e.g., "SkillsSphere Web Client").
5. Under **Authorized JavaScript origins**, click **+ ADD URI**. 
   - Add your frontend URL. For local development, this is:
     `http://localhost:5173`
6. Under **Authorized redirect URIs**, click **+ ADD URI**.
   - Add your backend callback URL. For local development, this is EXACTLY:
     `http://localhost:5000/api/auth/google/callback`
7. Click **Create**.
8. A modal will appear displaying your **Client ID** and **Client Secret**. Copy these values.

---

## 4. Environment Variables Configuration

Open the `.env` file in the root directory of the project and update the following variables with the credentials you just generated.

```env
# Required for OAuth security
JWT_SECRET=generate_a_long_secure_random_string
JWT_EXPIRES_IN=7d

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_copied_client_id_here
GOOGLE_CLIENT_SECRET=your_copied_client_secret_here

# URLs matching your GCP Credentials
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

> **Important**: Ensure `FRONTEND_URL` is set to `http://localhost:5173` and not `5174`, or you will encounter CORS/redirect mismatch errors.

## 5. Restart the Application

Any changes to the `.env` files require restarting the development servers.

```bash
# Stop any running processes, then restart:
npm run dev
```

## Troubleshooting & Flow Summary

If you encounter errors during login, verify the flow:

1. **Initiation**: The frontend calls `/api/auth/google/url`. The backend replies with the secure Google login URL.
2. **Consent**: The user signs in via Google.
3. **Callback**: Google redirects the user to the backend `GOOGLE_CALLBACK_URL` (`http://localhost:5000/api/auth/google/callback`).
4. **Token Generation**: The backend validates the code, queries Google for user profile data, generates a JWT, and sets it as a secure HTTP-only cookie.
5. **Final Redirect**: The backend redirects the user to the `FRONTEND_URL` (`http://localhost:5173`).

**Common Errors:**
- `redirect_uri_mismatch`: The URI you placed in `GOOGLE_CALLBACK_URL` does not exactly match the URI placed in the Google Cloud Console "Authorized redirect URIs". They must be identical, character for character.
- `invalid_client`: Your Client ID or Secret is incorrect or missing from the `.env` file.
