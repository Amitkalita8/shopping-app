import { API_BASE_URL } from '../../apiBase';

// Thrown when the session is missing or has expired, so the page can show the sign-in form.
export class SignedOutError extends Error {}

async function request(token, path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/admin/db${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Is the backend running?');
  }

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && path !== '/login') {
    throw new SignedOutError(payload.error || 'Please sign in.');
  }

  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

// Signs in with the server's DB_ADMIN_USER / DB_ADMIN_PASSWORD and returns { token, user, expiresAt }.
export const loginToDbAdmin = (username, password) =>
  request('', '/login', { method: 'POST', body: { username, password } });

// The session lasts for this browser tab only, separate from the shop's sign-in.
const TOKEN_KEY = 'shop-db-admin-token';

export function getDbAdminToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeDbAdminToken(token) {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be unavailable (private windows); the session then lasts until reload.
  }
}

export const fetchTables = (token) => request(token, '/tables');

export const fetchColumns = (token, table) => request(token, `/tables/${encodeURIComponent(table)}/columns`);

export function browseTable(token, table, { page, perPage, sort, dir, search }) {
  const query = new URLSearchParams({ page: String(page), perPage: String(perPage), dir });
  if (sort) query.set('sort', sort);
  if (search) query.set('search', search);
  return request(token, `/tables/${encodeURIComponent(table)}?${query}`);
}

export const runQuery = (token, sql) => request(token, '/query', { method: 'POST', body: { sql } });
