export const STORAGE_KEY = 'atelier-admin-state-v2';

export const DEFAULT_ADMIN_STATE = {
  settings: {
    storeName: 'Atelier PS Vogue',
    supportEmail: 'support@atelierpsvogue.com',
    supportPhone: '+91 98765 43210',
    supportAddress: 'GS Road, Guwahati, Assam 781005',
    currencyCode: 'INR',
  },
  content: {
    announcement: 'Get upto 15% OFF + 200Rs extra discounts on all prepaid orders.',
    hero: {
      eyebrow: 'Editorial storefront',
      title: 'Sharper category pages, cleaner routing, and the old sidebar structure back in place.',
      copy:
        'Browse the exact sidebar groups you asked for, open dedicated URLs for each option, and move straight into product pages without the extra View as strip.',
      primaryLabel: 'Shop Sarees',
      primaryPath: '/collections/traditional/sarees',
      secondaryLabel: "Browse Men's T shirts",
      secondaryPath: '/collections/mens-collection/t-shirt',
    },
    spotlightCards: [
      {
        id: 'spotlight-men',
        title: "Men's Collection",
        copy: 'Relaxed everyday T shirts and polished shirts grouped under one quick drawer section.',
      },
      {
        id: 'spotlight-traditional',
        title: 'Traditional Edit',
        copy: 'Kurti sets, single kurtis, sarees, and Mekhela Sador each get their own route and page.',
      },
    ],
    navigation: [
      { id: 'nav-men', label: "Men's collection", path: '/collections/mens-collection/t-shirt' },
      { id: 'nav-women', label: 'Women Western', path: '/collections/women-western/t-shirt' },
      { id: 'nav-traditional', label: 'Traditional', path: '/collections/traditional/sarees' },
      { id: 'nav-accessories', label: 'Accessories', path: '/collections/accessories' },
    ],
  },
  collections: [
    {
      id: 'mens-tshirts',
      label: "Men's T shirt",
      breadcrumb: "Men's collection",
      path: '/collections/mens-collection/t-shirt',
      description: 'Soft basics, oversized fits, and clean casual layers for the everyday menswear edit.',
      productIds: ['mens-classic-cotton-tshirt', 'mens-graphic-oversized-tshirt'],
      sortOptions: ['Featured', 'Best selling', 'Price, low to high'],
    },
    {
      id: 'women-tops',
      label: "Women's Top",
      breadcrumb: 'Women Western',
      path: '/collections/women-western/top',
      description: 'Draped tops and easy occasion-ready silhouettes with polished finishing.',
      productIds: ['women-satin-top', 'women-wrap-top'],
      sortOptions: ['Featured', 'Newest', 'Price, low to high'],
    },
    {
      id: 'sarees',
      label: 'Sarees',
      breadcrumb: 'Traditional',
      path: '/collections/traditional/sarees',
      description: 'Festive sarees with premium drape, occasion styling, and statement detailing.',
      productIds: ['banarasi-saree', 'tissue-saree'],
      sortOptions: ['Featured', 'Best selling', 'Price, high to low'],
    },
  ],
  products: [
    {
      id: 'mens-classic-cotton-tshirt',
      title: "Men's Classic Cotton T Shirt",
      category: "Men's collection",
      path: '/collections/mens-collection/t-shirt',
      price: 899,
      compareAt: 1499,
      badge: 'Best Seller',
      color: 'Charcoal',
      theme: 'midnight',
      status: 'Active',
      inventory: 18,
      sku: 'MEN-TS-001',
      imageRef: 'mens-tshirt-real.png',
    },
    {
      id: 'women-satin-top',
      title: "Women's Satin Drape Top",
      category: 'Women Western',
      path: '/collections/women-western/top',
      price: 1199,
      compareAt: 1799,
      badge: 'Popular',
      color: 'Rose Gold',
      theme: 'rose',
      status: 'Active',
      inventory: 9,
      sku: 'WOM-TOP-004',
      imageRef: 'women-top-real.png',
    },
    {
      id: 'banarasi-saree',
      title: 'Banarasi Silk Saree With Blouse Piece',
      category: 'Traditional',
      path: '/collections/traditional/sarees',
      price: 2949,
      compareAt: 6749,
      badge: '56% OFF',
      color: 'Maroon',
      theme: 'maroon',
      status: 'Active',
      inventory: 4,
      sku: 'TRD-SAR-008',
      imageRef: 'banarasi-saree-real.png',
    },
    {
      id: 'embroidered-potli-bag',
      title: 'Embroidered Potli Bag',
      category: 'Accessories',
      path: '/collections/accessories',
      price: 899,
      compareAt: 1299,
      badge: 'New',
      color: 'Rust Gold',
      theme: 'terracotta',
      status: 'Draft',
      inventory: 7,
      sku: 'ACC-POT-011',
      imageRef: 'potli-bag-real.png',
    },
  ],
  orders: [
    {
      id: 'ORD-1001',
      customerName: 'Riya Sharma',
      customerEmail: 'riya@example.com',
      items: 'Banarasi Silk Saree With Blouse Piece x1',
      total: 2949,
      paymentStatus: 'Paid',
      fulfillmentStatus: 'Processing',
      trackingNumber: 'TRK882100',
      createdAt: '2026-07-10',
      notes: 'Gift wrap requested.',
    },
    {
      id: 'ORD-1002',
      customerName: 'Aman Das',
      customerEmail: 'aman@example.com',
      items: "Men's Classic Cotton T Shirt x2",
      total: 1798,
      paymentStatus: 'Paid',
      fulfillmentStatus: 'Shipped',
      trackingNumber: 'TRK882101',
      createdAt: '2026-07-09',
      notes: '',
    },
    {
      id: 'ORD-1003',
      customerName: 'Madhuri Sen',
      customerEmail: 'madhuri@example.com',
      items: "Women's Satin Drape Top x1",
      total: 1199,
      paymentStatus: 'Pending',
      fulfillmentStatus: 'Pending',
      trackingNumber: '',
      createdAt: '2026-07-08',
      notes: 'Waiting for payment confirmation.',
    },
  ],
  customers: [
    {
      id: 'CUS-1001',
      name: 'Riya Sharma',
      email: 'riya@example.com',
      mobile: '+91 99880 77889',
      city: 'Guwahati',
      tier: 'Gold',
      ordersCount: 5,
      totalSpend: 10450,
      status: 'Active',
    },
    {
      id: 'CUS-1002',
      name: 'Aman Das',
      email: 'aman@example.com',
      mobile: '+91 98989 88989',
      city: 'Shillong',
      tier: 'Silver',
      ordersCount: 2,
      totalSpend: 3097,
      status: 'Active',
    },
    {
      id: 'CUS-1003',
      name: 'Madhuri Sen',
      email: 'madhuri@example.com',
      mobile: '+91 90909 80808',
      city: 'Kolkata',
      tier: 'New',
      ordersCount: 1,
      totalSpend: 1199,
      status: 'Review',
    },
  ],
  policies: {
    returns: `Return & Exchange Policy

Products can be returned or exchanged within 7 days of delivery.
Items must be unused, unwashed, undamaged, and in their original packaging with all tags attached.
A valid order number or proof of purchase is required.

Non-returnable items include used or damaged products, items without original tags or packaging, customized products, earrings, and select accessories for hygiene reasons.

Damaged or incorrect products must be reported within 48 hours of delivery with photographs of the item and packaging.

Refunds are processed after inspection and credited back to the original payment method within 7-10 business days.`,
    terms: `Terms & Conditions

Users must provide accurate and complete registration information and protect their credentials.
Product descriptions, pricing, and availability may be updated without prior notice.
Order submission does not guarantee order acceptance.
Payments must be completed through approved methods before order processing where applicable.
All site content is the intellectual property of the company.
Misuse, fraudulent activity, and unauthorized access may result in legal action.
These terms are governed by the laws of India.`,
  },
};

export function cloneAdminState() {
  return JSON.parse(JSON.stringify(DEFAULT_ADMIN_STATE));
}
