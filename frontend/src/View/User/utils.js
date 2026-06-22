export function getCurrentPath() {
  return window.location.pathname || '/';
}

export function formatCurrency(value) {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function getCartCount(cartItems) {
  return cartItems.reduce((total, item) => total + item.quantity, 0);
}
