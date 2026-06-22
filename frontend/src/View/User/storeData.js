import banarasiSareeReal from './Assets/products/banarasi-saree-real.png';
import kurtiSetReal from './Assets/products/kurti-set-real.png';
import mekhelaSadorReal from './Assets/products/mekhela-sador-real.png';
import mensShirtReal from './Assets/products/mens-shirt-real.png';
import mensTshirtReal from './Assets/products/mens-tshirt-real.png';
import potliBagReal from './Assets/products/potli-bag-real.png';
import singleKurtiReal from './Assets/products/single-kurti-real.png';
import templeJewelryReal from './Assets/products/temple-jewelry-real.png';
import tissueSareeReal from './Assets/products/tissue-saree-real.png';
import womenBottomsReal from './Assets/products/women-bottoms-real.png';
import womenTopReal from './Assets/products/women-top-real.png';
import womenTshirtReal from './Assets/products/women-tshirt-real.png';

export const announcementCopy =
  'Get upto 15% OFF + 200Rs extra discounts on all prepaid orders.';

export const navigationLinks = [
  {
    label: "Men's collection",
    path: '/collections/mens-collection/t-shirt',
    match: '/collections/mens-collection/',
  },
  {
    label: 'Women Western',
    path: '/collections/women-western/t-shirt',
    match: '/collections/women-western/',
  },
  {
    label: 'Traditional',
    path: '/collections/traditional/sarees',
    match: '/collections/traditional/',
  },
  { label: 'Accessories', path: '/collections/accessories', match: '/collections/accessories' },
];

export const sidebarSections = [
  {
    id: 'mens-collection',
    label: "Men's collection",
    items: [
      { id: 'mens-tshirt', label: 'T shirt', path: '/collections/mens-collection/t-shirt' },
      { id: 'mens-shirt', label: 'Shirt', path: '/collections/mens-collection/shirt' },
    ],
  },
  {
    id: 'women-western',
    label: 'Women Western',
    items: [
      { id: 'women-tshirt', label: 'T shirt', path: '/collections/women-western/t-shirt' },
      { id: 'women-top', label: 'Top', path: '/collections/women-western/top' },
      { id: 'women-bottoms', label: 'Bottoms', path: '/collections/women-western/bottoms' },
    ],
  },
  {
    id: 'traditional',
    label: 'Traditional',
    items: [
      { id: 'kurti-sets', label: 'Kurti sets', path: '/collections/traditional/kurti-sets' },
      { id: 'single-kurti', label: 'Single kurti', path: '/collections/traditional/single-kurti' },
      { id: 'sarees', label: 'Sarees', path: '/collections/traditional/sarees' },
      { id: 'mekhela-sador', label: 'Mekhela Sador', path: '/collections/traditional/mekhela-sador' },
    ],
  },
  {
    id: 'accessories',
    label: 'Accessories',
    path: '/collections/accessories',
  },
];

export const heroSpotlight = {
  eyebrow: 'Editorial storefront',
  title: 'Sharper category pages, cleaner routing, and the old sidebar structure back in place.',
  copy:
    'Browse the exact sidebar groups you asked for, open dedicated URLs for each option, and move straight into product pages without the extra View as strip.',
  primaryAction: { label: 'Shop Sarees', path: '/collections/traditional/sarees' },
  secondaryAction: { label: "Browse Men's T shirts", path: '/collections/mens-collection/t-shirt' },
};

export const spotlightCards = [
  {
    title: "Men's Collection",
    copy: 'Relaxed everyday T shirts and polished shirts grouped under one quick drawer section.',
  },
  {
    title: 'Traditional Edit',
    copy: 'Kurti sets, single kurtis, sarees, and Mekhela Sador each get their own route and page.',
  },
];

const productGalleryPresets = [
  {
    id: 'main',
    label: 'Main view',
    mainPosition: 'center top',
    thumbPosition: 'center top',
    zoomScale: 220,
  },
  {
    id: 'detail',
    label: 'Detail view',
    mainPosition: 'center 24%',
    thumbPosition: 'center 24%',
    zoomScale: 260,
  },
  {
    id: 'texture',
    label: 'Fabric close-up',
    mainPosition: 'center 72%',
    thumbPosition: 'center 72%',
    zoomScale: 300,
  },
];

