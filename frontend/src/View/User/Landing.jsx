import { useEffect, useState } from 'react';
import brandLogo from './Assets/Logo.jpeg';
import {
  announcementCopy,
  collectionPages,
  featuredCollectionCards,
  heroSpotlight,
  homeCollections,
  navigationLinks,
  products,
  sidebarSections,
  spotlightCards,
} from './storeData';
import './Landing.css';

function getCurrentPath() {
  return window.location.pathname || '/';
}

function getCollectionSlug(pathname) {
  if (!pathname.startsWith('/collections/')) {
    return null;
  }

  return pathname.replace('/collections/', '') || null;
}

function formatCurrency(value) {
  return `₹ ${value.toLocaleString('en-IN')}`;
}

function getCartCount(cartItems) {
  return cartItems.reduce((total, item) => total + item.quantity, 0);
}

function ProductArtwork({ product }) {
  return (
    <div className={`product-artwork product-artwork--${product.theme}`}>
      <span className="product-artwork__badge">{product.badge}</span>
      <div aria-hidden="true" className="product-artwork__portrait" />
      <div className="product-artwork__brand">
        <img alt="" src={brandLogo} />
      </div>
    </div>
  );
}

function ProductCard({ onAddToCart, product }) {
  return (
    <article className="product-card">
      <ProductArtwork product={product} />
      <div className="product-card__content">
        <h3>{product.title}</h3>
        <div className="product-card__price-row">
          <strong>{formatCurrency(product.price)}</strong>
          {product.compareAt ? <span>{formatCurrency(product.compareAt)}</span> : null}
        </div>
        <button className="product-card__button" onClick={() => onAddToCart(product)} type="button">
          Add To Cart
        </button>
      </div>
    </article>
  );
}

