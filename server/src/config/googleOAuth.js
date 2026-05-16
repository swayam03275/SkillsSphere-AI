const DEFAULT_CALLBACK_PATH = "/api/auth/google/callback";

export const getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const port = process.env.PORT || 5000;
  const redirectUri =
    process.env.GOOGLE_CALLBACK_URL?.trim() ||
    `http://localhost:${port}${DEFAULT_CALLBACK_PATH}`;

  return { clientId, clientSecret, redirectUri };
};

export const isGoogleOAuthConfigured = () => {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  return Boolean(clientId && clientSecret && redirectUri);
};

export const GOOGLE_OAUTH_NOT_CONFIGURED_MESSAGE =
  "Google Sign-In is not configured on the server. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL to server/.env, then restart the backend.";

export const buildGoogleAuthUrl = ({ state }) => {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email profile",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
