import fixture from './storefront.fixture.json';

// A copy of the fixture, so a test can change data without affecting the others.
export function cloneStorefront() {
  return JSON.parse(JSON.stringify(fixture));
}

// Answers the storefront request the way the backend does. Any other request fails,
// so a test notices if the app starts calling something it did not mock.
export function mockStorefrontApi(bundle = cloneStorefront()) {
  global.fetch = jest.fn((url) => {
    if (String(url).endsWith('/api/v1/storefront')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(bundle) });
    }

    return Promise.reject(new Error(`unexpected request: ${url}`));
  });
}
