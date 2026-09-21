import CartPage from './pages/CartPage/CartPage';
import CollectionPage from './pages/CollectionPage/CollectionPage';
import HomePage from './pages/HomePage/HomePage';
import ProductDetailsPage from './pages/ProductDetailsPage/ProductDetailsPage';

// Picks the page for a URL. Collections and products are looked up in the loaded store data,
// so a new collection or product in the database gets a working page with no code change.
export function getRoute(pathname, storefront) {
  const { storeName } = storefront.settings;
  const titled = (title) => `${title} | ${storeName}`;

  if (pathname === '/cart') {
    return { component: CartPage, title: titled('Shopping Bag') };
  }

  if (pathname.startsWith('/products/')) {
    const product = storefront.getProductById(pathname.replace('/products/', ''));

    if (product) {
      return { component: ProductDetailsPage, product, title: titled(product.title) };
    }
  }

  const collection = storefront.getCollectionByPath(pathname);

  if (collection) {
    return { component: CollectionPage, collection, title: titled(collection.title) };
  }

  return { component: HomePage, title: storeName };
}
