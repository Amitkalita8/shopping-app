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

// The database stores an image as a file name (or a full URL); the bundled files are looked up here.
const bundledImages = {
  'banarasi-saree-real.png': banarasiSareeReal,
  'kurti-set-real.png': kurtiSetReal,
  'mekhela-sador-real.png': mekhelaSadorReal,
  'mens-shirt-real.png': mensShirtReal,
  'mens-tshirt-real.png': mensTshirtReal,
  'potli-bag-real.png': potliBagReal,
  'single-kurti-real.png': singleKurtiReal,
  'temple-jewelry-real.png': templeJewelryReal,
  'tissue-saree-real.png': tissueSareeReal,
  'women-bottoms-real.png': womenBottomsReal,
  'women-top-real.png': womenTopReal,
  'women-tshirt-real.png': womenTshirtReal,
};

export function resolveProductImage(reference) {
  if (!reference) {
    return '';
  }

  if (/^(https?:)?\/\//i.test(reference) || reference.startsWith('/') || reference.startsWith('data:')) {
    return reference;
  }

  return bundledImages[reference] ?? '';
}
