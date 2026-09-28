import { API_BASE_URL } from '../../apiBase';

async function request(path, { method = 'GET', body, token } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/wishlist${path}`, {
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

export const fetchWishlist = (token) => request('', { token });

export const addToWishlist = (token, productId) => request('', { method: 'POST', body: { productId }, token });

export const removeFromWishlist = (token, productId) =>
  request(`/${encodeURIComponent(productId)}`, { method: 'DELETE', token });
