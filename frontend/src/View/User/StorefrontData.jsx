import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchStorefront } from './storefrontApi';
import { resolveProductImage } from './productImages';

const StorefrontDataContext = createContext(null);

// Turns the API response into what the pages use: resolved image files, lookups by id/path, and the sidebar shape.
function prepare(bundle) {
  const products = bundle.products.map((product) => ({
    ...product,
    imageSrc: resolveProductImage(product.image),
  }));
  const productIndex = Object.fromEntries(products.map((product) => [product.id, product]));
  const getProductsByIds = (ids) => ids.map((id) => productIndex[id]).filter(Boolean);
  const collectionIndex = Object.fromEntries(bundle.collections.map((collection) => [collection.path, collection]));

  return {
    settings: bundle.settings,
    content: bundle.content,
    policies: bundle.policies,
    menu: bundle.categories.map((category) => ({
      id: category.slug,
      label: category.name,
      path: category.path,
      items: category.children?.map((child) => ({ id: child.slug, label: child.label, path: child.path })),
    })),
    homeSections: bundle.home.map((section) => ({ ...section, products: getProductsByIds(section.productIds) })),
    getProductById: (id) => productIndex[id] ?? null,
    getCollectionByPath: (path) => {
      const collection = collectionIndex[path];
      return collection ? { ...collection, products: getProductsByIds(collection.productIds) } : null;
    },
  };
}

export function StorefrontDataProvider({ children }) {
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setState({ status: 'loading' });

    fetchStorefront()
      .then((bundle) => {
        if (!isCancelled) {
          setState({ status: 'ready', data: prepare(bundle) });
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setState({ status: 'error', message: error.message });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  const value = useMemo(() => ({ ...state, reload }), [state, reload]);

  return <StorefrontDataContext.Provider value={value}>{children}</StorefrontDataContext.Provider>;
}

// Renders the loading or error screen until the store data is available, then its children.
export function StorefrontGate({ children }) {
  const { status, message, reload } = useContext(StorefrontDataContext);

  if (status === 'loading') {
    return (
      <div className="storefront-status" role="status">
        <p>Loading the store...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="storefront-status" role="alert">
        <p>We could not load the store right now. {message}</p>
        <button onClick={reload} type="button">
          Try again
        </button>
      </div>
    );
  }

  return children;
}

// The loaded store data. Only call this below <StorefrontGate>, where it is always ready.
export function useStorefront() {
  const { data } = useContext(StorefrontDataContext);
  return data;
}
