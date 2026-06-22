export function getCurrentPath() {
  const path = window.location.pathname || '/';
  const repoPrefix = '/shopping-app';
  if (path.startsWith(repoPrefix)) {
    const subPath = path.slice(repoPrefix.length);
    return subPath || '/';
  }
  return path;
}

export function formatCurrency(value) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function getCartCount(cartItems) {
  return cartItems.reduce((total, item) => total + item.quantity, 0);
}
