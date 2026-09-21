import { useEffect, useMemo, useState } from 'react';
import { getProductGallery } from '../../productGallery';
import { useStorefront } from '../../StorefrontData';
import { formatCurrency } from '../../utils';

function ProductDetailsPage({ onAddToCart, onNavigate, product }) {
  const { content, policies } = useStorefront();
  const { collection } = product;
  const { productPage } = content;
  const gallery = useMemo(() => getProductGallery(product), [product]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('about');
  const [activePolicy, setActivePolicy] = useState(null);
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 24 });

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setActiveTab('about');
    setActivePolicy(null);
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
    { id: 'about', label: 'About', content: product.about },
    { id: 'fabric', label: 'Fabric', content: product.fabric },
    { id: 'shipping', label: 'Shipping', content: product.shipping },
  ];
  const selectedPolicy = activePolicy ? policies[activePolicy] ?? null : null;

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

          <p className="product-detail__shipping-note">{productPage.shippingNote}</p>

          <ul className="product-detail__trust-list">
            {productPage.trustPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
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
            <strong>{productPage.offerTitle}</strong>
            <p>{productPage.offerCopy}</p>
          </section>

          <div className="product-detail__policy-actions">
            <button onClick={() => setActivePolicy('returns')} type="button">
              Return Policy
            </button>
            <button onClick={() => setActivePolicy('terms')} type="button">
              Terms & Conditions
            </button>
          </div>

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

      <button
        aria-label="Close policy dialog"
        className={`overlay-backdrop overlay-backdrop--modal ${selectedPolicy ? 'is-visible' : ''}`}
        onClick={() => setActivePolicy(null)}
        type="button"
      />

      <section
        aria-hidden={!selectedPolicy}
        aria-labelledby="policy-modal-title"
        className={`policy-modal ${selectedPolicy ? 'is-open' : ''}`}
        role="dialog"
      >
        <div className="policy-modal__panel">
          <div className="policy-modal__header">
            <div>
              <p className="policy-modal__eyebrow">Policies</p>
              <h2 id="policy-modal-title">{selectedPolicy?.title}</h2>
            </div>
            <button aria-label="Close policy dialog" className="policy-modal__close" onClick={() => setActivePolicy(null)} type="button">
              x
            </button>
          </div>

          <div className="policy-modal__content">
            {selectedPolicy?.sections.map((section, index) => (
              <section className="policy-modal__section" key={`${selectedPolicy.title}-${index}`}>
                {section.heading ? <h3>{section.heading}</h3> : null}
                {section.body ? <p>{section.body}</p> : null}
                {section.items ? (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default ProductDetailsPage;
