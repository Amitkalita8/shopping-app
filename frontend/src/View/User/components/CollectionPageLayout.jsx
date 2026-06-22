import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';

function CollectionPageLayout({ collection, onAddToCart, onMenuOpen, onOpenProduct }) {
  const [sortValue, setSortValue] = useState(collection.sortOptions[0]);

  useEffect(() => {
    setSortValue(collection.sortOptions[0]);
  }, [collection]);

  return (
    <main className="site-shell page-content">
      <section className="collection-toolbar">
        <button className="collection-toolbar__filter" onClick={onMenuOpen} type="button">
          Browse Menu
        </button>

        <p className="collection-toolbar__meta">{collection.products.length} styles</p>

        <label className="collection-toolbar__sort">
          <span>Sort by</span>
          <select onChange={(event) => setSortValue(event.target.value)} value={sortValue}>
            {collection.sortOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="collection-intro">
        <p>{collection.breadcrumb}</p>
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </section>

      <section className="product-grid product-grid--collection">
        {collection.products.map((product) => (
          <ProductCard
            key={product.id}
            onAddToCart={onAddToCart}
            onOpenProduct={onOpenProduct}
            product={product}
          />
        ))}
      </section>
    </main>
  );
}

export default CollectionPageLayout;
