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

function renderModal(props = {}) {
  const handlers = { onAuthenticated: jest.fn(), onClose: jest.fn(), onLogout: jest.fn() };
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

test('shows the signed in account and logs out', () => {
  const { onLogout, onClose } = renderModal({ user: signedInUser });

  expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  expect(screen.getByText(/signed in with email and password/i)).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: /register/i })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /log out/i }));

  expect(onLogout).toHaveBeenCalled();
  expect(onClose).toHaveBeenCalled();
});
