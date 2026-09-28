import { useEffect, useState } from 'react';
import { getStoredToken } from '../../authApi';
import { fetchOrders } from '../../checkoutApi';
import { formatCurrency } from '../../utils';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OrdersPage({ onNavigate, user }) {
  const [orders, setOrders] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    fetchOrders(getStoredToken())
      .then(({ items }) => setOrders(items))
      .catch((error) => setErrorMessage(error.message));
  }, [user]);

  return (
    <main className="site-shell page-content">
      <section className="collection-intro">
        <p>Account</p>
        <h1>My Orders</h1>
      </section>

      {errorMessage ? (
        <p className="auth-form__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {orders === null ? (
        <p>Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className="cart-empty">
          <p>You haven't placed any orders yet.</p>
          <button onClick={() => onNavigate('/')} type="button">
            Continue shopping
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <article className="orders-list__item" key={order.id}>
              <div className="orders-list__header">
                <div>
                  <strong>{order.orderNumber}</strong>
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <span className={`orders-list__status orders-list__status--${order.orderStatus}`}>
                  {order.orderStatus}
                </span>
              </div>

              <div className="checkout-summary__list">
                {order.items.map((item) => (
                  <div className="checkout-summary__item" key={`${order.id}-${item.productId}`}>
                    <span>
                      {item.title} x {item.quantity}
                    </span>
                    <strong>{formatCurrency(item.unitPrice * item.quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className="orders-list__footer">
                <span>{order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Paid online'}</span>
                <strong>{formatCurrency(order.total)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default OrdersPage;
