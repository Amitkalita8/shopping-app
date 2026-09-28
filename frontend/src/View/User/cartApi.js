import { API_BASE_URL } from '../../apiBase';

async function request(path, { method = 'GET', body, token } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/cart${path}`, {
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

export const fetchCart = (token) => request('', { token });

export const addCartItem = (token, productId, quantity = 1) =>
  request('/items', { method: 'POST', body: { productId, quantity }, token });

export const updateCartItemQuantity = (token, productId, quantity) =>
  request(`/items/${encodeURIComponent(productId)}`, { method: 'PUT', body: { quantity }, token });

export const removeCartItem = (token, productId) =>
  request(`/items/${encodeURIComponent(productId)}`, { method: 'DELETE', token });
