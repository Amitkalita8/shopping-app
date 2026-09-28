import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, getStoredToken, storeToken } from './authApi';
import { addCartItem, fetchCart, removeCartItem, updateCartItemQuantity } from './cartApi';
import { addToWishlist, fetchWishlist, removeFromWishlist } from './wishlistApi';
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
  const [wishlistIds, setWishlistIds] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activeCartItemId, setActiveCartItemId] = useState(null);

  // Cart items in the database only carry a product id and quantity; the full product details
  // (title, image, price, color...) always come from the already-loaded storefront catalog.
  const hydrateCartItems = useCallback(
    (items) =>
      items
        .map((item) => {
          const product = storefront.getProductById(item.productId);
          return product ? { ...product, quantity: item.quantity } : null;
        })
        .filter(Boolean),
    [storefront]
  );

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

  // The cart and wishlist live in the database against the signed-in user, so they load fresh on
  // login and clear on logout rather than staying around as leftover local state.
  useEffect(() => {
    if (!user) {
      setCartItems([]);
      setWishlistIds([]);
      return;
    }

    const token = getStoredToken();

    fetchCart(token)
      .then(({ items }) => setCartItems(hydrateCartItems(items)))
      .catch(() => {});

    fetchWishlist(token)
      .then(({ items }) => setWishlistIds(items))
      .catch(() => {});
  }, [user, hydrateCartItems]);

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
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    addCartItem(getStoredToken(), product.id, quantity)
      .then(({ items }) => {
        setCartItems(hydrateCartItems(items));
        setActiveCartItemId(product.id);
        setIsCartOpen(true);
      })
      .catch(() => {});
  };

  const handleQuantityChange = (productId, delta) => {
    const current = cartItems.find((item) => item.id === productId);
    if (!current) {
      return;
    }

    const nextQuantity = current.quantity + delta;
    const token = getStoredToken();
    const request =
      nextQuantity > 0 ? updateCartItemQuantity(token, productId, nextQuantity) : removeCartItem(token, productId);

    request.then(({ items }) => setCartItems(hydrateCartItems(items))).catch(() => {});
  };

  const handleRemoveFromCart = (productId) => {
    removeCartItem(getStoredToken(), productId)
      .then(({ items }) => setCartItems(hydrateCartItems(items)))
      .catch(() => {});
  };

  const handleToggleWishlist = (product) => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    const token = getStoredToken();
    const request = wishlistIds.includes(product.id)
      ? removeFromWishlist(token, product.id)
      : addToWishlist(token, product.id);

    request.then(({ items }) => setWishlistIds(items)).catch(() => {});
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
        onOpenWishlist={() => {
          if (!user) {
            setIsAuthOpen(true);
            return;
          }
          navigate('/wishlist');
        }}
        onSearchSubmit={handleSearchSubmit}
        wishlistCount={wishlistIds.length}
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
        onNavigate={navigate}
        onProfileUpdated={setUser}
        user={user}
      />

      <ActivePage
        cartItems={cartItems}
        onAddToCart={handleAddToCart}
        onMenuOpen={() => setIsMenuOpen(true)}
        onNavigate={navigate}
        onOpenProduct={(product) => navigate(getProductPath(product))}
        onOrderPlaced={() => setCartItems([])}
        onQuantityChange={handleQuantityChange}
        onRemove={handleRemoveFromCart}
        onToggleWishlist={handleToggleWishlist}
        user={user}
        wishlistIds={wishlistIds}
        collection={activeRoute.collection}
        orderId={activeRoute.orderId}
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