export const products = [
  {
    id: 'mens-classic-cotton-tshirt',
    title: "Men's Classic Cotton T Shirt",
    price: 899,
    compareAt: 1499,
    badge: 'Best Seller',
    color: 'Charcoal',
    theme: 'midnight',
    imageSrc: mensTshirtReal,
  },
  {
    id: 'mens-graphic-oversized-tshirt',
    title: "Men's Graphic Oversized T Shirt",
    price: 999,
    compareAt: 1699,
    badge: 'New',
    color: 'Stone',
    theme: 'sand',
    imageSrc: mensTshirtReal,
  },
  {
    id: 'mens-resort-shirt',
    title: "Men's Striped Resort Shirt",
    price: 1299,
    compareAt: 1899,
    badge: 'Trending',
    color: 'Blue Ivory',
    theme: 'royal',
    imageSrc: mensShirtReal,
  },
  {
    id: 'mens-oxford-shirt',
    title: "Men's Oxford Everyday Shirt",
    price: 1499,
    compareAt: 2199,
    badge: 'Smart Casual',
    color: 'Powder Blue',
    theme: 'sage',
    imageSrc: mensShirtReal,
  },
  {
    id: 'women-ribbed-tshirt',
    title: "Women's Ribbed T Shirt",
    price: 749,
    compareAt: 1199,
    badge: 'Daily Wear',
    color: 'Ivory',
    theme: 'rose',
    imageSrc: womenTshirtReal,
  },
  {
    id: 'women-oversized-tshirt',
    title: "Women's Oversized Drop-Shoulder T Shirt",
    price: 849,
    compareAt: 1299,
    badge: 'New',
    color: 'Mauve',
    theme: 'plum',
    imageSrc: womenTshirtReal,
  },
  {
    id: 'women-satin-top',
    title: "Women's Satin Drape Top",
    price: 1199,
    compareAt: 1799,
    badge: 'Popular',
    color: 'Rose Gold',
    theme: 'rose',
    imageSrc: womenTopReal,
  },
  {
    id: 'women-wrap-top',
    title: "Women's Wrap Tie Top",
    price: 1099,
    compareAt: 1649,
    badge: 'Fresh Drop',
    color: 'Coral',
    theme: 'terracotta',
    imageSrc: womenTopReal,
  },
  {
    id: 'women-pleated-bottoms',
    title: "Women's Pleated Wide-Leg Bottoms",
    price: 1399,
    compareAt: 1999,
    badge: 'Popular',
    color: 'Taupe',
    theme: 'mustard',
    imageSrc: womenBottomsReal,
  },
  {
    id: 'women-tailored-bottoms',
    title: "Women's Tailored Straight Bottoms",
    price: 1299,
    compareAt: 1899,
    badge: 'Wardrobe Staple',
    color: 'Sand',
    theme: 'sand',
    imageSrc: womenBottomsReal,
  },
  {
    id: 'festive-kurti-set',
    title: 'Festive Kurti Set With Dupatta',
    price: 2299,
    compareAt: 3499,
    badge: '54% OFF',
    color: 'Mustard',
    theme: 'mustard',
    imageSrc: kurtiSetReal,
  },
  {
    id: 'printed-kurti-set',
    title: 'Printed Kurti Set With Trousers',
    price: 1999,
    compareAt: 2999,
    badge: 'Bestseller',
    color: 'Olive',
    theme: 'emerald',
    imageSrc: kurtiSetReal,
  },
  {
    id: 'everyday-single-kurti',
    title: 'Printed Everyday Single Kurti',
    price: 999,
    compareAt: 1499,
    badge: 'Daily Wear',
    color: 'Teal',
    theme: 'emerald',
    imageSrc: singleKurtiReal,
  },
  {
    id: 'embroidered-single-kurti',
    title: 'Embroidered Statement Single Kurti',
    price: 1199,
    compareAt: 1799,
    badge: 'Festive',
    color: 'Wine',
    theme: 'maroon',
    imageSrc: singleKurtiReal,
  },
  {
    id: 'banarasi-saree',
    title: 'Banarasi Silk Saree With Blouse Piece',
    price: 2949,
    compareAt: 6749,
    badge: '56% OFF',
    color: 'Maroon',
    theme: 'maroon',
    imageSrc: banarasiSareeReal,
  },
  {
    id: 'tissue-saree',
    title: 'Pure Tissue Silk Saree With Brocade',
    price: 2699,
    compareAt: 4299,
    badge: 'New',
    color: 'Lavender',
    theme: 'lavender',
    imageSrc: tissueSareeReal,
  },
  {
    id: 'mekhela-sador-cream',
    title: 'Assamese Mekhela Sador Set',
    price: 3299,
    compareAt: 4799,
    badge: 'Handpicked',
    color: 'Cream Gold',
    theme: 'sand',
    imageSrc: mekhelaSadorReal,
  },
  {
    id: 'mekhela-sador-ruby',
    title: 'Ruby Border Mekhela Sador',
    price: 3499,
    compareAt: 5099,
    badge: 'Occasion Wear',
    color: 'Ruby',
    theme: 'terracotta',
    imageSrc: mekhelaSadorReal,
  },
  {
    id: 'temple-jewelry-set',
    title: 'Temple Jewelry Styling Set',
    price: 1599,
    compareAt: 2399,
    badge: 'Accessorize',
    color: 'Antique Gold',
    theme: 'mustard',
    imageSrc: templeJewelryReal,
  },
  {
    id: 'embroidered-potli-bag',
    title: 'Embroidered Potli Bag',
    price: 899,
    compareAt: 1299,
    badge: 'New',
    color: 'Rust Gold',
    theme: 'terracotta',
    imageSrc: potliBagReal,
  },
];

