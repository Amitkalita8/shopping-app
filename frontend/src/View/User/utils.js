function getBasePath() {
  const publicUrl = process.env.PUBLIC_URL ?? '';

  if (!publicUrl || publicUrl === '.') {
    return '';
  }

  const withoutOrigin = publicUrl.replace(/^https?:\/\/[^/]+/i, '');
  const normalized = withoutOrigin.endsWith('/') ? withoutOrigin.slice(0, -1) : withoutOrigin;

  return normalized === '/' ? '' : normalized;
}

export function getCurrentPath() {
  const path = window.location.pathname || '/';
  const basePath = getBasePath();

  if (basePath && path.startsWith(basePath)) {
    const subPath = path.slice(basePath.length);
    return subPath || '/';
  }

  return path;
}

export function toBrowserPath(path) {
  const basePath = getBasePath();
  return basePath ? `${basePath}${path}` : path;
}

export function formatCurrency(value) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function getCartCount(cartItems) {
  return cartItems.reduce((total, item) => total + item.quantity, 0);
}
