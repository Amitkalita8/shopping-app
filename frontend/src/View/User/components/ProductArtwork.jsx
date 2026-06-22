import brandLogo from '../Assets/Logo.jpeg';

function ProductArtwork({ product }) {
  const hasRealImage = Boolean(product.imageSrc);

  return (
    <div
      className={`product-artwork product-artwork--${product.theme} ${
        hasRealImage ? 'product-artwork--photo' : ''
      }`}
    >
      <span className="product-artwork__badge">{product.badge}</span>
      {hasRealImage ? (
        <img alt={product.title} className="product-artwork__image" src={product.imageSrc} />
      ) : (
        <div aria-hidden="true" className="product-artwork__portrait" />
      )}
      <div className="product-artwork__brand">
        <img alt="" src={brandLogo} />
      </div>
    </div>
  );
}

export default ProductArtwork;
