import ProductArtwork from './ProductArtwork';
import { formatCurrency } from '../utils';

function CartDrawer({ cartCount, cartItem, isOpen, onClose, onNavigate, onQuantityChange, onRemove }) {
  if (!cartItem) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Close cart drawer"
        className={`overlay-backdrop overlay-backdrop--right ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        type="button"
      />

      <aside className={`cart-drawer ${isOpen ? 'is-open' : ''}`}>
        <div className="cart-drawer__header">
          <p>Item added to your cart</p>
          <button aria-label="Close cart drawer" onClick={onClose} type="button">
            x
          </button>
        </div>

        <div className="cart-drawer__item">
          <div className="cart-drawer__thumb">
            <ProductArtwork product={cartItem} />
          </div>

          <div className="cart-drawer__details">
            <h2>{cartItem.title}</h2>
            <div className="cart-drawer__price">
              <strong>{formatCurrency(cartItem.price)}</strong>
              {cartItem.compareAt ? <span>{formatCurrency(cartItem.compareAt)}</span> : null}
            </div>

            <div className="cart-drawer__quantity">
              <button aria-label="Decrease quantity" onClick={() => onQuantityChange(cartItem.id, -1)} type="button">
                -
              </button>
              <span>{cartItem.quantity}</span>
              <button aria-label="Increase quantity" onClick={() => onQuantityChange(cartItem.id, 1)} type="button">
                +
              </button>
              <button className="cart-drawer__remove" onClick={() => onRemove(cartItem.id)} type="button">
                Remove
              </button>
            </div>

            <p className="cart-drawer__color">
              <strong>COLOR:</strong> {cartItem.color}
            </p>
          </div>
        </div>

        <div className="cart-drawer__actions">
          <button onClick={() => onNavigate('/cart')} type="button">
            View My Cart ({cartCount})
          </button>
          <button className="is-dark" onClick={() => onNavigate('/cart')} type="button">
            Checkout
          </button>
          <button className="is-link" onClick={onClose} type="button">
            Continue Shopping
          </button>
        </div>
      </aside>
    </>
  );
}

export default CartDrawer;
