import { useEffect, useMemo, useState } from 'react';
import {
  getProductCollection,
  getProductGallery,
} from '../../storeData';
import { formatCurrency } from '../../utils';

function getProductCopy(product, collection) {
  if (collection.label === 'Accessories') {
    return {
      about: `${product.title} is a styling-ready accessory selected to pair easily with festive and occasion looks.`,
      fabric: 'Crafted with decorative finishing, structured detailing, and a premium presentation suitable for event styling.',
      shipping:
        'Ships in 2-4 working days with careful packaging and easy return support across eligible pincodes.',
    };
  }

  if (collection.label === "Men's collection") {
    return {
      about: `${product.title} is designed as an easy wardrobe staple with a clean silhouette and all-day comfort.`,
      fabric: 'Soft-touch fabric with a comfortable drape, breathable feel, and everyday wear construction.',
      shipping:
        'Ships in 2-4 working days with prepaid offers, easy exchanges, and support for most serviceable pincodes.',
    };
  }

  if (collection.label === 'Women Western') {
    return {
      about: `${product.title} is part of the women western edit, built for easy styling from daywear to dressier moments.`,
      fabric: 'Selected for a polished finish, comfortable wear, and a shape that holds well through repeated use.',
      shipping:
        'Ships in 2-4 working days with reliable delivery updates and simple return support where available.',
    };
  }

  return {
    about: `${product.title} is part of the traditional edit, chosen for occasion-ready styling, strong visual detail, and elevated finishing.`,
    fabric: 'Features a premium festive drape with decorative detailing and a blouse or matching styling component where applicable.',
    shipping:
      'Ships in 2-4 working days with secure packaging, free-shipping support on qualifying orders, and return assistance on eligible items.',
  };
}

function ProductDetailsPage({ onAddToCart, onNavigate, product }) {
  const collection = useMemo(() => getProductCollection(product.id), [product.id]);
  const gallery = useMemo(() => getProductGallery(product), [product]);
  const copy = useMemo(() => getProductCopy(product, collection), [collection, product]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('about');
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 24 });

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setActiveTab('about');
    setIsZoomVisible(false);
    setZoomPosition({ x: 50, y: 24 });
  }, [product.id]);

  const selectedImage =
    gallery[selectedImageIndex] ?? {
      src: product.imageSrc,
      alt: product.title,
      mainPosition: 'center top',
      thumbPosition: 'center top',
      zoomScale: 220,
    };

  const handleZoomMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const width = bounds.width || 1;
    const height = bounds.height || 1;
    const x = ((event.clientX - bounds.left) / width) * 100;
    const y = ((event.clientY - bounds.top) / height) * 100;

    setZoomPosition({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  };

  const tabs = [
    { id: 'about', label: 'About', content: copy.about },
    { id: 'fabric', label: 'Fabric', content: copy.fabric },
    { id: 'shipping', label: 'Shipping', content: copy.shipping },
  ];

  return (
    <main className="site-shell page-content">
      <section className="product-detail">
        <div className="product-detail__gallery">
          <div className="product-detail__thumbs" aria-label="Product thumbnails">
            {gallery.map((image, index) => (
              <button
                aria-label={`Show ${image.label.toLowerCase()} for ${product.title}`}
                className={`product-detail__thumb ${selectedImageIndex === index ? 'is-active' : ''}`}
                key={image.id}
                onClick={() => setSelectedImageIndex(index)}
                type="button"
              >
                <img
                  alt={image.alt}
                  className="product-detail__thumb-image"
                  src={image.src}
                  style={{ objectPosition: image.thumbPosition }}
                />
              </button>
            ))}
          </div>

          <div className="product-detail__stage-wrap">
            <div
              aria-label="Product image zoom area"
              className="product-detail__stage"
              onMouseEnter={() => setIsZoomVisible(true)}
              onMouseLeave={() => setIsZoomVisible(false)}
              onMouseMove={handleZoomMove}
              role="presentation"
            >
              <img
                alt={selectedImage.alt}
                className="product-detail__stage-image"
                src={selectedImage.src}
                style={{ objectPosition: selectedImage.mainPosition }}
              />
              <div
                aria-hidden={!isZoomVisible}
                className={`product-detail__zoom-lens ${isZoomVisible ? 'is-active' : ''}`}
                style={{
                  left: `${zoomPosition.x}%`,
                  top: `${zoomPosition.y}%`,
                }}
              />
            </div>

            <div
              aria-hidden={!isZoomVisible}
              aria-label="Zoom preview"
              className={`product-detail__zoom-panel ${isZoomVisible ? 'is-active' : ''}`}
              style={{
                backgroundImage: `url(${selectedImage.src})`,
                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                backgroundSize: `${selectedImage.zoomScale}%`,
              }}
            />
          </div>
        </div>

        <div className="product-detail__summary">
          <button
            className="product-detail__back"
            onClick={() => onNavigate(collection.path)}
            type="button"
          >
            Back to {collection.label}
          </button>

          <p className="product-detail__eyebrow">{collection.label}</p>
          <h1>{product.title}</h1>

          <div className="product-detail__price-row">
            <strong>{formatCurrency(product.price)}</strong>
            {product.compareAt ? <span>{formatCurrency(product.compareAt)}</span> : null}
            <mark>{product.badge}</mark>
          </div>

          <p className="product-detail__shipping-note">
            Inclusive of all taxes. Free shipping above Rs 1500.
          </p>

          <ul className="product-detail__trust-list">
            <li>Authentic and quality assured</li>
            <li>100% money back guarantee on eligible orders</li>
            <li>Free shipping and returns on qualifying products</li>
          </ul>

          <div className="product-detail__quantity-row">
            <span>Quantity:</span>
            <div className="product-detail__quantity-control">
              <button
                aria-label="Decrease quantity"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                type="button"
              >
                -
              </button>
              <span>{quantity}</span>
              <button
                aria-label="Increase quantity"
                onClick={() => setQuantity((current) => current + 1)}
                type="button"
              >
                +
              </button>
            </div>
          </div>

          <div className="product-detail__pincode">
            <button type="button">Check</button>
            <input placeholder="Enter your pincode" type="text" />
          </div>

          <div className="product-detail__actions">
            <button onClick={() => onAddToCart(product, quantity)} type="button">
              Add To Cart
            </button>
            <button
              className="is-dark"
              onClick={() => {
                onAddToCart(product, quantity);
                onNavigate('/cart');
              }}
              type="button"
            >
              Buy It Now
            </button>
          </div>

          <section className="product-detail__offer">
            <strong>Also get extra instant Rs 200 off on prepaid orders.</strong>
            <p>Prices mentioned are inclusive of all taxes and special offer handling.</p>
          </section>

          <div className="product-detail__tabs">
            <div className="product-detail__tab-list" role="tablist">
              {tabs.map((tab) => (
                <button
                  aria-selected={activeTab === tab.id}
                  className={activeTab === tab.id ? 'is-active' : ''}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="product-detail__tab-panel">
              {tabs.find((tab) => tab.id === activeTab)?.content}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ProductDetailsPage;
