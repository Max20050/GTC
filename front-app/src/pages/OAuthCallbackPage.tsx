import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveTokens } from '../lib/auth-api';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken) {
      saveTokens({ access_token: accessToken, refresh_token: refreshToken ?? undefined });
      navigate('/home', { replace: true });
    } else {
      navigate('/login?error=oauth_failed', { replace: true });
    }
  }, [search, navigate]);

  return null;
}
