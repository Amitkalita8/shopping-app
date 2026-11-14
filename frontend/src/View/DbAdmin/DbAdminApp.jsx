import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './DbAdminApp.css';
import {
  browseTable,
  fetchColumns,
  fetchTables,
  getDbAdminToken,
  loginToDbAdmin,
  runQuery,
  SignedOutError,
  storeDbAdminToken,
} from './dbAdminApi';

// Read-only database browser for admins, at /db-admin.
// The page state lives in the address, e.g. /db-admin?route=/table/browse&table=users,
// so links can be shared and the back button works.

const PER_PAGE_OPTIONS = [10, 25, 50, 100, 200];
const NUMERIC_TYPE = /^(smallint|integer|bigint|numeric|real|double precision|decimal)/;
const formatNumber = (n) => Number(n).toLocaleString();

function defaultSql(table) {
  return table
    ? `SELECT * FROM "${table.replace(/"/g, '""')}" LIMIT 50;`
    : 'SELECT * FROM users ORDER BY id DESC LIMIT 50;';
}

function readParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

function toSearch(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

// Follows the query string, including changes from the back and forward buttons.
function useQueryParams() {
  const [params, setParams] = useState(readParams);

  useEffect(() => {
    const sync = () => setParams(readParams());
    window.addEventListener('popstate', sync);
    window.addEventListener('app-route-change', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('app-route-change', sync);
    };
  }, []);

  const go = useCallback((next, { replace = false } = {}) => {
    const url = `${window.location.pathname}${toSearch(next)}`;
    if (replace) window.history.replaceState({}, '', url);
    else window.history.pushState({}, '', url);
    setParams(readParams());
  }, []);

  return [params, go];
}

// A link that changes the page without reloading, while still opening in a new tab on Ctrl+click.
function NavLink({ to, go, className, children, title }) {
  return (
    <a
      href={toSearch(to) || '?'}
      className={className}
      title={title}
      onClick={(event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
        event.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

function Cell({ value, column }) {
  if (value === null) {
    return (
      <td>
        <span className="dba-null">NULL</span>
      </td>
    );
  }
  if (column?.masked) {
    return (
      <td>
        <span className="dba-masked" title="Hidden">
          {value}
        </span>
      </td>
    );
  }
  const numeric = column && NUMERIC_TYPE.test(column.type);
  return (
    <td className={numeric ? 'dba-num' : undefined} title={value.length > 40 ? value : undefined}>
      {value}
    </td>
  );
}

// ---------- Sign in ----------

function LoginCard({ onSignedIn, initialError }) {
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError || '');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter the username and password.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const session = await loginToDbAdmin(username.trim(), password);
      storeDbAdminToken(session.token);
      onSignedIn(session.token, session.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dba-login-wrap">
      <form className="dba-login" onSubmit={submit} noValidate>
        <div className="dba-login-head">
          <h1>
            Shop DB Admin <span className="dba-badge">read-only</span>
          </h1>
          <p>Shopping App Database Administration</p>
        </div>
        <div className="dba-login-body">
          <div className="dba-note">
            <strong>Who can sign in</strong>
            The database admin set on the server (<code>DB_ADMIN_USER</code> and <code>DB_ADMIN_PASSWORD</code>).
          </div>
          {error ? (
            <div className="dba-error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="dba-field">
            <label htmlFor="dba-server">Server choice</label>
            <select id="dba-server" disabled>
              <option>PostgreSQL - shopping app</option>
            </select>
          </div>
          <div className="dba-field">
            <label htmlFor="dba-username">Username</label>
            <input
              id="dba-username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="dba-field">
            <label htmlFor="dba-password">Password</label>
            <input
              id="dba-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="dba-primary" type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'} <span aria-hidden="true">→</span>
          </button>
          <div className="dba-login-foot">
            <span>Data is shown read-only; secrets are hidden.</span>
            <span>Database: PostgreSQL</span>
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------- Shared pieces ----------

function Crumbs({ go, table, extra }) {
  return (
    <div className="dba-crumbs">
      <NavLink to={{ route: '/' }} go={go}>
        Server: PostgreSQL
      </NavLink>
      <span>›</span>
      <NavLink to={{ route: '/' }} go={go}>
        Database: public
      </NavLink>
      {table ? (
        <>
          <span>›</span>
          <NavLink to={{ route: '/table/browse', table }} go={go}>
            Table: {table}
          </NavLink>
        </>
      ) : null}
      {extra ? (
        <>
          <span>›</span>
          <span>{extra}</span>
        </>
      ) : null}
    </div>
  );
}

function Tabs({ go, table, active }) {
  const list = table
    ? [
        ['Browse', '/table/browse'],
        ['Structure', '/table/structure'],
        ['SQL', '/sql'],
      ]
    : [
        ['Tables', '/'],
        ['SQL', '/sql'],
      ];

  return (
    <div className="dba-tabs" role="tablist">
      {list.map(([label, route]) => (
        <NavLink key={route} to={{ route, table }} go={go} className={route === active ? 'active' : undefined}>
          {label}
        </NavLink>
      ))}
    </div>
  );
}

// ---------- Views ----------

function HomeView({ go, tables }) {
  const total = tables.reduce((sum, t) => sum + Number(t.rows), 0);
  return (
    <>
      <Crumbs go={go} />
      <Tabs go={go} active="/" />
      <h2 className="dba-h2">
        {tables.length} tables · {formatNumber(total)} rows
      </h2>
      {tables.length ? (
        <div className="dba-cards">
          {tables.map((t) => (
            <NavLink key={t.name} to={{ route: '/table/browse', table: t.name }} go={go} className="dba-card">
              <div className="dba-card-name">{t.name}</div>
              <div className="dba-card-rows">
                {formatNumber(t.rows)} {Number(t.rows) === 1 ? 'row' : 'rows'}
              </div>
            </NavLink>
          ))}
        </div>
      ) : (
        <div className="dba-panel dba-empty">No tables yet. Start the backend with a database and it creates them.</div>
      )}
    </>
  );
}

function BrowseView({ go, token, params, onSignedOut }) {
  const table = params.table;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage)) ? Number(params.perPage) : 25;
  const dir = params.dir === 'desc' ? 'desc' : 'asc';
  const sort = params.sort || '';
  const search = params.search || '';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState(search);
  const timer = useRef();

  useEffect(() => setSearchText(search), [search, table]);

  useEffect(() => {
    let cancelled = false;
    setError('');
    browseTable(token, table, { page, perPage, sort, dir, search })
      .then((result) => !cancelled && setData(result))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SignedOutError) onSignedOut(err.message);
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token, table, page, perPage, sort, dir, search, onSignedOut]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const state = { route: '/table/browse', table, page, perPage, sort: data?.sort || sort, dir, search };

  function onSearch(value) {
    setSearchText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ ...state, search: value.trim(), page: 1 }, { replace: true }), 350);
  }

  const current = data && data.table === table ? data : null;
  const pages = current ? Math.max(1, Math.ceil(current.total / current.perPage)) : 1;
  const first = current && current.total ? (current.page - 1) * current.perPage + 1 : 0;
  const last = current ? Math.min(current.total, current.page * current.perPage) : 0;

  return (
    <>
      <Crumbs go={go} table={table} />
      <Tabs go={go} table={table} active="/table/browse" />
      {error ? <div className="dba-error">{error}</div> : null}
      <div className="dba-toolbar">
        <input
          type="search"
          value={searchText}
          placeholder="Search all columns…"
          aria-label="Search rows"
          onChange={(e) => onSearch(e.target.value)}
        />
        <select
          aria-label="Rows per page"
          value={perPage}
          onChange={(e) => go({ ...state, perPage: e.target.value, page: 1 })}
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} rows
            </option>
          ))}
        </select>
        <span className="dba-grow" />
        {current ? (
          <>
            <span className="dba-info">
              {current.total
                ? `Showing rows ${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(current.total)}`
                : '0 rows'}
            </span>
            <button
              className="dba-btn"
              type="button"
              disabled={current.page <= 1}
              onClick={() => go({ ...state, page: current.page - 1 })}
            >
              ‹ Prev
            </button>
            <span className="dba-info">
              Page {formatNumber(current.page)} of {formatNumber(pages)}
            </span>
            <button
              className="dba-btn"
              type="button"
              disabled={current.page >= pages}
              onClick={() => go({ ...state, page: current.page + 1 })}
            >
              Next ›
            </button>
          </>
        ) : null}
      </div>
      {!current && !error ? <div className="dba-loading">Loading…</div> : null}
      {current ? (
        <div className="dba-grid-wrap">
          <table className="dba-grid">
            <thead>
              <tr>
                {current.columns.map((c) => {
                  const active = c.name === current.sort;
                  const nextDir = active && dir === 'asc' ? 'desc' : 'asc';
                  return (
                    <th key={c.name} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      <button
                        type="button"
                        title={c.type}
                        onClick={() => go({ ...state, sort: c.name, dir: nextDir, page: 1 })}
                      >
                        {c.name}
                        {c.primaryKey ? <span className="dba-pk">PK</span> : null}
                        {active ? <span className="dba-arrow">{dir === 'asc' ? '▲' : '▼'}</span> : null}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {current.rows.length ? (
                current.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((value, i) => (
                      <Cell key={i} value={value} column={current.columns[i]} />
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="dba-empty" colSpan={current.columns.length}>
                    {search ? 'No rows match your search.' : 'This table is empty.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

function StructureView({ go, token, table, onSignedOut }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    fetchColumns(token, table)
      .then((result) => !cancelled && setData(result))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SignedOutError) onSignedOut(err.message);
        else setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token, table, onSignedOut]);

  return (
    <>
      <Crumbs go={go} table={table} extra="Structure" />
      <Tabs go={go} table={table} active="/table/structure" />
      {error ? <div className="dba-error">{error}</div> : null}
      {!data && !error ? <div className="dba-loading">Loading…</div> : null}
      {data ? (
        <div className="dba-grid-wrap">
          <table className="dba-grid">
            <thead>
              <tr>
                {['#', 'Name', 'Type', 'Null', 'Default', 'Key', 'Notes'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.columns.map((c, i) => (
                <tr key={c.name}>
                  <td className="dba-num">{i + 1}</td>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="dba-mono">{c.type}</td>
                  <td>{c.nullable ? 'Yes' : 'No'}</td>
                  {c.default === null ? (
                    <td>
                      <span className="dba-null">None</span>
                    </td>
                  ) : (
                    <td className="dba-mono" title={c.default}>
                      {c.default}
                    </td>
                  )}
                  <td>{c.primaryKey ? <span className="dba-pk">PRIMARY</span> : null}</td>
                  <td>{c.masked ? <span className="dba-tag">hidden on this page</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

function SqlView({ go, token, table, onSignedOut, sql, setSql }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function execute() {
    setBusy(true);
    setError('');
    try {
      setResult(await runQuery(token, sql));
    } catch (err) {
      if (err instanceof SignedOutError) onSignedOut(err.message);
      else {
        setResult(null);
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Crumbs go={go} table={table} extra="SQL" />
      <Tabs go={go} table={table} active="/sql" />
      <textarea
        className="dba-sql dba-mono"
        spellCheck="false"
        aria-label="SQL query"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            execute();
          }
        }}
      />
      <p className="dba-hint">
        Read-only: one statement at a time, stopped after 5 seconds, first 500 rows shown. Ctrl+Enter runs it.
      </p>
      <div className="dba-toolbar">
        <button className="dba-btn dba-blue" type="button" disabled={busy} onClick={execute}>
          {busy ? 'Running…' : 'Run query'}
        </button>
        {result ? (
          <span className="dba-info">
            {formatNumber(result.rows.length)} row{result.rows.length === 1 ? '' : 's'}
            {result.truncated ? ' (first 500 shown)' : ''} · {result.elapsedMs} ms
          </span>
        ) : null}
      </div>
      {error ? <div className="dba-error">{error}</div> : null}
      {result && result.columns.length ? (
        <div className="dba-grid-wrap">
          <table className="dba-grid">
            <thead>
              <tr>
                {result.columns.map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.length ? (
                result.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((value, i) => (
                      <Cell key={i} value={value} />
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="dba-empty" colSpan={result.columns.length}>
                    No rows.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {result && !result.columns.length ? <div className="dba-panel dba-empty">{result.command || 'Done.'}</div> : null}
    </>
  );
}

// ---------- Page ----------

export default function DbAdminApp() {
  const [params, go] = useQueryParams();
  const [token, setToken] = useState(getDbAdminToken);
  const [user, setUser] = useState(null);
  // A saved token is checked by the first data request; a 401 there shows the sign-in form.
  const [phase, setPhase] = useState(token ? 'ready' : 'login');
  const [loginMessage, setLoginMessage] = useState('');
  const [tables, setTables] = useState([]);
  const [tablesError, setTablesError] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  // Kept here, not in the SQL tab, so a query survives switching tabs.
  const [sql, setSql] = useState(() => defaultSql(readParams().table));

  const signOut = useCallback((message) => {
    storeDbAdminToken('');
    setToken('');
    setUser(null);
    setTables([]);
    setLoginMessage(message || '');
    setPhase('login');
  }, []);

  useEffect(() => {
    if (phase !== 'ready') return undefined;
    let cancelled = false;
    fetchTables(token)
      .then((result) => {
        if (!cancelled) {
          setTables(result.tables);
          setTablesError('');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SignedOutError) signOut('Your session has ended. Please log in again.');
        else if (err.status === 403) signOut('This login does not have access.');
        else setTablesError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [phase, token, signOut]);

  const route = params.route || '/';
  const table = params.table || '';

  useEffect(() => {
    document.title = `${table ? `${table} · ` : ''}Shop DB Admin`;
  }, [table]);

  const navigate = useCallback(
    (next, options) => {
      setMenuOpen(false);
      go(next, options);
    },
    [go],
  );

  const sessionEnded = useCallback(() => signOut('Your session has ended. Please log in again.'), [signOut]);

  const visibleTables = useMemo(() => {
    const filter = tableFilter.trim().toLowerCase();
    return filter ? tables.filter((t) => t.name.toLowerCase().includes(filter)) : tables;
  }, [tables, tableFilter]);

  if (phase === 'login') {
    return (
      <div className="dbadmin">
        <LoginCard
          key={loginMessage}
          initialError={loginMessage}
          onSignedIn={(newToken, newUser) => {
            setToken(newToken);
            setUser(newUser);
            setLoginMessage('');
            setPhase('ready');
          }}
        />
      </div>
    );
  }

  let view;
  if (route === '/table/browse' && table) {
    view = <BrowseView go={navigate} token={token} params={params} onSignedOut={sessionEnded} />;
  } else if (route === '/table/structure' && table) {
    view = <StructureView go={navigate} token={token} table={table} onSignedOut={sessionEnded} />;
  } else if (route === '/sql') {
    view = <SqlView go={navigate} token={token} table={table} onSignedOut={sessionEnded} sql={sql} setSql={setSql} />;
  } else {
    view = <HomeView go={navigate} tables={tables} />;
  }

  return (
    <div className="dbadmin dba-app">
      <header className="dba-topbar">
        <button className="dba-ghost dba-menu-btn" type="button" aria-label="Show tables" onClick={() => setMenuOpen((open) => !open)}>
          ☰
        </button>
        <NavLink to={{ route: '/' }} go={navigate} className="dba-brand">
          Shop DB Admin <span className="dba-badge">read-only</span>
        </NavLink>
        <span className="dba-server">Server: PostgreSQL</span>
        <span className="dba-spacer" />
        <span className="dba-who">{user?.username ? `User: ${user.username}` : 'Signed in'}</span>
        <button className="dba-ghost" type="button" onClick={() => signOut()}>
          Log out
        </button>
      </header>
      <div className="dba-body">
        <nav className={`dba-sidebar${menuOpen ? ' open' : ''}`} aria-label="Tables">
          <div className="dba-db">
            🗄 Tables <span className="dba-tag">{tables.length}</span>
          </div>
          <input
            type="search"
            placeholder="Filter tables…"
            aria-label="Filter tables"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          />
          <ul className="dba-tables">
            {visibleTables.map((t) => (
              <li key={t.name}>
                <NavLink
                  to={{ route: '/table/browse', table: t.name }}
                  go={navigate}
                  className={t.name === table ? 'active' : undefined}
                >
                  <span>{t.name}</span>
                  <span className="dba-count">{formatNumber(t.rows)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main className="dba-main">
          {tablesError ? <div className="dba-error">{tablesError}</div> : null}
          {view}
        </main>
      </div>
    </div>
  );
}
