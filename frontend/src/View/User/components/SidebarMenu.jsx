import { sidebarSections } from '../storeData';

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
            x
          </button>
        </div>

        <div className="sidebar-sections">
          {sidebarSections.map((section) => {
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
                      <span aria-hidden="true" className="sidebar-section__chevron">
                        {isExpanded ? 'v' : '>'}
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
                            <span aria-hidden="true">></span>
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

export default SidebarMenu;
