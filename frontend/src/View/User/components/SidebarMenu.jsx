import { useStorefront } from '../StorefrontData';
import UserAvatar from './UserAvatar';

function SidebarMenu({
  currentPath,
  expandedSection,
  isOpen,
  onClose,
  onNavigate,
  onOpenAuth,
  onToggleSection,
  user,
}) {
  const { content, menu } = useStorefront();

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
            <span aria-hidden="true" className="sidebar-close__icon" />
          </button>
        </div>

        <div className="sidebar-sections">
          {menu.map((section) => {
            const isExpandable = Array.isArray(section.items);
            const isExpanded = expandedSection === section.id;
            const isChildActive = section.items?.some((item) => item.path === currentPath);
            const isActive = section.path ? currentPath === section.path : isChildActive;

            return (
              <section className="sidebar-section" key={section.id}>
                {isExpandable ? (
                  <>
                    <button
                      aria-expanded={isExpanded}
                      className={`sidebar-section__trigger ${isActive ? 'is-active' : ''}`}
                      onClick={() => onToggleSection(section.id)}
                      type="button"
                    >
                      <span>{section.label}</span>
                      <span
                        aria-hidden="true"
                        className={`sidebar-section__chevron ${isExpanded ? 'is-expanded' : ''}`}
                      />
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
                            <span aria-hidden="true" className="sidebar-submenu__chevron" />
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
          <button className="sidebar-login" onClick={onOpenAuth} type="button">
            {user ? (
              <UserAvatar user={user} />
            ) : (
              <span aria-hidden="true" className="sidebar-login__icon header-utility__glyph header-utility__glyph--user" />
            )}
            <span>{user ? user.fullName.split(' ')[0] : 'Log in'}</span>
            <span aria-hidden="true" className="sidebar-login__chevron" />
          </button>
          <div className="sidebar-socials" aria-label="Social links">
            {content.socialLinks.map((link) => (
              <button aria-label={link.label} className="sidebar-social" key={link.id} type="button">
                <span aria-hidden="true" className={`sidebar-social__glyph sidebar-social__glyph--${link.id}`}>
                  {link.shortLabel}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

export default SidebarMenu;
