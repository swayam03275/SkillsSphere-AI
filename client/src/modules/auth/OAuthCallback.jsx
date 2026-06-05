import { useEffect, useState, useRef, startTransition } from "react";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { API_URL } from "../../config/env";
import { setOAuthData } from "../../features/auth/authSlice";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../shared/components";
import { reportError } from "../../utils/errorReporter";

const OAUTH_ERROR_MESSAGE =
  "Authentication failed. Please try signing in again.";
const OAUTH_REDIRECT_FALLBACK = "/dashboard";

export const sanitizeOAuthRedirect = (redirectTo) => {
  if (typeof redirectTo !== "string") return OAUTH_REDIRECT_FALLBACK;

  const normalizedRedirect = redirectTo.trim();
  if (!normalizedRedirect) return OAUTH_REDIRECT_FALLBACK;
  if (!normalizedRedirect.startsWith("/")) return OAUTH_REDIRECT_FALLBACK;
  if (normalizedRedirect.startsWith("//")) return OAUTH_REDIRECT_FALLBACK;
  if (normalizedRedirect.includes("\\")) return OAUTH_REDIRECT_FALLBACK;

  try {
    decodeURI(normalizedRedirect);
  } catch {
    return OAUTH_REDIRECT_FALLBACK;
  }

  return normalizedRedirect;
};

const OAuthCallback = () => {
  useDocumentTitle("OAuth Callback");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const hasExchanged = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const error = params.get("error");

    // Purge sensitive params from URL immediately
    if (window.history.replaceState) {
      window.history.replaceState(null, "", "/auth/callback");
    }

    if (error) {
      const decodedError =
        typeof error === "string"
          ? decodeURIComponent(error)
          : OAUTH_ERROR_MESSAGE;

      reportError(new Error("OAuth provider returned an error"), {
        source: "auth",
        feature: "oauth-callback",
        providerError: decodedError,
      }).catch(() => {});
      showError(decodedError || OAUTH_ERROR_MESSAGE);
      startTransition(() => {
        navigate("/login", { replace: true });
      });
      return;
    }

    if (!code) {
      reportError(new Error("OAuth callback missing authorization code"), {
        source: "auth",
        feature: "oauth-callback",
      }).catch(() => {});
      showError(OAUTH_ERROR_MESSAGE);
      startTransition(() => {
        navigate("/login", { replace: true });
      });
      return;
    }

    if (hasExchanged.current) return;
    hasExchanged.current = true;

    const exchangeCode = async () => {
      try {
        const exchangeRes = await fetch(`${API_URL}/api/auth/exchange-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const exchangeData = await exchangeRes.json();

        if (!exchangeData.success || !exchangeData.token) {
          throw new Error("OAuth authorization code exchange failed");
        }

        const { token, user } = exchangeData;

        dispatch(setOAuthData({ token, user, rememberMe: true }));
        success(`Welcome ${user.name}!`);
        const redirectTo = sanitizeOAuthRedirect(
          sessionStorage.getItem("oauth_redirect"),
        );
        sessionStorage.removeItem("oauth_redirect");
        startTransition(() => {
          navigate(redirectTo, { replace: true });
        });
      } catch (err) {
        reportError(new Error("OAuth callback failed"), {
          source: "auth",
          feature: "oauth-callback",
          reason: err?.name || "exchange-failed",
        }).catch(() => {});
        showError(OAUTH_ERROR_MESSAGE);
        startTransition(() => {
          navigate("/login", { replace: true });
        });
      } finally {
        setLoading(false);
      }
    };

    exchangeCode();
  }, [dispatch, navigate, location, showError, success]);

  return (
    <div className="min-h-screen flex justify-center items-center bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <p className="mt-4 text-white">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
