import { API_BASE_URL } from '../../apiBase';

async function request(path, { method = 'GET', body, token } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/account/addresses${path}`, {
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

export const fetchAddresses = (token) => request('', { token });

export const createAddress = (token, fields) => request('', { method: 'POST', body: fields, token });

export const updateAddress = (token, id, fields) => request(`/${id}`, { method: 'PUT', body: fields, token });

export const deleteAddress = (token, id) => request(`/${id}`, { method: 'DELETE', token });

export const setDefaultAddress = (token, id) => request(`/${id}/default`, { method: 'PUT', token });
