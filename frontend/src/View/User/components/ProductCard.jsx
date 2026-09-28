import ProductArtwork from './ProductArtwork';
import { formatCurrency } from '../utils';

function ProductCard({ isWishlisted, onAddToCart, onOpenProduct, onToggleWishlist, product }) {
  return (
    <article className="product-card">
      <div className="product-card__visual">
        <button
          aria-label={`View details for ${product.title}`}
          className="product-card__visual-button"
          onClick={() => onOpenProduct(product)}
          type="button"
        >
          <ProductArtwork product={product} />
        </button>

        {onToggleWishlist ? (
          <button
            aria-label={isWishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
            aria-pressed={isWishlisted}
            className={`product-card__wishlist ${isWishlisted ? 'is-active' : ''}`}
            onClick={() => onToggleWishlist(product)}
            type="button"
          >
            <span aria-hidden="true" className="product-card__wishlist-glyph" />
          </button>
        ) : null}
      </div>

      <div className="product-card__content">
        <button className="product-card__title-button" onClick={() => onOpenProduct(product)} type="button">
          <h3>{product.title}</h3>
        </button>

        <div className="product-card__price-row">
          <strong>{formatCurrency(product.price)}</strong>
          {product.compareAt ? <span>{formatCurrency(product.compareAt)}</span> : null}
        </div>

        <button className="product-card__button" onClick={() => onAddToCart(product)} type="button">
          Add To Cart
        </button>
      </div>
    </article>
  );
}

export default ProductCard;
