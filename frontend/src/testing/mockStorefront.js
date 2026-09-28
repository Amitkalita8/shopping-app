import { storeToken } from '../View/User/authApi';
import fixture from './storefront.fixture.json';

export const mockSignedInUser = {
  id: 1,
  fullName: 'Asha Rao',
  email: 'asha@example.com',
  mobile: '9876543210',
  authType: 'normal',
  avatarUrl: '',
  role: 'customer',
};

// A copy of the fixture, so a test can change data without affecting the others.
export function cloneStorefront() {
  return JSON.parse(JSON.stringify(fixture));
}

function respond(status, payload) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) });
}

// Answers the storefront request the way the backend does. Any other request fails,
// so a test notices if the app starts calling something it did not mock.
export function mockStorefrontApi(bundle = cloneStorefront()) {
  global.fetch = jest.fn((url) => {
    if (String(url).endsWith('/api/v1/storefront')) {
      return respond(200, bundle);
    }

    return Promise.reject(new Error(`unexpected request: ${url}`));
  });
}

// Same as mockStorefrontApi, but also answers as a signed-in customer with an in-memory cart and
// wishlist, the way the database-backed API does, so tests can exercise the real add/remove flow.
export function mockSignedInStorefrontApi(bundle = cloneStorefront(), user = mockSignedInUser) {
  let cartItems = [];
  let wishlistItems = [];

  global.fetch = jest.fn((url, options = {}) => {
    const address = String(url);
    const method = options.method || 'GET';

    if (address.endsWith('/api/v1/storefront')) {
      return respond(200, bundle);
    }
    if (address.endsWith('/api/v1/auth/me')) {
      return respond(200, { user });
    }
    if (address.endsWith('/api/v1/cart') && method === 'GET') {
      return respond(200, { items: cartItems });
    }
    if (address.endsWith('/api/v1/cart/items') && method === 'POST') {
      const body = JSON.parse(options.body);
      const quantity = body.quantity ?? 1;
      const existing = cartItems.find((item) => item.productId === body.productId);

      if (existing) {
        existing.quantity += quantity;
      } else {
        cartItems.push({ productId: body.productId, quantity, unitPrice: 0 });
      }

      return respond(200, { items: cartItems });
    }

    const cartItemMatch = address.match(/\/api\/v1\/cart\/items\/([^/]+)$/);
    if (cartItemMatch && method === 'PUT') {
      const productId = decodeURIComponent(cartItemMatch[1]);
      const body = JSON.parse(options.body);
      const existing = cartItems.find((item) => item.productId === productId);
      if (existing) {
        existing.quantity = body.quantity;
      }

      return respond(200, { items: cartItems });
    }
    if (cartItemMatch && method === 'DELETE') {
      const productId = decodeURIComponent(cartItemMatch[1]);
      cartItems = cartItems.filter((item) => item.productId !== productId);
      return respond(200, { items: cartItems });
    }

    if (address.endsWith('/api/v1/wishlist') && method === 'GET') {
      return respond(200, { items: wishlistItems });
    }
    if (address.endsWith('/api/v1/wishlist') && method === 'POST') {
      const body = JSON.parse(options.body);
      if (!wishlistItems.includes(body.productId)) {
        wishlistItems = [body.productId, ...wishlistItems];
      }

      return respond(200, { items: wishlistItems });
    }

    const wishlistItemMatch = address.match(/\/api\/v1\/wishlist\/([^/]+)$/);
    if (wishlistItemMatch && method === 'DELETE') {
      const productId = decodeURIComponent(wishlistItemMatch[1]);
      wishlistItems = wishlistItems.filter((id) => id !== productId);
      return respond(200, { items: wishlistItems });
    }

    return Promise.reject(new Error(`unexpected request: ${method} ${address}`));
  });

  storeToken('test-token');
}
