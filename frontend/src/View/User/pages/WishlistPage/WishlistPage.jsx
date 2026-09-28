import ProductCard from '../../components/ProductCard';
import { useStorefront } from '../../StorefrontData';

// Saved products, hydrated from the ids the wishlist API returns against the loaded catalog.
function WishlistPage({ onAddToCart, onNavigate, onOpenProduct, onToggleWishlist, wishlistIds = [] }) {
  const { getProductById } = useStorefront();
  const products = wishlistIds.map((id) => getProductById(id)).filter(Boolean);

  return (
    <main className="site-shell page-content">
      <section className="collection-intro">
        <p>Saved for later</p>
        <h1>Your Wishlist</h1>
        <p>{products.length} {products.length === 1 ? 'style' : 'styles'} saved.</p>
      </section>

      {products.length === 0 ? (
        <div className="cart-empty">
          <p>Your wishlist is empty.</p>
          <button onClick={() => onNavigate('/')} type="button">
            Continue shopping
          </button>
        </div>
      ) : (
        <section className="product-grid product-grid--collection">
          {products.map((product) => (
            <ProductCard
              isWishlisted
              key={product.id}
              onAddToCart={onAddToCart}
              onOpenProduct={onOpenProduct}
              onToggleWishlist={onToggleWishlist}
              product={product}
            />
          ))}
        </section>
      )}
    </main>
  );
}

export default WishlistPage;
