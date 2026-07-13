import { useEffect, useMemo, useState } from 'react';
import './AdminApp.css';
import { cloneAdminState, DEFAULT_ADMIN_STATE, STORAGE_KEY } from './defaultAdminState';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products' },
  { id: 'collections', label: 'Collections' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'Customers' },
  { id: 'content', label: 'Storefront Content' },
  { id: 'policies', label: 'Policies' },
  { id: 'settings', label: 'Settings' },
];

function loadAdminState() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return cloneAdminState();
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      ...cloneAdminState(),
      ...parsed,
      settings: { ...DEFAULT_ADMIN_STATE.settings, ...(parsed.settings ?? {}) },
      content: {
        ...DEFAULT_ADMIN_STATE.content,
        ...(parsed.content ?? {}),
        hero: {
          ...DEFAULT_ADMIN_STATE.content.hero,
          ...(parsed.content?.hero ?? {}),
        },
      },
      policies: { ...DEFAULT_ADMIN_STATE.policies, ...(parsed.policies ?? {}) },
    };
  } catch (error) {
    return cloneAdminState();
  }
}

function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function splitCsv(value) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function findById(list, id) {
  return list.find((item) => item.id === id) ?? list[0] ?? null;
}

function FormField({ label, children, full = false }) {
  return (
    <label className={`admin-field ${full ? 'admin-field--full' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function AdminApp({ onNavigate }) {
  const [adminState, setAdminState] = useState(loadAdminState);
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedProductId, setSelectedProductId] = useState(() => loadAdminState().products[0]?.id ?? null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(() => loadAdminState().collections[0]?.id ?? null);
  const [selectedOrderId, setSelectedOrderId] = useState(() => loadAdminState().orders[0]?.id ?? null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => loadAdminState().customers[0]?.id ?? null);
  const [productSearch, setProductSearch] = useState('');
  const [flashMessage, setFlashMessage] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(adminState));
  }, [adminState]);

  useEffect(() => {
    document.title = 'Admin | Atelier PS Vogue';
  }, []);

  useEffect(() => {
    if (!flashMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => setFlashMessage(''), 2200);
    return () => window.clearTimeout(timer);
  }, [flashMessage]);

  const selectedProduct = useMemo(
    () => findById(adminState.products, selectedProductId),
    [adminState.products, selectedProductId]
  );
  const selectedCollection = useMemo(
    () => findById(adminState.collections, selectedCollectionId),
    [adminState.collections, selectedCollectionId]
  );
  const selectedOrder = useMemo(
    () => findById(adminState.orders, selectedOrderId),
    [adminState.orders, selectedOrderId]
  );
  const selectedCustomer = useMemo(
    () => findById(adminState.customers, selectedCustomerId),
    [adminState.customers, selectedCustomerId]
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) {
      return adminState.products;
    }
    return adminState.products.filter((product) =>
      `${product.title} ${product.id}`.toLowerCase().includes(query)
    );
  }, [adminState.products, productSearch]);

  const showFlash = (message) => setFlashMessage(message);

  const updateProduct = (field, value) => {
    setAdminState((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.id === selectedProduct?.id ? { ...product, [field]: value } : product
      ),
    }));
  };

  const updateCollection = (field, value) => {
    setAdminState((current) => ({
      ...current,
      collections: current.collections.map((collection) =>
        collection.id === selectedCollection?.id ? { ...collection, [field]: value } : collection
      ),
    }));
  };

  const updateOrder = (field, value) => {
    setAdminState((current) => ({
      ...current,
      orders: current.orders.map((order) =>
        order.id === selectedOrder?.id ? { ...order, [field]: value } : order
      ),
    }));
  };

  const updateCustomer = (field, value) => {
    setAdminState((current) => ({
      ...current,
      customers: current.customers.map((customer) =>
        customer.id === selectedCustomer?.id ? { ...customer, [field]: value } : customer
      ),
    }));
  };

  const updateHero = (field, value) => {
    setAdminState((current) => ({
      ...current,
      content: {
        ...current.content,
        hero: {
          ...current.content.hero,
          [field]: value,
        },
      },
    }));
  };

  const updateNavigation = (index, field, value) => {
    setAdminState((current) => ({
      ...current,
      content: {
        ...current.content,
        navigation: current.content.navigation.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const updateSpotlightCard = (index, field, value) => {
    setAdminState((current) => ({
      ...current,
      content: {
        ...current.content,
        spotlightCards: current.content.spotlightCards.map((card, cardIndex) =>
          cardIndex === index ? { ...card, [field]: value } : card
        ),
      },
    }));
  };

  const metrics = [
    {
      label: 'Products',
      value: adminState.products.length,
      meta: `${adminState.products.filter((item) => item.status === 'Active').length} active`,
    },
    {
      label: 'Collections',
      value: adminState.collections.length,
      meta: 'Routes and category copy',
    },
    {
      label: 'Orders',
      value: adminState.orders.length,
      meta: `${adminState.orders.filter((item) => item.fulfillmentStatus !== 'Delivered').length} open orders`,
    },
    {
      label: 'Customers',
      value: adminState.customers.length,
      meta: `${adminState.customers.filter((item) => item.status === 'Active').length} active profiles`,
    },
  ];

  const exportData = () => {
    const blob = new Blob([JSON.stringify(adminState, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'atelier-admin-export.json';
    link.click();
    window.URL.revokeObjectURL(url);
    showFlash('Admin export downloaded.');
  };

  const importData = async (event) => {
    const [file] = event.target.files ?? [];
    if (!file) {
      return;
    }

    const text = await file.text();
    const imported = JSON.parse(text);
    const nextState = {
      ...cloneAdminState(),
      ...imported,
      settings: { ...DEFAULT_ADMIN_STATE.settings, ...(imported.settings ?? {}) },
      content: {
        ...DEFAULT_ADMIN_STATE.content,
        ...(imported.content ?? {}),
        hero: {
          ...DEFAULT_ADMIN_STATE.content.hero,
          ...(imported.content?.hero ?? {}),
        },
      },
      policies: { ...DEFAULT_ADMIN_STATE.policies, ...(imported.policies ?? {}) },
    };

    setAdminState(nextState);
    setSelectedProductId(nextState.products[0]?.id ?? null);
    setSelectedCollectionId(nextState.collections[0]?.id ?? null);
    setSelectedOrderId(nextState.orders[0]?.id ?? null);
    setSelectedCustomerId(nextState.customers[0]?.id ?? null);
    showFlash('Admin data imported.');
    event.target.value = '';
  };

  const resetData = () => {
    const nextState = cloneAdminState();
    setAdminState(nextState);
    setSelectedProductId(nextState.products[0]?.id ?? null);
    setSelectedCollectionId(nextState.collections[0]?.id ?? null);
    setSelectedOrderId(nextState.orders[0]?.id ?? null);
    setSelectedCustomerId(nextState.customers[0]?.id ?? null);
    showFlash('Admin data reset to defaults.');
  };

  return (
    <div className="admin-app">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <p className="admin-eyebrow">Admin Workspace</p>
            <h1>Atelier PS Vogue</h1>
            <p>Manage products, collections, orders, customers, policies, and storefront copy.</p>
          </div>

          <nav className="admin-nav" aria-label="Admin sections">
            {sections.map((section) => (
              <button
                className={`admin-nav__item ${activeSection === section.id ? 'is-active' : ''}`}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="admin-sidebar__note">
            <strong>Storage</strong>
            <p>This React admin panel stores changes in local storage until you wire it to an API.</p>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <div>
              <p className="admin-eyebrow">Operations</p>
              <h2>{sections.find((section) => section.id === activeSection)?.label ?? 'Overview'}</h2>
            </div>

            <div className="admin-actions">
              <button className="admin-button admin-button--dark" onClick={() => showFlash('Changes saved.')} type="button">
                Save All
              </button>
              <button className="admin-button" onClick={exportData} type="button">
                Export JSON
              </button>
              <label className="admin-button" htmlFor="admin-import-input">
                Import JSON
              </label>
              <input hidden id="admin-import-input" accept="application/json" onChange={importData} type="file" />
              <button className="admin-button" onClick={() => onNavigate('/')} type="button">
                Open Storefront
              </button>
              <button className="admin-button admin-button--danger" onClick={resetData} type="button">
                Reset Data
              </button>
            </div>
          </header>

          <div className="admin-flash" aria-live="polite">
            {flashMessage}
          </div>

          <section className={`admin-section ${activeSection === 'overview' ? 'is-active' : ''}`}>
            <div className="admin-grid">
              {metrics.map((metric) => (
                <article className="admin-metric" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <span>{metric.meta}</span>
                </article>
              ))}
            </div>

            <div className="admin-panel-grid admin-panel-grid--double">
              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Snapshot</p>
                    <h3>Recent Orders</h3>
                  </div>
                </div>

                <div className="admin-stack">
                  {adminState.orders
                    .slice()
                    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                    .slice(0, 4)
                    .map((order) => (
                      <article className="admin-card" key={order.id}>
                        <strong>{order.id} - {order.customerName}</strong>
                        <p>{order.items}</p>
                        <p>
                          {order.fulfillmentStatus} | {order.paymentStatus} | {formatMoney(order.total)}
                        </p>
                      </article>
                    ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Low Stock</p>
                    <h3>Inventory Watchlist</h3>
                  </div>
                </div>

                <div className="admin-stack">
                  {adminState.products
                    .filter((product) => Number(product.inventory) <= 10)
                    .map((product) => (
                      <article className="admin-card" key={product.id}>
                        <strong>{product.title}</strong>
                        <p>
                          Inventory {product.inventory} | SKU {product.sku}
                        </p>
                      </article>
                    ))}
                </div>
              </section>
            </div>
          </section>

          <section className={`admin-section ${activeSection === 'products' ? 'is-active' : ''}`}>
            <div className="admin-panel-grid admin-panel-grid--double">
              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Catalog</p>
                    <h3>Products</h3>
                  </div>
                  <button
                    className="admin-button"
                    onClick={() => {
                      const product = {
                        id: createId('product'),
                        title: 'New Product',
                        category: 'Unassigned',
                        path: '/collections',
                        price: 0,
                        compareAt: 0,
                        badge: 'New',
                        color: 'Default',
                        theme: 'sand',
                        status: 'Draft',
                        inventory: 0,
                        sku: createId('sku').toUpperCase(),
                        imageRef: '',
                      };

                      setAdminState((current) => ({
                        ...current,
                        products: [product, ...current.products],
                      }));
                      setSelectedProductId(product.id);
                      showFlash('New product created.');
                    }}
                    type="button"
                  >
                    Add Product
                  </button>
                </div>

                <label className="admin-search">
                  <span>Search products</span>
                  <input onChange={(event) => setProductSearch(event.target.value)} placeholder="Search by title or id" type="search" value={productSearch} />
                </label>

                <div className="admin-list">
                  {filteredProducts.map((product) => (
                    <button
                      className={`admin-card ${selectedProduct?.id === product.id ? 'is-selected' : ''}`}
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      type="button"
                    >
                      <strong>{product.title}</strong>
                      <p>
                        {product.category} | {formatMoney(product.price)} | Stock {product.inventory}
                      </p>
                      <div className="admin-pill-row">
                        <span className="admin-pill">{product.status}</span>
                        <span className="admin-pill">{product.badge}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Editor</p>
                    <h3>Product Details</h3>
                  </div>
                </div>

                {selectedProduct ? (
                  <div className="admin-form">
                    <div className="admin-form--two">
                      <FormField label="Product ID">
                        <input onChange={(event) => updateProduct('id', event.target.value)} value={selectedProduct.id} />
                      </FormField>
                      <FormField label="Title">
                        <input onChange={(event) => updateProduct('title', event.target.value)} value={selectedProduct.title} />
                      </FormField>
                      <FormField label="Category">
                        <input onChange={(event) => updateProduct('category', event.target.value)} value={selectedProduct.category} />
                      </FormField>
                      <FormField label="Collection Path">
                        <input onChange={(event) => updateProduct('path', event.target.value)} value={selectedProduct.path} />
                      </FormField>
                      <FormField label="Price">
                        <input onChange={(event) => updateProduct('price', Number(event.target.value || 0))} type="number" value={selectedProduct.price} />
                      </FormField>
                      <FormField label="Compare At">
                        <input onChange={(event) => updateProduct('compareAt', Number(event.target.value || 0))} type="number" value={selectedProduct.compareAt} />
                      </FormField>
                      <FormField label="Badge">
                        <input onChange={(event) => updateProduct('badge', event.target.value)} value={selectedProduct.badge} />
                      </FormField>
                      <FormField label="Color">
                        <input onChange={(event) => updateProduct('color', event.target.value)} value={selectedProduct.color} />
                      </FormField>
                      <FormField label="Theme">
                        <input onChange={(event) => updateProduct('theme', event.target.value)} value={selectedProduct.theme} />
                      </FormField>
                      <FormField label="Status">
                        <input onChange={(event) => updateProduct('status', event.target.value)} value={selectedProduct.status} />
                      </FormField>
                      <FormField label="Inventory">
                        <input onChange={(event) => updateProduct('inventory', Number(event.target.value || 0))} type="number" value={selectedProduct.inventory} />
                      </FormField>
                      <FormField label="SKU">
                        <input onChange={(event) => updateProduct('sku', event.target.value)} value={selectedProduct.sku} />
                      </FormField>
                      <FormField full label="Image Reference">
                        <input onChange={(event) => updateProduct('imageRef', event.target.value)} value={selectedProduct.imageRef} />
                      </FormField>
                    </div>

                    <div className="admin-form__actions">
                      <button className="admin-button admin-button--dark" onClick={() => showFlash('Product updated.')} type="button">
                        Save Product
                      </button>
                      <button
                        className="admin-button admin-button--danger"
                        onClick={() => {
                          setAdminState((current) => ({
                            ...current,
                            products: current.products.filter((product) => product.id !== selectedProduct.id),
                          }));
                          setSelectedProductId(
                            adminState.products.find((product) => product.id !== selectedProduct.id)?.id ?? null
                          );
                          showFlash('Product deleted.');
                        }}
                        type="button"
                      >
                        Delete Product
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <section className={`admin-section ${activeSection === 'collections' ? 'is-active' : ''}`}>
            <div className="admin-panel-grid admin-panel-grid--double">
              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Navigation</p>
                    <h3>Collections</h3>
                  </div>
                  <button
                    className="admin-button"
                    onClick={() => {
                      const collection = {
                        id: createId('collection'),
                        label: 'New Collection',
                        breadcrumb: 'Collections',
                        path: '/collections/new-collection',
                        description: '',
                        productIds: [],
                        sortOptions: ['Featured'],
                      };
                      setAdminState((current) => ({
                        ...current,
                        collections: [collection, ...current.collections],
                      }));
                      setSelectedCollectionId(collection.id);
                      showFlash('New collection created.');
                    }}
                    type="button"
                  >
                    Add Collection
                  </button>
                </div>

                <div className="admin-list">
                  {adminState.collections.map((collection) => (
                    <button
                      className={`admin-card ${selectedCollection?.id === collection.id ? 'is-selected' : ''}`}
                      key={collection.id}
                      onClick={() => setSelectedCollectionId(collection.id)}
                      type="button"
                    >
                      <strong>{collection.label}</strong>
                      <p>{collection.path}</p>
                      <div className="admin-pill-row">
                        <span className="admin-pill">{collection.productIds.length} products</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Editor</p>
                    <h3>Collection Details</h3>
                  </div>
                </div>

                {selectedCollection ? (
                  <div className="admin-form">
                    <div className="admin-form--two">
                      <FormField label="Collection ID">
                        <input onChange={(event) => updateCollection('id', event.target.value)} value={selectedCollection.id} />
                      </FormField>
                      <FormField label="Label">
                        <input onChange={(event) => updateCollection('label', event.target.value)} value={selectedCollection.label} />
                      </FormField>
                      <FormField label="Breadcrumb">
                        <input onChange={(event) => updateCollection('breadcrumb', event.target.value)} value={selectedCollection.breadcrumb} />
                      </FormField>
                      <FormField label="Path">
                        <input onChange={(event) => updateCollection('path', event.target.value)} value={selectedCollection.path} />
                      </FormField>
                      <FormField full label="Description">
                        <textarea onChange={(event) => updateCollection('description', event.target.value)} value={selectedCollection.description} />
                      </FormField>
                      <FormField full label="Product IDs">
                        <textarea
                          onChange={(event) => updateCollection('productIds', splitCsv(event.target.value))}
                          value={selectedCollection.productIds.join(', ')}
                        />
                      </FormField>
                      <FormField full label="Sort Options">
                        <input
                          onChange={(event) => updateCollection('sortOptions', splitCsv(event.target.value))}
                          value={selectedCollection.sortOptions.join(', ')}
                        />
                      </FormField>
                    </div>

                    <div className="admin-form__actions">
                      <button className="admin-button admin-button--dark" onClick={() => showFlash('Collection updated.')} type="button">
                        Save Collection
                      </button>
                      <button
                        className="admin-button admin-button--danger"
                        onClick={() => {
                          setAdminState((current) => ({
                            ...current,
                            collections: current.collections.filter((collection) => collection.id !== selectedCollection.id),
                          }));
                          setSelectedCollectionId(
                            adminState.collections.find((collection) => collection.id !== selectedCollection.id)?.id ?? null
                          );
                          showFlash('Collection deleted.');
                        }}
                        type="button"
                      >
                        Delete Collection
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <section className={`admin-section ${activeSection === 'orders' ? 'is-active' : ''}`}>
            <div className="admin-panel-grid admin-panel-grid--double">
              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Fulfilment</p>
                    <h3>Orders</h3>
                  </div>
                  <button
                    className="admin-button"
                    onClick={() => {
                      const order = {
                        id: `ORD-${Math.floor(Date.now() / 1000)}`,
                        customerName: 'New Customer',
                        customerEmail: 'customer@example.com',
                        items: '',
                        total: 0,
                        paymentStatus: 'Pending',
                        fulfillmentStatus: 'Pending',
                        trackingNumber: '',
                        createdAt: new Date().toISOString().slice(0, 10),
                        notes: '',
                      };
                      setAdminState((current) => ({
                        ...current,
                        orders: [order, ...current.orders],
                      }));
                      setSelectedOrderId(order.id);
                      showFlash('New order created.');
                    }}
                    type="button"
                  >
                    Add Order
                  </button>
                </div>

                <div className="admin-list">
                  {adminState.orders.map((order) => (
                    <button
                      className={`admin-card ${selectedOrder?.id === order.id ? 'is-selected' : ''}`}
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      type="button"
                    >
                      <strong>{order.id}</strong>
                      <p>
                        {order.customerName} | {formatMoney(order.total)}
                      </p>
                      <div className="admin-pill-row">
                        <span className="admin-pill">{order.fulfillmentStatus}</span>
                        <span className="admin-pill">{order.paymentStatus}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Editor</p>
                    <h3>Order Details</h3>
                  </div>
                </div>

                {selectedOrder ? (
                  <div className="admin-form">
                    <div className="admin-form--two">
                      <FormField label="Order ID">
                        <input onChange={(event) => updateOrder('id', event.target.value)} value={selectedOrder.id} />
                      </FormField>
                      <FormField label="Customer Name">
                        <input onChange={(event) => updateOrder('customerName', event.target.value)} value={selectedOrder.customerName} />
                      </FormField>
                      <FormField label="Customer Email">
                        <input onChange={(event) => updateOrder('customerEmail', event.target.value)} value={selectedOrder.customerEmail} />
                      </FormField>
                      <FormField label="Order Date">
                        <input onChange={(event) => updateOrder('createdAt', event.target.value)} type="date" value={selectedOrder.createdAt} />
                      </FormField>
                      <FormField label="Total">
                        <input onChange={(event) => updateOrder('total', Number(event.target.value || 0))} type="number" value={selectedOrder.total} />
                      </FormField>
                      <FormField label="Payment Status">
                        <input onChange={(event) => updateOrder('paymentStatus', event.target.value)} value={selectedOrder.paymentStatus} />
                      </FormField>
                      <FormField label="Fulfillment Status">
                        <input onChange={(event) => updateOrder('fulfillmentStatus', event.target.value)} value={selectedOrder.fulfillmentStatus} />
                      </FormField>
                      <FormField label="Tracking Number">
                        <input onChange={(event) => updateOrder('trackingNumber', event.target.value)} value={selectedOrder.trackingNumber} />
                      </FormField>
                      <FormField full label="Items">
                        <textarea onChange={(event) => updateOrder('items', event.target.value)} value={selectedOrder.items} />
                      </FormField>
                      <FormField full label="Notes">
                        <textarea onChange={(event) => updateOrder('notes', event.target.value)} value={selectedOrder.notes} />
                      </FormField>
                    </div>

                    <div className="admin-form__actions">
                      <button className="admin-button admin-button--dark" onClick={() => showFlash('Order updated.')} type="button">
                        Save Order
                      </button>
                      <button
                        className="admin-button admin-button--danger"
                        onClick={() => {
                          setAdminState((current) => ({
                            ...current,
                            orders: current.orders.filter((order) => order.id !== selectedOrder.id),
                          }));
                          setSelectedOrderId(adminState.orders.find((order) => order.id !== selectedOrder.id)?.id ?? null);
                          showFlash('Order deleted.');
                        }}
                        type="button"
                      >
                        Delete Order
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <section className={`admin-section ${activeSection === 'customers' ? 'is-active' : ''}`}>
            <div className="admin-panel-grid admin-panel-grid--double">
              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">CRM</p>
                    <h3>Customers</h3>
                  </div>
                  <button
                    className="admin-button"
                    onClick={() => {
                      const customer = {
                        id: createId('customer'),
                        name: 'New Customer',
                        email: 'customer@example.com',
                        mobile: '',
                        city: '',
                        tier: 'New',
                        ordersCount: 0,
                        totalSpend: 0,
                        status: 'Active',
                      };
                      setAdminState((current) => ({
                        ...current,
                        customers: [customer, ...current.customers],
                      }));
                      setSelectedCustomerId(customer.id);
                      showFlash('New customer created.');
                    }}
                    type="button"
                  >
                    Add Customer
                  </button>
                </div>

                <div className="admin-list">
                  {adminState.customers.map((customer) => (
                    <button
                      className={`admin-card ${selectedCustomer?.id === customer.id ? 'is-selected' : ''}`}
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      type="button"
                    >
                      <strong>{customer.name}</strong>
                      <p>
                        {customer.email} | {customer.city}
                      </p>
                      <div className="admin-pill-row">
                        <span className="admin-pill">{customer.tier}</span>
                        <span className="admin-pill">{customer.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel__header">
                  <div>
                    <p className="admin-eyebrow">Editor</p>
                    <h3>Customer Details</h3>
                  </div>
                </div>

                {selectedCustomer ? (
                  <div className="admin-form">
                    <div className="admin-form--two">
                      <FormField label="Customer ID">
                        <input onChange={(event) => updateCustomer('id', event.target.value)} value={selectedCustomer.id} />
                      </FormField>
                      <FormField label="Name">
                        <input onChange={(event) => updateCustomer('name', event.target.value)} value={selectedCustomer.name} />
                      </FormField>
                      <FormField label="Email">
                        <input onChange={(event) => updateCustomer('email', event.target.value)} value={selectedCustomer.email} />
                      </FormField>
                      <FormField label="Mobile">
                        <input onChange={(event) => updateCustomer('mobile', event.target.value)} value={selectedCustomer.mobile} />
                      </FormField>
                      <FormField label="City">
                        <input onChange={(event) => updateCustomer('city', event.target.value)} value={selectedCustomer.city} />
                      </FormField>
                      <FormField label="Tier">
                        <input onChange={(event) => updateCustomer('tier', event.target.value)} value={selectedCustomer.tier} />
                      </FormField>
                      <FormField label="Orders Count">
                        <input onChange={(event) => updateCustomer('ordersCount', Number(event.target.value || 0))} type="number" value={selectedCustomer.ordersCount} />
                      </FormField>
                      <FormField label="Total Spend">
                        <input onChange={(event) => updateCustomer('totalSpend', Number(event.target.value || 0))} type="number" value={selectedCustomer.totalSpend} />
                      </FormField>
                      <FormField full label="Status">
                        <input onChange={(event) => updateCustomer('status', event.target.value)} value={selectedCustomer.status} />
                      </FormField>
                    </div>

                    <div className="admin-form__actions">
                      <button className="admin-button admin-button--dark" onClick={() => showFlash('Customer updated.')} type="button">
                        Save Customer
                      </button>
                      <button
                        className="admin-button admin-button--danger"
                        onClick={() => {
                          setAdminState((current) => ({
                            ...current,
                            customers: current.customers.filter((customer) => customer.id !== selectedCustomer.id),
                          }));
                          setSelectedCustomerId(
                            adminState.customers.find((customer) => customer.id !== selectedCustomer.id)?.id ?? null
                          );
                          showFlash('Customer deleted.');
                        }}
                        type="button"
                      >
                        Delete Customer
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <section className={`admin-section ${activeSection === 'content' ? 'is-active' : ''}`}>
            <section className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <p className="admin-eyebrow">Homepage</p>
                  <h3>Storefront Content</h3>
                </div>
              </div>

              <div className="admin-form">
                <div className="admin-form--two">
                  <FormField label="Announcement Bar">
                    <input
                      onChange={(event) =>
                        setAdminState((current) => ({
                          ...current,
                          content: { ...current.content, announcement: event.target.value },
                        }))
                      }
                      value={adminState.content.announcement}
                    />
                  </FormField>
                  <FormField label="Hero Eyebrow">
                    <input onChange={(event) => updateHero('eyebrow', event.target.value)} value={adminState.content.hero.eyebrow} />
                  </FormField>
                  <FormField label="Primary CTA Label">
                    <input onChange={(event) => updateHero('primaryLabel', event.target.value)} value={adminState.content.hero.primaryLabel} />
                  </FormField>
                  <FormField label="Primary CTA Path">
                    <input onChange={(event) => updateHero('primaryPath', event.target.value)} value={adminState.content.hero.primaryPath} />
                  </FormField>
                  <FormField label="Secondary CTA Label">
                    <input onChange={(event) => updateHero('secondaryLabel', event.target.value)} value={adminState.content.hero.secondaryLabel} />
                  </FormField>
                  <FormField label="Secondary CTA Path">
                    <input onChange={(event) => updateHero('secondaryPath', event.target.value)} value={adminState.content.hero.secondaryPath} />
                  </FormField>
                  <FormField full label="Hero Title">
                    <textarea onChange={(event) => updateHero('title', event.target.value)} value={adminState.content.hero.title} />
                  </FormField>
                  <FormField full label="Hero Copy">
                    <textarea onChange={(event) => updateHero('copy', event.target.value)} value={adminState.content.hero.copy} />
                  </FormField>

                  {adminState.content.spotlightCards.map((card, index) => (
                    <div className="admin-field admin-field--full" key={card.id}>
                      <span>Spotlight Card {index + 1}</span>
                      <input onChange={(event) => updateSpotlightCard(index, 'title', event.target.value)} value={card.title} />
                      <textarea onChange={(event) => updateSpotlightCard(index, 'copy', event.target.value)} value={card.copy} />
                    </div>
                  ))}

                  {adminState.content.navigation.map((item, index) => (
                    <div className="admin-form--two admin-field--full" key={item.id}>
                      <FormField label={`Nav ${index + 1} Label`}>
                        <input onChange={(event) => updateNavigation(index, 'label', event.target.value)} value={item.label} />
                      </FormField>
                      <FormField label={`Nav ${index + 1} Path`}>
                        <input onChange={(event) => updateNavigation(index, 'path', event.target.value)} value={item.path} />
                      </FormField>
                    </div>
                  ))}
                </div>

                <div className="admin-form__actions">
                  <button className="admin-button admin-button--dark" onClick={() => showFlash('Storefront content updated.')} type="button">
                    Save Content
                  </button>
                </div>
              </div>
            </section>
          </section>

          <section className={`admin-section ${activeSection === 'policies' ? 'is-active' : ''}`}>
            <section className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <p className="admin-eyebrow">Compliance</p>
                  <h3>Policies</h3>
                </div>
              </div>

              <div className="admin-form">
                <FormField full label="Return & Exchange Policy">
                  <textarea
                    onChange={(event) =>
                      setAdminState((current) => ({
                        ...current,
                        policies: { ...current.policies, returns: event.target.value },
                      }))
                    }
                    value={adminState.policies.returns}
                  />
                </FormField>
                <FormField full label="Terms & Conditions">
                  <textarea
                    onChange={(event) =>
                      setAdminState((current) => ({
                        ...current,
                        policies: { ...current.policies, terms: event.target.value },
                      }))
                    }
                    value={adminState.policies.terms}
                  />
                </FormField>

                <div className="admin-form__actions">
                  <button className="admin-button admin-button--dark" onClick={() => showFlash('Policies updated.')} type="button">
                    Save Policies
                  </button>
                </div>
              </div>
            </section>
          </section>

          <section className={`admin-section ${activeSection === 'settings' ? 'is-active' : ''}`}>
            <section className="admin-panel">
              <div className="admin-panel__header">
                <div>
                  <p className="admin-eyebrow">Configuration</p>
                  <h3>Store Settings</h3>
                </div>
              </div>

              <div className="admin-form">
                <div className="admin-form--two">
                  <FormField label="Store Name">
                    <input
                      onChange={(event) =>
                        setAdminState((current) => ({
                          ...current,
                          settings: { ...current.settings, storeName: event.target.value },
                        }))
                      }
                      value={adminState.settings.storeName}
                    />
                  </FormField>
                  <FormField label="Support Email">
                    <input
                      onChange={(event) =>
                        setAdminState((current) => ({
                          ...current,
                          settings: { ...current.settings, supportEmail: event.target.value },
                        }))
                      }
                      value={adminState.settings.supportEmail}
                    />
                  </FormField>
                  <FormField label="Support Phone">
                    <input
                      onChange={(event) =>
                        setAdminState((current) => ({
                          ...current,
                          settings: { ...current.settings, supportPhone: event.target.value },
                        }))
                      }
                      value={adminState.settings.supportPhone}
                    />
                  </FormField>
                  <FormField label="Currency Code">
                    <input
                      onChange={(event) =>
                        setAdminState((current) => ({
                          ...current,
                          settings: { ...current.settings, currencyCode: event.target.value },
                        }))
                      }
                      value={adminState.settings.currencyCode}
                    />
                  </FormField>
                  <FormField full label="Support Address">
                    <textarea
                      onChange={(event) =>
                        setAdminState((current) => ({
                          ...current,
                          settings: { ...current.settings, supportAddress: event.target.value },
                        }))
                      }
                      value={adminState.settings.supportAddress}
                    />
                  </FormField>
                </div>

                <div className="admin-form__actions">
                  <button className="admin-button admin-button--dark" onClick={() => showFlash('Settings updated.')} type="button">
                    Save Settings
                  </button>
                </div>
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

export default AdminApp;
