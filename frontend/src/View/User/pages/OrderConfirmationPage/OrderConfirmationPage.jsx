import { useEffect, useState } from 'react';
import { getStoredToken } from '../../authApi';
import { fetchOrder } from '../../checkoutApi';
import { formatCurrency } from '../../utils';

function OrderConfirmationPage({ onNavigate, orderId }) {
  const [order, setOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setOrder(null);
    setErrorMessage('');

    fetchOrder(getStoredToken(), orderId)
      .then(setOrder)
      .catch((error) => setErrorMessage(error.message));
  }, [orderId]);

  if (errorMessage) {
    return (
      <main className="site-shell page-content">
        <div className="cart-empty">
          <p>{errorMessage}</p>
          <button onClick={() => onNavigate('/')} type="button">
            Continue shopping
          </button>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="site-shell page-content">
        <p>Loading your order...</p>
      </main>
    );
  }

  return (
    <main className="site-shell page-content">
      <section className="order-confirmation">
        <p className="order-confirmation__eyebrow">Order confirmed</p>
        <h1>Thank you for your order</h1>
        <p>
          Order <strong>{order.orderNumber}</strong> has been placed
          {order.paymentMethod === 'cod' ? ' — pay on delivery.' : '.'}
        </p>

        <div className="checkout-summary__list">
          {order.items.map((item) => (
            <div className="checkout-summary__item" key={item.productId}>
              <span>
                {item.title} x {item.quantity}
              </span>
              <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
            </div>
          ))}
        </div>

        <div className="checkout-summary__row">
          <span>Subtotal</span>
          <strong>{formatCurrency(order.subtotal)}</strong>
        </div>

        {order.codCharge > 0 ? (
          <div className="checkout-summary__row">
            <span>Cash on delivery charge</span>
            <strong>{formatCurrency(order.codCharge)}</strong>
          </div>
        ) : null}

        <h2>{formatCurrency(order.total)}</h2>
        <span>Total paid</span>

        <button onClick={() => onNavigate('/')} type="button">
          Continue shopping
        </button>
      </section>
    </main>
  );
}

export default OrderConfirmationPage;
