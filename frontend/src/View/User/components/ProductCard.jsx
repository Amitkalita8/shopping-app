import ProductArtwork from './ProductArtwork';
import { formatCurrency } from '../utils';

function ProductCard({ onAddToCart, onOpenProduct, product }) {
  return (
    <article className="product-card">
      <button
        aria-label={`View details for ${product.title}`}
        className="product-card__visual-button"
        onClick={() => onOpenProduct(product)}
        type="button"
      >
        <ProductArtwork product={product} />
      </button>

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
