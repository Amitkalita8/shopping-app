import CartPage from './pages/CartPage/CartPage';
import CheckoutPage from './pages/CheckoutPage/CheckoutPage';
import CollectionPage from './pages/CollectionPage/CollectionPage';
import HomePage from './pages/HomePage/HomePage';
import OrderConfirmationPage from './pages/OrderConfirmationPage/OrderConfirmationPage';
import OrdersPage from './pages/OrdersPage/OrdersPage';
import ProductDetailsPage from './pages/ProductDetailsPage/ProductDetailsPage';
import WishlistPage from './pages/WishlistPage/WishlistPage';

// Picks the page for a URL. Collections and products are looked up in the loaded store data,
// so a new collection or product in the database gets a working page with no code change.
export function getRoute(pathname, storefront) {
  const { storeName } = storefront.settings;
  const titled = (title) => `${title} | ${storeName}`;

  if (pathname === '/cart') {
    return { component: CartPage, title: titled('Shopping Bag') };
  }

  if (pathname === '/checkout') {
    return { component: CheckoutPage, title: titled('Checkout') };
  }

  if (pathname.startsWith('/order-confirmation/')) {
    return {
      component: OrderConfirmationPage,
      orderId: pathname.replace('/order-confirmation/', ''),
      title: titled('Order Confirmed'),
    };
  }

  if (pathname === '/orders') {
    return { component: OrdersPage, title: titled('My Orders') };
  }

  if (pathname === '/wishlist') {
    return { component: WishlistPage, title: titled('Wishlist') };
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