const productIndex = Object.fromEntries(products.map((product) => [product.id, product]));

const productCollections = {
  'mens-classic-cotton-tshirt': {
    label: "Men's collection",
    path: '/collections/mens-collection/t-shirt',
  },
  'mens-graphic-oversized-tshirt': {
    label: "Men's collection",
    path: '/collections/mens-collection/t-shirt',
  },
  'mens-resort-shirt': {
    label: "Men's collection",
    path: '/collections/mens-collection/shirt',
  },
  'mens-oxford-shirt': {
    label: "Men's collection",
    path: '/collections/mens-collection/shirt',
  },
  'women-ribbed-tshirt': {
    label: 'Women Western',
    path: '/collections/women-western/t-shirt',
  },
  'women-oversized-tshirt': {
    label: 'Women Western',
    path: '/collections/women-western/t-shirt',
  },
  'women-satin-top': {
    label: 'Women Western',
    path: '/collections/women-western/top',
  },
  'women-wrap-top': {
    label: 'Women Western',
    path: '/collections/women-western/top',
  },
  'women-pleated-bottoms': {
    label: 'Women Western',
    path: '/collections/women-western/bottoms',
  },
  'women-tailored-bottoms': {
    label: 'Women Western',
    path: '/collections/women-western/bottoms',
  },
  'festive-kurti-set': {
    label: 'Traditional',
    path: '/collections/traditional/kurti-sets',
  },
  'printed-kurti-set': {
    label: 'Traditional',
    path: '/collections/traditional/kurti-sets',
  },
  'everyday-single-kurti': {
    label: 'Traditional',
    path: '/collections/traditional/single-kurti',
  },
  'embroidered-single-kurti': {
    label: 'Traditional',
    path: '/collections/traditional/single-kurti',
  },
  'banarasi-saree': {
    label: 'Traditional',
    path: '/collections/traditional/sarees',
  },
  'tissue-saree': {
    label: 'Traditional',
    path: '/collections/traditional/sarees',
  },
  'mekhela-sador-cream': {
    label: 'Traditional',
    path: '/collections/traditional/mekhela-sador',
  },
  'mekhela-sador-ruby': {
    label: 'Traditional',
    path: '/collections/traditional/mekhela-sador',
  },
  'temple-jewelry-set': {
    label: 'Accessories',
    path: '/collections/accessories',
  },
  'embroidered-potli-bag': {
    label: 'Accessories',
    path: '/collections/accessories',
  },
};

export function getProductById(productId) {
  return productIndex[productId] ?? null;
}

export function getProductPath(product) {
  const productId = typeof product === 'string' ? product : product.id;
  return `/products/${productId}`;
}

export function getProductCollection(productId) {
  return (
    productCollections[productId] ?? {
      label: 'Collections',
      path: '/',
    }
  );
}

export function getProductGallery(product) {
  if (!product?.imageSrc) {
    return [];
  }

  return productGalleryPresets.map((preset) => ({
    ...preset,
    src: product.imageSrc,
    alt: `${product.title} ${preset.label.toLowerCase()}`,
  }));
}

export function getProductsByIds(ids) {
  return ids.map((id) => productIndex[id]).filter(Boolean);
}

export function createCollectionPage(config) {
  return {
    ...config,
    sortOptions: config.sortOptions ?? ['Featured', 'Best selling', 'Price, low to high'],
    products: getProductsByIds(config.productIds),
  };
}

export const featuredCollectionCards = getProductsByIds([
  'banarasi-saree',
  'festive-kurti-set',
  'mens-resort-shirt',
  'women-satin-top',
]);

export const homeCollections = [
  {
    title: "Men's and Western Edits",
    path: '/collections/women-western/top',
    products: getProductsByIds([
      'mens-classic-cotton-tshirt',
      'mens-resort-shirt',
      'women-satin-top',
      'women-pleated-bottoms',
    ]),
  },
  {
    title: 'Traditional Picks',
    path: '/collections/traditional/sarees',
    products: getProductsByIds([
      'festive-kurti-set',
      'embroidered-single-kurti',
      'banarasi-saree',
      'mekhela-sador-cream',
    ]),
  },
];
