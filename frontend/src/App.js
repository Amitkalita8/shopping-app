import { useEffect, useState } from 'react';
import './App.css';
import AdminApp from './View/Admin/AdminApp';
import DbAdminApp from './View/DbAdmin/DbAdminApp';
import { getCurrentPath as getAppPath } from './View/User/utils';
import StorefrontApp from './View/User/StorefrontApp';

function getCurrentPath() {
  return window.location.pathname || '/';
}

function AppRouter() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath);

  useEffect(() => {
    const syncPath = () => setCurrentPath(getCurrentPath());
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event('app-route-change'));
      return result;
    };

    window.history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('app-route-change'));
      return result;
    };

    window.addEventListener('popstate', syncPath);
    window.addEventListener('app-route-change', syncPath);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', syncPath);
      window.removeEventListener('app-route-change', syncPath);
    };
  }, []);

  const navigate = (path) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
  };

  // The site may live under a prefix (GitHub Pages: /shopping-app), so compare without it.
  const appPath = getAppPath();
  if (appPath === '/db-admin' || appPath.startsWith('/db-admin/')) {
    return <DbAdminApp />;
  }

  if (currentPath.startsWith('/admin')) {
    return <AdminApp onNavigate={navigate} />;
  }

  return <StorefrontApp />;
}

function App() {
  return (
    <div className="App">
      <AppRouter />
    </div>
  );
}

export default App;
