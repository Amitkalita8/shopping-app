import { useEffect, useState } from 'react';
import CartDrawer from './components/CartDrawer';
import Header from './components/Header';
import SidebarMenu from './components/SidebarMenu';
import { getRoute } from './routes';
import { getProductPath, products, sidebarSections } from './storeData';
import { getCartCount, getCurrentPath } from './utils';
import './Landing.css';

function StorefrontApp() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(sidebarSections[0].id);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCartItemId, setActiveCartItemId] = useState(products[0].id);

  const activeRoute = getRoute(currentPath);
  const ActivePage = activeRoute.component;
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
    document.title = activeRoute.title;
  }, [activeRoute]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
  };

  const navigate = (path) => {
    if (path !== currentPath) {
      const fullPath = window.location.pathname.startsWith('/shopping-app')
        ? `/shopping-app${path}`
        : path;
      window.history.pushState({}, '', fullPath);
      setCurrentPath(path);
    }

    setIsMenuOpen(false);
    setIsCartOpen(false);

    if (!/jsdom/i.test(window.navigator.userAgent)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddToCart = (product, quantity = 1) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }

      return [...currentItems, { ...product, quantity }];
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

      <ActivePage
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onMenuOpen={() => setIsMenuOpen(true)}
        onNavigate={navigate}
        onOpenProduct={(product) => navigate(getProductPath(product))}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveFromCart}
        product={activeRoute.product}
      />
    </div>
  );
}

export default StorefrontApp;
