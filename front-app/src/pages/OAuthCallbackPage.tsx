import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveTokens } from '../lib/auth-api';

export function OAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken) {
      saveTokens({ access_token: accessToken, refresh_token: refreshToken ?? undefined });
      navigate('/home', { replace: true });
    } else {
      navigate('/login?error=oauth_failed', { replace: true });
    }
  }, [navigate]);

  return null;
}
