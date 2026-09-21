import { useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, getStoredToken, storeToken } from './authApi';
import AuthModal from './components/AuthModal';
import CartDrawer from './components/CartDrawer';
import Header from './components/Header';
import SidebarMenu from './components/SidebarMenu';
import { getRoute } from './routes';
import { StorefrontDataProvider, StorefrontGate, useStorefront } from './StorefrontData';
import { getCartCount, getCurrentPath, getProductPath, toBrowserPath } from './utils';
import './Landing.css';

function StorefrontShell() {
  const storefront = useStorefront();
  const [currentPath, setCurrentPath] = useState(getCurrentPath);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(storefront.menu[0]?.id ?? null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activeCartItemId, setActiveCartItemId] = useState(null);

  const activeRoute = useMemo(() => getRoute(currentPath, storefront), [currentPath, storefront]);
  const ActivePage = activeRoute.component;
  const cartCount = getCartCount(cartItems);
  const activeCartItem = cartItems.find((item) => item.id === activeCartItemId) ?? cartItems[0] ?? null;

  useEffect(() => {
    const syncPath = () => setCurrentPath(getCurrentPath());
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsCartOpen(false);
        setIsAuthOpen(false);
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
    const token = getStoredToken();
    if (!token) {
      return;
    }

    fetchCurrentUser(token)
      .then((session) => setUser(session.user))
      .catch((error) => {
        // Only drop the token when the server rejected it, not when it was unreachable.
        if (error.status === 401) {
          storeToken('');
        }
      });
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen || isCartOpen || isAuthOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isAuthOpen, isCartOpen, isMenuOpen]);

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
      window.history.pushState({}, '', toBrowserPath(path));
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
        onOpenAuth={() => setIsAuthOpen(true)}
        user={user}
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
        onOpenAuth={() => {
          setIsMenuOpen(false);
          setIsAuthOpen(true);
        }}
        onToggleSection={(sectionId) =>
          setExpandedSection((current) => (current === sectionId ? null : sectionId))
        }
        user={user}
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

      <AuthModal
        isOpen={isAuthOpen}
        onAuthenticated={(signedInUser, token) => {
          storeToken(token);
          setUser(signedInUser);
        }}
        onClose={() => setIsAuthOpen(false)}
        onLogout={() => {
          storeToken('');
          setUser(null);
        }}
        user={user}
      />

      <ActivePage
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onMenuOpen={() => setIsMenuOpen(true)}
        onNavigate={navigate}
        onOpenProduct={(product) => navigate(getProductPath(product))}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveFromCart}
        collection={activeRoute.collection}
        product={activeRoute.product}
      />
    </div>
  );
}

function StorefrontApp() {
  return (
    <StorefrontDataProvider>
      <StorefrontGate>
        <StorefrontShell />
      </StorefrontGate>
    </StorefrontDataProvider>
  );
}

export default StorefrontApp;