function Header({
  cartCount,
  currentPath,
  isMenuOpen,
  onMenuToggle,
  onNavigate,
  onOpenCart,
  onSearchSubmit,
}) {
  return (
    <header className="site-header">
      <div className="announcement-bar">{announcementCopy}</div>

      <div className="header-main">
        <div className="site-shell header-main__inner">
          <div className="header-left">
            <button
              aria-controls="shop-menu"
              aria-expanded={isMenuOpen}
              aria-label="Open shop menu"
              className="menu-button"
              onClick={onMenuToggle}
              type="button"
            >
              <span aria-hidden="true" className="menu-button__icon">
                <span />
                <span />
                <span />
              </span>
            </button>

            <form className="search-panel" onSubmit={onSearchSubmit} role="search">
              <label className="sr-only" htmlFor="store-search">
                Search store
              </label>
              <span aria-hidden="true" className="search-panel__icon" />
              <input
                className="search-panel__input"
                id="store-search"
                placeholder="Search"
                type="search"
              />
            </form>
          </div>

          <button className="brand-mark" onClick={() => onNavigate('/')} type="button">
            <img alt="Atelier PS Vogue" className="brand-logo" src={brandLogo} />
          </button>

          <div className="header-utilities">
            <button aria-label="Offers" className="header-utility" type="button">
              <span aria-hidden="true" className="header-utility__glyph header-utility__glyph--flash" />
            </button>
            <button aria-label={`Cart ${cartCount} items`} className="header-utility" onClick={onOpenCart} type="button">
              <span aria-hidden="true" className="header-utility__glyph header-utility__glyph--bag" />
              {cartCount > 0 ? <span className="header-utility__count">{cartCount}</span> : null}
            </button>
            <button aria-label="Chat" className="header-utility" type="button">
              <span aria-hidden="true" className="header-utility__glyph header-utility__glyph--chat" />
            </button>
          </div>
        </div>
      </div>

      <div className="header-nav">
        <div className="site-shell">
          <nav className="primary-nav" aria-label="Primary">
            {navigationLinks.map((link) => (
              <button
                className={currentPath === link.path ? 'is-active' : ''}
                key={link.label}
                onClick={() => onNavigate(link.path)}
                type="button"
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function SidebarMenu({ currentPath, expandedSection, isOpen, onClose, onNavigate, onToggleSection }) {
  return (
    <>
      <button
        aria-label="Close shop menu"
        className={`overlay-backdrop ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        type="button"
      />

      <aside className={`sidebar-drawer ${isOpen ? 'is-open' : ''}`} id="shop-menu">
        <div className="sidebar-drawer__top">
          <button aria-label="Close shop menu" className="sidebar-close" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="sidebar-sections">
          {sidebarSections.map((section) => {
            const isExpandable = Array.isArray(section.items);
            const isExpanded = expandedSection === section.id;
            const isActive = section.path ? currentPath === section.path : false;

            return (
              <section className="sidebar-section" key={section.id}>
                {isExpandable ? (
                  <>
                    <button
                      aria-expanded={isExpanded}
                      className="sidebar-section__trigger"
                      onClick={() => onToggleSection(section.id)}
                      type="button"
                    >
                      <span>{section.label}</span>
                      <span aria-hidden="true" className="sidebar-section__chevron">
                        {isExpanded ? '⌄' : '›'}
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="sidebar-submenu">
                        {section.items.map((item) => (
                          <button
                            className={currentPath === item.path ? 'is-active' : ''}
                            key={item.id}
                            onClick={() => onNavigate(item.path)}
                            type="button"
                          >
                            <span>{item.label}</span>
                            <span aria-hidden="true">›</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <button
                    className={`sidebar-section__link ${isActive ? 'is-active' : ''}`}
                    onClick={() => onNavigate(section.path)}
                    type="button"
                  >
                    {section.label}
                  </button>
                )}
              </section>
            );
          })}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-login" type="button">
            Log in
          </button>
          <div className="sidebar-socials" aria-label="Social links">
            <span>tw</span>
            <span>fb</span>
            <span>pi</span>
            <span>ig</span>
            <span>yt</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function HomePage({ onAddToCart, onNavigate }) {
  return (
    <main className="site-shell page-content">
      <section className="hero-layout">
        <article className="hero-panel">
          <p className="hero-panel__eyebrow">{heroSpotlight.eyebrow}</p>
          <h1>{heroSpotlight.title}</h1>
          <p>{heroSpotlight.copy}</p>
          <div className="hero-panel__actions">
            <button onClick={() => onNavigate(heroSpotlight.primaryAction.path)} type="button">
              {heroSpotlight.primaryAction.label}
            </button>
            <button className="is-secondary" onClick={() => onNavigate(heroSpotlight.secondaryAction.path)} type="button">
              {heroSpotlight.secondaryAction.label}
            </button>
          </div>
        </article>

        <div className="hero-side-cards">
          {spotlightCards.map((card) => (
            <article className="hero-side-card" key={card.title}>
              <h2>{card.title}</h2>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="featured-strip">
        {featuredCollectionCards.map((product) => (
          <ProductCard key={product.id} onAddToCart={onAddToCart} product={product} />
        ))}
      </section>

      {homeCollections.map((section) => (
        <section className="collection-preview" key={section.title}>
          <div className="collection-preview__heading">
            <div>
              <p>{section.title}</p>
              <h2>{section.title}</h2>
            </div>
            <button onClick={() => onNavigate(section.path)} type="button">
              View Collection
            </button>
          </div>

          <div className="product-grid">
            {section.products.map((product) => (
              <ProductCard key={product.id} onAddToCart={onAddToCart} product={product} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function CollectionPage({ collection, onAddToCart, onMenuOpen }) {
  const [sortValue, setSortValue] = useState(collection.sortOptions[0]);

  useEffect(() => {
    setSortValue(collection.sortOptions[0]);
  }, [collection]);

  return (
    <main className="site-shell page-content">
      <section className="collection-toolbar">
        <button className="collection-toolbar__filter" onClick={onMenuOpen} type="button">
          Filter
        </button>

        <div className="collection-toolbar__view">
          <span>View as</span>
          <div className="collection-toolbar__modes">
            <span className="is-light" />
            <span className="is-active" />
            <span className="is-light" />
          </div>
        </div>

        <label className="collection-toolbar__sort">
          <span>Sort by</span>
          <select onChange={(event) => setSortValue(event.target.value)} value={sortValue}>
            {collection.sortOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="collection-intro">
        <p>{collection.breadcrumb}</p>
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </section>

      <section className="product-grid product-grid--collection">
        {collection.products.map((product) => (
          <ProductCard key={product.id} onAddToCart={onAddToCart} product={product} />
        ))}
      </section>
    </main>
  );
}

function CartDrawer({ cartCount, cartItem, isOpen, onClose, onNavigate, onQuantityChange, onRemove }) {
  if (!cartItem) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Close cart drawer"
        className={`overlay-backdrop overlay-backdrop--right ${isOpen ? 'is-visible' : ''}`}
        onClick={onClose}
        type="button"
      />

      <aside className={`cart-drawer ${isOpen ? 'is-open' : ''}`}>
        <div className="cart-drawer__header">
          <p>✓ Item added to your cart</p>
          <button aria-label="Close cart drawer" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="cart-drawer__item">
          <div className="cart-drawer__thumb">
            <ProductArtwork product={cartItem} />
          </div>

          <div className="cart-drawer__details">
            <h2>{cartItem.title}</h2>
            <div className="cart-drawer__price">
              <strong>{formatCurrency(cartItem.price)}</strong>
              {cartItem.compareAt ? <span>{formatCurrency(cartItem.compareAt)}</span> : null}
            </div>

            <div className="cart-drawer__quantity">
              <button aria-label="Decrease quantity" onClick={() => onQuantityChange(cartItem.id, -1)} type="button">
                −
              </button>
              <span>{cartItem.quantity}</span>
              <button aria-label="Increase quantity" onClick={() => onQuantityChange(cartItem.id, 1)} type="button">
                +
              </button>
              <button className="cart-drawer__remove" onClick={() => onRemove(cartItem.id)} type="button">
                Remove
              </button>
            </div>

            <p className="cart-drawer__color">
              <strong>COLOR:</strong> {cartItem.color}
            </p>
          </div>
        </div>

        <div className="cart-drawer__actions">
          <button onClick={() => onNavigate('/cart')} type="button">
            View My Cart ({cartCount})
          </button>
          <button className="is-dark" onClick={() => onNavigate('/cart')} type="button">
            Checkout
          </button>
          <button className="is-link" onClick={onClose} type="button">
            Continue Shopping
          </button>
        </div>
      </aside>
    </>
  );
}

function CartPage({ cartItems, onNavigate, onQuantityChange, onRemove }) {
  const subtotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <main className="site-shell page-content">
      <section className="cart-page">
        <div className="cart-page__main">
          <p>Your cart</p>
          <h1>Shopping Bag</h1>

          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty.</p>
              <button onClick={() => onNavigate('/collections/silk-sarees')} type="button">
                Continue shopping
              </button>
            </div>
          ) : (
            <div className="cart-list">
              {cartItems.map((item) => (
                <article className="cart-list__item" key={item.id}>
                  <div className="cart-list__thumb">
                    <ProductArtwork product={item} />
                  </div>

                  <div className="cart-list__details">
                    <h2>{item.title}</h2>
                    <p>{item.color}</p>
                    <strong>{formatCurrency(item.price)}</strong>

                    <div className="cart-list__controls">
                      <button onClick={() => onQuantityChange(item.id, -1)} type="button">
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => onQuantityChange(item.id, 1)} type="button">
                        +
                      </button>
                      <button className="cart-list__remove" onClick={() => onRemove(item.id)} type="button">
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="cart-summary">
          <p>Summary</p>
          <h2>{formatCurrency(subtotal)}</h2>
          <span>Subtotal before shipping</span>
          <button onClick={() => onNavigate('/collections/silk-sarees')} type="button">
            Continue shopping
          </button>
        </aside>
      </section>
    </main>
  );
}

function Landing() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState('shop-by');
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCartItemId, setActiveCartItemId] = useState(products[0].id);

  const collectionSlug = getCollectionSlug(currentPath);
  const activeCollection = collectionSlug ? collectionPages[collectionSlug] : null;
  const cartCount = getCartCount(cartItems);
  const activeCartItem = cartItems.find((item) => item.id === activeCartItemId) ?? cartItems[0] ?? null;

  useEffect(() => {
    const syncPath = () => setCurrentPath(getCurrentPath());
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsCartOpen(false);
      }
    };

    window.addEventListener('popstate', syncPath);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('popstate', syncPath);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen || isCartOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen, isMenuOpen]);

  useEffect(() => {
    if (cartItems.length === 0) {
      setIsCartOpen(false);
      return;
    }

    if (!cartItems.some((item) => item.id === activeCartItemId)) {
      setActiveCartItemId(cartItems[0].id);
    }
  }, [activeCartItemId, cartItems]);

  useEffect(() => {
    if (activeCollection) {
      document.title = `${activeCollection.title} | Atelier PS Vogue`;
      return;
    }

    if (currentPath === '/cart') {
      document.title = 'Shopping Bag | Atelier PS Vogue';
      return;
    }

    document.title = 'Atelier PS Vogue';
  }, [activeCollection, currentPath]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
  };

  const navigate = (path) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }

    setIsMenuOpen(false);
    setIsCartOpen(false);

    if (!/jsdom/i.test(window.navigator.userAgent)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (product) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...currentItems, { ...product, quantity: 1 }];
    });

    setActiveCartItemId(product.id);
    setIsCartOpen(true);
  };

  const handleQuantityChange = (productId, delta) => {
    setCartItems((currentItems) =>
      currentItems.flatMap((item) => {
        if (item.id !== productId) {
          return [item];
        }

        const nextQuantity = item.quantity + delta;
        return nextQuantity > 0 ? [{ ...item, quantity: nextQuantity }] : [];
      })
    );
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems((currentItems) => currentItems.filter((item) => item.id !== productId));
  };

  let pageContent;

  if (currentPath === '/cart') {
    pageContent = (
      <CartPage
        cartItems={cartItems}
        onNavigate={navigate}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveFromCart}
      />
    );
  } else if (activeCollection) {
    pageContent = (
      <CollectionPage collection={activeCollection} onAddToCart={handleAddToCart} onMenuOpen={() => setIsMenuOpen(true)} />
    );
  } else {
    pageContent = <HomePage onAddToCart={handleAddToCart} onNavigate={navigate} />;
  }

  return (
    <div className="landing-page">
      <Header
        cartCount={cartCount}
        currentPath={currentPath}
        isMenuOpen={isMenuOpen}
        onMenuToggle={() => setIsMenuOpen((current) => !current)}
        onNavigate={navigate}
        onOpenCart={() => {
          if (cartItems.length > 0) {
            setIsCartOpen(true);
          } else {
            navigate('/cart');
          }
        }}
        onSearchSubmit={handleSearchSubmit}
      />

      <SidebarMenu
        currentPath={currentPath}
        expandedSection={expandedSection}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={navigate}
        onToggleSection={(sectionId) =>
          setExpandedSection((current) => (current === sectionId ? null : sectionId))
        }
      />

      <CartDrawer
        cartCount={cartCount}
        cartItem={activeCartItem}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onNavigate={navigate}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveFromCart}
      />

      {pageContent}
    </div>
  );
}

export default Landing;
