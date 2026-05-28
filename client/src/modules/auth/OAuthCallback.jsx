import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setOAuthData } from '../../features/auth/authSlice';
import { useToast } from '../../shared/components';
import { API_URL } from "../../config/env";

const OAuthCallback = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const error = params.get('error');

    // Purge sensitive params from URL immediately
    if (window.history.replaceState) {
      window.history.replaceState(null, '', '/auth/callback');
    }

    if (error) {
      showError(decodeURIComponent(error));
      navigate('/login', { replace: true });
      return;
    }

    if (!code) {
      showError('No authorization code received');
      navigate('/login', { replace: true });
      return;
    }

    const exchangeCode = async () => {
      try {
        const exchangeRes = await fetch(`${API_URL}/api/auth/exchange-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const exchangeData = await exchangeRes.json();

        if (!exchangeData.success || !exchangeData.token) {
          throw new Error(exchangeData.message || 'Failed to exchange authorization code');
        }

        const { token, user } = exchangeData;

        dispatch(setOAuthData({ token, user, rememberMe: true }));
        success(`Welcome ${user.name}!`);
        const fallbackPath = '/dashboard';
        const redirectTo = sessionStorage.getItem('oauth_redirect') || fallbackPath;
        sessionStorage.removeItem('oauth_redirect');
        navigate(redirectTo, { replace: true });
      } catch (err) {
        console.error(err);
        showError('Could not complete login. Please try again.');
        navigate('/login', { replace: true });
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