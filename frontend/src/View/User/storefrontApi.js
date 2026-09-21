import { API_BASE_URL } from '../../apiBase';

export async function fetchStorefront() {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/storefront`);
  } catch {
    throw new Error('Could not reach the server.');
  }

  if (!response.ok) {
    throw new Error(`The store data could not be loaded (${response.status}).`);
  }

  return response.json();
}
