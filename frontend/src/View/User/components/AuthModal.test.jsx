import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthModal from './AuthModal';

const signedInUser = {
  id: 1,
  fullName: 'Asha Rao',
  email: 'asha@example.com',
  mobile: '9876543210',
  authType: 'normal',
  avatarUrl: '',
  role: 'customer',
};

function mockFetch(status, payload) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });
}

function respond(status, payload) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) });
}

// Routes fetch by method + path suffix, for tests that exercise more than one endpoint.
function mockRoutedFetch(routes) {
  global.fetch = jest.fn((url, options = {}) => {
    const method = options.method || 'GET';
    const match = routes.find((route) => route.method === method && String(url).endsWith(route.path));

    if (!match) {
      return Promise.reject(new Error(`unexpected request: ${method} ${url}`));
    }

    return respond(match.status ?? 200, match.payload);
  });
}

function renderModal(props = {}) {
  const handlers = {
    onAuthenticated: jest.fn(),
    onClose: jest.fn(),
    onLogout: jest.fn(),
    onNavigate: jest.fn(),
    onProfileUpdated: jest.fn(),
  };
  render(<AuthModal isOpen user={null} {...handlers} {...props} />);
  return handlers;
}

afterEach(() => {
  delete global.fetch;
});

test('logs in with email or mobile and password through the api', async () => {
  mockFetch(200, { token: 'signed-token', user: signedInUser });
  const { onAuthenticated, onClose } = renderModal();

  fireEvent.change(screen.getByLabelText(/email or mobile/i), { target: { value: 'asha@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

  await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(signedInUser, 'signed-token'));

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/v1\/auth\/login$/);
  expect(JSON.parse(options.body)).toEqual({ identity: 'asha@example.com', password: 'secret123' });
  expect(onClose).toHaveBeenCalled();
});

test('shows the server error and keeps the modal open when login fails', async () => {
  mockFetch(401, { error: 'Incorrect email/mobile or password.' });
  const { onAuthenticated, onClose } = renderModal();

  fireEvent.change(screen.getByLabelText(/email or mobile/i), { target: { value: 'asha@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'wrong-pass' } });
  fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email/mobile or password.');
  expect(onAuthenticated).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test('registers a new account with every field sent to the api', async () => {
  mockFetch(201, { token: 'new-token', user: signedInUser });
  const { onAuthenticated } = renderModal();

  fireEvent.click(screen.getByRole('tab', { name: /register/i }));

  const values = {
    'Full Name': 'Asha Rao',
    Mobile: '9876543210',
    Email: 'asha@example.com',
    'Delivery Address': '12 MG Road',
    State: 'Assam',
    City: 'Guwahati',
    PinCode: '781001',
    Password: 'secret123',
  };
  Object.entries(values).forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(new RegExp(`^${label}$`, 'i')), { target: { value } });
  });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));

  await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(signedInUser, 'new-token'));

  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toMatch(/\/api\/v1\/auth\/register$/);
  expect(JSON.parse(options.body)).toEqual({
    fullName: 'Asha Rao',
    mobile: '9876543210',
    email: 'asha@example.com',
    address: '12 MG Road',
    state: 'Assam',
    city: 'Guwahati',
    pincode: '781001',
    password: 'secret123',
    gst: '',
  });
});

test('shows the signed in account and logs out', async () => {
  mockFetch(200, { items: [] });
  const { onLogout, onClose } = renderModal({ user: signedInUser });

  expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  expect(screen.getByText(/signed in with email and password/i)).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: /register/i })).not.toBeInTheDocument();

  await waitFor(() => expect(screen.queryByText(/loading addresses/i)).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: /log out/i }));

  expect(onLogout).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
});

test('edits the profile name and gst number through the api', async () => {
  const updatedUser = { ...signedInUser, fullName: 'Asha K Rao', gst: '22AAAAA0000A1Z5' };
  mockRoutedFetch([
    { method: 'GET', path: '/api/v1/account/addresses', payload: { items: [] } },
    { method: 'PUT', path: '/api/v1/auth/profile', payload: { user: updatedUser } },
  ]);
  const { onProfileUpdated } = renderModal({ user: signedInUser });

  await waitFor(() => expect(screen.queryByText(/loading addresses/i)).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Asha K Rao' } });
  fireEvent.change(screen.getByLabelText(/gst number/i), { target: { value: '22AAAAA0000A1Z5' } });
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

  await waitFor(() => expect(onProfileUpdated).toHaveBeenCalledWith(updatedUser));

  const profileCall = global.fetch.mock.calls.find(([url]) => String(url).endsWith('/api/v1/auth/profile'));
  expect(JSON.parse(profileCall[1].body)).toEqual({ fullName: 'Asha K Rao', gst: '22AAAAA0000A1Z5' });
});

test('adds a new address from the account modal', async () => {
  const newAddress = {
    id: 9,
    fullName: 'Asha Rao',
    mobile: '9876543210',
    addressLine1: '12 MG Road',
    city: 'Guwahati',
    state: 'Assam',
    pincode: '781001',
    country: 'India',
    isDefault: true,
  };
  mockRoutedFetch([
    { method: 'GET', path: '/api/v1/account/addresses', payload: { items: [] } },
    { method: 'POST', path: '/api/v1/account/addresses', payload: newAddress },
  ]);
  renderModal({ user: signedInUser });

  await waitFor(() => expect(screen.queryByText(/loading addresses/i)).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: /add a new address/i }));
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Asha Rao' } });
  fireEvent.change(screen.getByLabelText(/^mobile$/i), { target: { value: '9876543210' } });
  fireEvent.change(screen.getByLabelText(/delivery address/i), { target: { value: '12 MG Road' } });
  fireEvent.change(screen.getByLabelText(/^state$/i), { target: { value: 'Assam' } });
  fireEvent.change(screen.getByLabelText(/^city$/i), { target: { value: 'Guwahati' } });
  fireEvent.change(screen.getByLabelText(/pincode/i), { target: { value: '781001' } });
  fireEvent.click(screen.getByRole('button', { name: /^add address$/i }));

  expect(await screen.findByText(/12 MG Road/i)).toBeInTheDocument();
});

test('deletes the account after confirming the current password', async () => {
  mockRoutedFetch([
    { method: 'GET', path: '/api/v1/account/addresses', payload: { items: [] } },
    { method: 'DELETE', path: '/api/v1/auth/account', payload: { status: 'ok' } },
  ]);
  const { onLogout, onClose } = renderModal({ user: signedInUser });

  await waitFor(() => expect(screen.queryByText(/loading addresses/i)).not.toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: /delete my account/i }));
  fireEvent.change(screen.getByLabelText(/confirm your password/i), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: /yes, delete my account/i }));

  await waitFor(() => expect(onLogout).toHaveBeenCalled());
  expect(onClose).toHaveBeenCalled();

  const deleteCall = global.fetch.mock.calls.find(([url]) => String(url).endsWith('/api/v1/auth/account'));
  expect(JSON.parse(deleteCall[1].body)).toEqual({ password: 'secret123' });
});
