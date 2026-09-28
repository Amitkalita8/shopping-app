import { API_BASE_URL } from '../../apiBase';

// The Razorpay key id is public (it identifies the merchant, not a secret), the same way
// GOOGLE_CLIENT_ID is exposed to the browser. Without it, only cash on delivery is offered.
export const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID ?? '';

export const PAYMENT_METHOD_RAZORPAY = 'razorpay';
export const PAYMENT_METHOD_COD = 'cod';
export const COD_CHARGE = 20;

async function request(path, { method = 'GET', body, token } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the server. Please try again.');
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }

  return payload;
}

export const createCheckout = (token, paymentMethod, addressId) =>
  request('/checkout', { method: 'POST', body: { paymentMethod, addressId }, token });

export const verifyPayment = (token, payload) => request('/checkout/verify', { method: 'POST', body: payload, token });

export const fetchOrders = (token) => request('/orders', { token });

export const fetchOrder = (token, orderId) => request(`/orders/${orderId}`, { token });

let razorpayScriptPromise = null;

function loadRazorpayScript() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error('Razorpay could not be loaded.'));
      };
      document.head.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

// Opens the Razorpay Checkout widget for a checkout response, then verifies the payment with the
// backend once Razorpay confirms it. onSuccess/onFailure report the outcome back to the page.
export async function payWithRazorpay({ address, checkoutResponse, onFailure, onSuccess, storeName, token }) {
  await loadRazorpayScript();

  const razorpay = new window.Razorpay({
    key: checkoutResponse.razorpayKeyId,
    amount: checkoutResponse.amountPaise,
    currency: 'INR',
    name: storeName,
    description: `Order ${checkoutResponse.order.orderNumber}`,
    order_id: checkoutResponse.razorpayOrderId,
    prefill: address ? { name: address.fullName, contact: address.mobile } : undefined,
    theme: { color: '#111111' },
    handler: (result) => {
      verifyPayment(token, {
        orderId: checkoutResponse.order.id,
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
      })
        .then(() => onSuccess(checkoutResponse.order.id))
        .catch((error) => onFailure(error.message));
    },
  });

  razorpay.open();
}
