import ProductCard from '../../components/ProductCard';
import { useStorefront } from '../../StorefrontData';

function HomePage({ onAddToCart, onNavigate, onOpenProduct }) {
  const { content, homeSections } = useStorefront();
  const { hero, spotlightCards } = content;

  return (
    <main className="site-shell page-content">
      <section className="hero-layout">
        <article className="hero-panel">
          <p className="hero-panel__eyebrow">{hero.eyebrow}</p>
          <h1>{hero.title}</h1>
          <p>{hero.copy}</p>
          <div className="hero-panel__actions">
            <button onClick={() => onNavigate(hero.primaryPath)} type="button">
              {hero.primaryLabel}
            </button>
            <button className="is-secondary" onClick={() => onNavigate(hero.secondaryPath)} type="button">
              {hero.secondaryLabel}
            </button>
          </div>
        </article>

        <div className="hero-side-cards">
          {spotlightCards.map((card) => (
            <article className="hero-side-card" key={card.id}>
              <h2>{card.title}</h2>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      {homeSections.map((section) =>
        section.layout === 'strip' ? (
          <section className="featured-strip" key={section.id}>
            {section.products.map((product) => (
              <ProductCard
                key={product.id}
                onAddToCart={onAddToCart}
                onOpenProduct={onOpenProduct}
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
                  key={product.id}
                  onAddToCart={onAddToCart}
                  onOpenProduct={onOpenProduct}
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
