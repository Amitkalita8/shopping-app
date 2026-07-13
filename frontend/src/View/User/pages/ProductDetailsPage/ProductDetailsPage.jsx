import { useEffect, useMemo, useState } from 'react';
import {
  getProductCollection,
  getProductGallery,
} from '../../storeData';
import { formatCurrency } from '../../utils';

const policyContent = {
  returns: {
    title: 'Return & Exchange Policy',
    sections: [
      {
        heading: 'Returns & Exchanges',
        items: [
          'Products can be returned or exchanged within 7 days of delivery.',
          'Items must be unused, unwashed, undamaged, and in their original packaging with all tags attached.',
          'A valid order number or proof of purchase is required.',
        ],
      },
      {
        heading: 'Non-Returnable Items',
        items: [
          'Used, washed, or damaged products.',
          'Products without original tags or packaging.',
          'Customized or personalized items.',
          'Earrings and certain accessories due to hygiene reasons.',
        ],
      },
      {
        heading: 'Damaged or Wrong Products',
        body:
          'If you receive a damaged, defective, or incorrect product, please contact us within 48 hours of delivery with photographs of the item and packaging. We will arrange a replacement or refund after verification.',
      },
      {
        heading: 'Refunds',
        items: [
          'Once the returned product is received and inspected, the refund will be processed.',
          'Refunds will be credited to the original payment method within 7–10 business days.',
          'Shipping charges, if any, are non-refundable unless the return is due to our error.',
        ],
      },
      {
        heading: 'Contact Us',
        body:
          'For return or exchange requests, please contact our customer support team with your order details.',
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    sections: [
      {
        body:
          'Welcome to our website. By accessing or using this website, you agree to comply with and be bound by the following Terms & Conditions.',
      },
      {
        heading: 'Account Registration',
        items: [
          'Users must provide accurate and complete information during registration.',
          'Users are responsible for maintaining the confidentiality of their account credentials.',
          'The company reserves the right to suspend or terminate accounts containing false or misleading information.',
        ],
      },
      {
        heading: 'Product Information',
        items: [
          'We strive to ensure that all product descriptions, specifications, and prices are accurate.',
          'However, we reserve the right to modify product information, pricing, or availability without prior notice.',
        ],
      },
      {
        heading: 'Orders and Acceptance',
        items: [
          'Submission of an order does not guarantee acceptance.',
          'The company reserves the right to reject or cancel any order at its discretion.',
        ],
      },
      {
        heading: 'Payments',
        items: [
          'All payments must be made through approved payment methods available on the website.',
          'Orders will be processed only after successful payment confirmation, where applicable.',
        ],
      },
      {
        heading: 'Intellectual Property',
        body:
          'All content on this website, including text, images, logos, designs, and trademarks, is the property of the company and may not be copied, reproduced, or distributed without prior written permission.',
      },
      {
        heading: 'User Conduct',
        body:
          'Users shall not engage in any activity that may harm, disrupt, or interfere with the website or its services. Any misuse, unauthorized access, or fraudulent activity may result in legal action.',
      },
      {
        heading: 'Privacy',
        body:
          'Personal information collected through the website will be handled in accordance with our Privacy Policy.',
      },
      {
        heading: 'Limitation of Liability',
        body:
          'The company shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of this website or its services.',
      },
      {
        heading: 'Changes to Terms',
        body:
          'The company reserves the right to update or modify these Terms & Conditions at any time without prior notice.',
      },
      {
        heading: 'Governing Law',
        body: 'These Terms & Conditions shall be governed by and interpreted in accordance with the laws of India.',
      },
      {
        body:
          'By registering on or using this website, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.',
      },
    ],
  },
};

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
    { id: 'about', label: 'About', content: copy.about },
    { id: 'fabric', label: 'Fabric', content: copy.fabric },
    { id: 'shipping', label: 'Shipping', content: copy.shipping },
  ];
  const selectedPolicy = activePolicy ? policyContent[activePolicy] : null;

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
