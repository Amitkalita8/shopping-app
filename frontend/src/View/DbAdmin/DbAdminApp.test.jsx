import { fireEvent, render, screen } from '@testing-library/react';
import DbAdminApp from './DbAdminApp';

const TOKEN_KEY = 'shop-db-admin-token';

function json(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

function mockApi(routes) {
  global.fetch = jest.fn((url, options = {}) => {
    const path = new URL(url).pathname;
    const handler = routes[path];
    return handler ? handler(url, options) : json({ error: 'not found' }, 404);
  });
}

const tablesRoute = () => json({ tables: [{ name: 'users', rows: 2 }, { name: 'products', rows: 12 }] });

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/db-admin');
});

afterEach(() => {
  delete global.fetch;
});

test('shows the username and password sign-in when there is no session', () => {
  mockApi({});
  render(<DbAdminApp />);

  expect(screen.getByLabelText('Username')).toHaveValue('root');
  expect(screen.getByLabelText('Password')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('signing in as root opens the table list', async () => {
  mockApi({
    '/api/v1/admin/db/login': (url, options) => {
      const body = JSON.parse(options.body);
      return body.username === 'root' && body.password === 'Ak123456.'
        ? json({ token: 'dbadmin.1.sig', user: { username: 'root' } })
        : json({ error: 'Incorrect username or password.' }, 401);
    },
    '/api/v1/admin/db/tables': tablesRoute,
  });
  render(<DbAdminApp />);

  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password.');

  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Ak123456.' } });
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));

  expect(await screen.findByText('2 tables · 14 rows')).toBeInTheDocument();
  expect(screen.getByText('User: root')).toBeInTheDocument();
  expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe('dbadmin.1.sig');
});

test('a saved session opens the table browser from the address', async () => {
  window.sessionStorage.setItem(TOKEN_KEY, 'dbadmin.1.sig');
  window.history.replaceState({}, '', '/db-admin?route=/table/browse&table=users');

  mockApi({
    '/api/v1/admin/db/tables': tablesRoute,
    '/api/v1/admin/db/tables/users': () =>
      json({
        table: 'users',
        columns: [
          { name: 'id', type: 'bigint', primaryKey: true, masked: false },
          { name: 'email', type: 'text', primaryKey: false, masked: false },
          { name: 'password_hash', type: 'text', primaryKey: false, masked: true },
          { name: 'gst', type: 'text', primaryKey: false, masked: false },
        ],
        rows: [['1', 'owner@example.com', '••••••', null]],
        total: 1,
        page: 1,
        perPage: 25,
        sort: 'id',
        desc: false,
      }),
  });

  render(<DbAdminApp />);

  expect(await screen.findByText('Showing rows 1–1 of 1')).toBeInTheDocument();
  expect(screen.getByText('owner@example.com')).toBeInTheDocument();
  expect(screen.getByText('••••••')).toBeInTheDocument();
  expect(screen.getByText('NULL')).toBeInTheDocument();

  const browseCall = global.fetch.mock.calls.find(([url]) => url.includes('/admin/db/tables/users'));
  expect(browseCall[1].headers.Authorization).toBe('Bearer dbadmin.1.sig');
});

test('an expired session goes back to the sign-in form', async () => {
  window.sessionStorage.setItem(TOKEN_KEY, 'dbadmin.1.old');
  mockApi({ '/api/v1/admin/db/tables': () => json({ error: 'Please sign in.' }, 401) });

  render(<DbAdminApp />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/session has ended/i);
  expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
});
