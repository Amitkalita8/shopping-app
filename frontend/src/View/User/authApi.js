import { API_BASE_URL } from '../../apiBase';

const TOKEN_STORAGE_KEY = 'atelier-auth-token';

export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID ?? '';

export function getStoredToken() {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeToken(token) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable (private windows); the session then lasts until reload.
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Please try again.');
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const registerAccount = (fields) => request('/register', { method: 'POST', body: fields });

export const loginWithPassword = (identity, password) =>
  request('/login', { method: 'POST', body: { identity, password } });

export const loginWithGoogle = (credential) => request('/google', { method: 'POST', body: { credential } });

export const fetchCurrentUser = (token) => request('/me', { token });
