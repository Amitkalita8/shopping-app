import ProductArtwork from '../../components/ProductArtwork';
import { formatCurrency } from '../../utils';

function CartPage({ cartItems, onNavigate, onQuantityChange, onRemove }) {
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <main className="site-shell page-content">
      <section className="cart-page">
        <div className="cart-page__main">
          <p>Your cart</p>
          <h1>Shopping Bag</h1>

          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty.</p>
              <button onClick={() => onNavigate('/collections/traditional/sarees')} type="button">
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="cart-list">
              {cartItems.map((item) => (
                <article className="cart-list__item" key={item.id}>
                  <div className="cart-list__thumb">
                    <ProductArtwork product={item} />
                  </div>

                  <div className="cart-list__details">
                    <h2>{item.title}</h2>
                    <p>{item.color}</p>
                    <strong>{formatCurrency(item.price)}</strong>

                    <div className="cart-list__controls">
                      <button onClick={() => onQuantityChange(item.id, -1)} type="button">
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onQuantityChange(item.id, 1)} type="button">
                        +
                      </button>
                      <button className="cart-list__remove" onClick={() => onRemove(item.id)} type="button">
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="cart-summary">
          <p>Summary</p>
          <h2>{formatCurrency(subtotal)}</h2>
          <span>Subtotal before shipping</span>
          <button onClick={() => onNavigate('/collections/traditional/sarees')} type="button">
            Continue shopping
          </button>
        </aside>
      </section>
    </main>
  );
}

export default CartPage;
