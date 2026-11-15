import HeroBanner from '../../components/HeroBanner';
import ProductCard from '../../components/ProductCard';
import { useStorefront } from '../../StorefrontData';

function HomePage({ onAddToCart, onNavigate, onOpenProduct, onToggleWishlist, wishlistIds = [] }) {
  const { content, homeSections } = useStorefront();
  const { hero } = content;

  return (
    <main className="site-shell page-content">
      {/* The banner is the visible hero; the page title stays for screen readers and search engines. */}
      <h1 className="sr-only">{hero.title}</h1>
      <HeroBanner onNavigate={onNavigate} />

      {homeSections.map((section) =>
        section.layout === 'strip' ? (
          <section className="featured-strip" key={section.id}>
            {section.products.map((product) => (
              <ProductCard
                isWishlisted={wishlistIds.includes(product.id)}
                key={product.id}
                onAddToCart={onAddToCart}
                onOpenProduct={onOpenProduct}
                onToggleWishlist={onToggleWishlist}
                product={product}
              />
            ))}
          </section>
        ) : (
          <section className="collection-preview" key={section.id}>
            <div className="collection-preview__heading">
              <div>
                <p>{section.title}</p>
                <h2>{section.title}</h2>
              </div>
              <button onClick={() => onNavigate(section.path)} type="button">
                View Collection
              </button>
            </div>

            <div className="product-grid">
              {section.products.map((product) => (
                <ProductCard
                  isWishlisted={wishlistIds.includes(product.id)}
                  key={product.id}
                  onAddToCart={onAddToCart}
                  onOpenProduct={onOpenProduct}
                  onToggleWishlist={onToggleWishlist}
                  product={product}
                />
              ))}
            </div>
          </section>
        )
      )}
    </main>
  );
}

export default HomePage;
