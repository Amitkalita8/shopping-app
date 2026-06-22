import CartPage from './pages/CartPage/CartPage';
import HomePage from './pages/HomePage/HomePage';
import ProductDetailsPage from './pages/ProductDetailsPage/ProductDetailsPage';
import AccessoriesPage from './pages/collections/AccessoriesPage/AccessoriesPage';
import KurtiSetsPage from './pages/collections/KurtiSetsPage/KurtiSetsPage';
import MekhelaSadorPage from './pages/collections/MekhelaSadorPage/MekhelaSadorPage';
import MensShirtPage from './pages/collections/MensShirtPage/MensShirtPage';
import MensTshirtPage from './pages/collections/MensTshirtPage/MensTshirtPage';
import SareesPage from './pages/collections/SareesPage/SareesPage';
import SingleKurtiPage from './pages/collections/SingleKurtiPage/SingleKurtiPage';
import WomenBottomsPage from './pages/collections/WomenBottomsPage/WomenBottomsPage';
import WomenTopPage from './pages/collections/WomenTopPage/WomenTopPage';
import WomenTshirtPage from './pages/collections/WomenTshirtPage/WomenTshirtPage';
import { getProductById } from './storeData';

export const storeRoutes = {
  '/': { component: HomePage, title: 'Atelier PS Vogue' },
  '/cart': { component: CartPage, title: 'Shopping Bag | Atelier PS Vogue' },
  '/collections/mens-collection/t-shirt': {
    component: MensTshirtPage,
    title: "Men's T shirt | Atelier PS Vogue",
  },
  '/collections/mens-collection/shirt': {
    component: MensShirtPage,
    title: "Men's Shirt | Atelier PS Vogue",
  },
  '/collections/women-western/t-shirt': {
    component: WomenTshirtPage,
    title: "Women's T shirt | Atelier PS Vogue",
  },
  '/collections/women-western/top': {
    component: WomenTopPage,
    title: "Women's Top | Atelier PS Vogue",
  },
  '/collections/women-western/bottoms': {
    component: WomenBottomsPage,
    title: "Women's Bottoms | Atelier PS Vogue",
  },
  '/collections/traditional/kurti-sets': {
    component: KurtiSetsPage,
    title: 'Kurti sets | Atelier PS Vogue',
  },
  '/collections/traditional/single-kurti': {
    component: SingleKurtiPage,
    title: 'Single kurti | Atelier PS Vogue',
  },
  '/collections/traditional/sarees': {
    component: SareesPage,
    title: 'Sarees | Atelier PS Vogue',
  },
  '/collections/traditional/mekhela-sador': {
    component: MekhelaSadorPage,
    title: 'Mekhela Sador | Atelier PS Vogue',
  },
  '/collections/accessories': {
    component: AccessoriesPage,
    title: 'Accessories | Atelier PS Vogue',
  },
};

export function getRoute(pathname) {
  if (pathname.startsWith('/products/')) {
    const productId = pathname.replace('/products/', '');
    const product = getProductById(productId);

    if (product) {
      return {
        component: ProductDetailsPage,
        product,
        title: `${product.title} | Atelier PS Vogue`,
      };
    }
  }

  return storeRoutes[pathname] ?? storeRoutes['/'];
}
