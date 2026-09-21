// The same photo is shown as three crops: the main view and two zoomed details.
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
