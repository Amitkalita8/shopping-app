import ProductCard from '../../components/ProductCard';
import {
  featuredCollectionCards,
  heroSpotlight,
  homeCollections,
  spotlightCards,
} from '../../storeData';

function HomePage({ onAddToCart, onNavigate, onOpenProduct }) {
  return (
    <main className="site-shell page-content">
      <section className="hero-layout">
        <article className="hero-panel">
          <p className="hero-panel__eyebrow">{heroSpotlight.eyebrow}</p>
          <h1>{heroSpotlight.title}</h1>
          <p>{heroSpotlight.copy}</p>
          <div className="hero-panel__actions">
            <button onClick={() => onNavigate(heroSpotlight.primaryAction.path)} type="button">
              {heroSpotlight.primaryAction.label}
            </button>
            <button
              className="is-secondary"
              onClick={() => onNavigate(heroSpotlight.secondaryAction.path)}
              type="button"
            >
              {heroSpotlight.secondaryAction.label}
            </button>
          </div>
        </article>

        <div className="hero-side-cards">
          {spotlightCards.map((card) => (
            <article className="hero-side-card" key={card.title}>
              <h2>{card.title}</h2>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="featured-strip">
        {featuredCollectionCards.map((product) => (
          <ProductCard
            key={product.id}
            onAddToCart={onAddToCart}
            onOpenProduct={onOpenProduct}
            product={product}
          />
        ))}
      </section>

      {homeCollections.map((section) => (
        <section className="collection-preview" key={section.title}>
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
      ))}
    </main>
  );
}

export default HomePage;
