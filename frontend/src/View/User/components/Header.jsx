import brandLogo from '../Assets/Logo.jpeg';
import { announcementCopy, navigationLinks } from '../storeData';

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
      {/* <div className="announcement-bar">{announcementCopy}</div> */}

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
            <span aria-hidden="true" className="brand-badge">
              <img alt="" className="brand-logo" src={brandLogo} />
            </span>
            <span className="brand-copy">
              <span className="brand-copy__title">Atelier PS Vogue</span>
            </span>
          </button>

          <div className="header-utilities">
            <button aria-label="Offers" className="header-utility" type="button">
              <span aria-hidden="true" className="header-utility__glyph header-utility__glyph--flash" />
            </button>
            <button
              aria-label={`Cart ${cartCount} items`}
              className="header-utility"
              onClick={onOpenCart}
              type="button"
            >
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
                className={currentPath.startsWith(link.match ?? link.path) ? 'is-active' : ''}
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

export default Header;
