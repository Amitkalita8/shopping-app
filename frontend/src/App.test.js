import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { cloneStorefront, mockStorefrontApi } from './testing/mockStorefront';

const heroTitle = /sharper category pages, cleaner routing, and the old sidebar structure back in place/i;

beforeEach(() => {
  window.history.pushState({}, '', '/');
  mockStorefrontApi();
});

afterEach(() => {
  delete global.fetch;
});

test('shows a loading state, then the home page from the api', async () => {
  render(<App />);

  expect(screen.getByRole('status')).toHaveTextContent(/loading the store/i);

  expect(await screen.findByRole('heading', { name: heroTitle, level: 1 })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/v1\/storefront$/);
});

test('renders whatever the database returns, not built-in text', async () => {
  const bundle = cloneStorefront();
  bundle.settings.storeName = 'Northwind Fashion';
  bundle.content.hero.title = 'A brand new hero headline';
  bundle.content.hero.primaryLabel = 'Shop the drop';
  bundle.content.navigation[0].label = 'Menswear';
  bundle.content.spotlightCards[0].title = 'Editors pick';
  bundle.products.find((product) => product.id === 'banarasi-saree').title = 'Renamed Silk Saree';
  bundle.products.find((product) => product.id === 'banarasi-saree').price = 5555;
  mockStorefrontApi(bundle);

  render(<App />);

  expect(await screen.findByRole('heading', { name: 'A brand new hero headline', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Shop the drop' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Menswear' })).toBeInTheDocument();
  expect(screen.getByText('Northwind Fashion')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Editors pick' })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { name: 'Renamed Silk Saree' }).length).toBeGreaterThan(0);
  expect(screen.getAllByText('Rs 5,555').length).toBeGreaterThan(0);
  expect(screen.queryByText(/banarasi silk saree with blouse piece/i)).not.toBeInTheDocument();
});

test('home page shows the featured strip and the titled sections in the api order', async () => {
  const { container } = render(<App />);
  await screen.findByRole('heading', { name: heroTitle, level: 1 });

  const strip = container.querySelector('.featured-strip');
  expect(within(strip).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
    'Banarasi Silk Saree With Blouse Piece',
    'Festive Kurti Set With Dupatta',
    "Men's Striped Resort Shirt",
    "Women's Satin Drape Top",
  ]);

  const sections = container.querySelectorAll('.collection-preview');
  expect([...sections].map((section) => section.querySelector('h2').textContent)).toEqual([
    "Men's and Western Edits",
    'Traditional Picks',
  ]);
});

test('opens the sidebar and navigates to a collection url', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: heroTitle, level: 1 });

  fireEvent.click(screen.getByRole('button', { name: /open shop menu/i }));

  expect(screen.getAllByRole('button', { name: /men's collection/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /women western/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /traditional/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /accessories/i }).length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByRole('button', { name: /traditional/i }).slice(-1)[0]);

  expect(screen.getByRole('button', { name: /kurti sets/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^sarees$/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^sarees$/i }));

  expect(screen.getByRole('heading', { name: /^sarees$/i, level: 1 })).toBeInTheDocument();
  expect(screen.queryByText(/^view as$/i)).not.toBeInTheDocument();
  expect(window.location.pathname).toBe('/collections/traditional/sarees');
  expect(document.title).toBe('Sarees | Atelier PS Vogue');
});

test('a collection page lists its products in the order the api gives', async () => {
  window.history.pushState({}, '', '/collections/mens-collection/shirt');
  render(<App />);

  expect(await screen.findByRole('heading', { name: "Men's Shirt", level: 1 })).toBeInTheDocument();
  expect(screen.getByText(/a sharper shirt lineup with resort stripes/i)).toBeInTheDocument();
  expect(screen.getByText('2 styles')).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
    "Men's Striped Resort Shirt",
    "Men's Oxford Everyday Shirt",
  ]);
});

test('opens the cart drawer from add to cart on the collection page', async () => {
  window.history.pushState({}, '', '/collections/traditional/sarees');
  render(<App />);

  fireEvent.click((await screen.findAllByRole('button', { name: /add to cart/i }))[0]);

  expect(screen.getByText(/item added to your cart/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /view my cart \(1\)/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cart 1 items/i })).toBeInTheDocument();
});

test('opens a product details page with zoom preview when a product is clicked', async () => {
  window.history.pushState({}, '', '/collections/traditional/sarees');
  const { container } = render(<App />);

  fireEvent.click(
    await screen.findByRole('button', { name: /view details for banarasi silk saree with blouse piece/i })
  );

  expect(
    screen.getByRole('heading', { name: /banarasi silk saree with blouse piece/i, level: 1 })
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe('/products/banarasi-saree');

  const zoomArea = screen.getByLabelText(/product image zoom area/i);
  const zoomPanel = container.querySelector('.product-detail__zoom-panel');

  expect(zoomPanel).not.toHaveClass('is-active');

  fireEvent.mouseEnter(zoomArea);
  fireEvent.mouseMove(zoomArea, { clientX: 120, clientY: 120 });

  expect(zoomPanel).toHaveClass('is-active');
});

test('the product page shows its copy, offer text and policies from the api', async () => {
  window.history.pushState({}, '', '/products/banarasi-saree');
  const { container } = render(<App />);

  expect(await screen.findByRole('button', { name: /back to traditional/i })).toBeInTheDocument();
  expect(screen.getByText('Inclusive of all taxes. Free shipping above Rs 1500.')).toBeInTheDocument();
  expect(screen.getByText('Authentic and quality assured')).toBeInTheDocument();
  expect(screen.getByText('Also get extra instant Rs 200 off on prepaid orders.')).toBeInTheDocument();
  expect(screen.getByText(/is part of the traditional edit/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /shipping/i }));
  expect(screen.getByText(/ships in 2-4 working days with secure packaging/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^return policy$/i }));
  const policy = container.querySelector('.policy-modal');
  expect(within(policy).getByRole('heading', { name: 'Return & Exchange Policy' })).toBeInTheDocument();
  expect(within(policy).getByRole('heading', { name: 'Non-Returnable Items' })).toBeInTheDocument();
  expect(within(policy).getByText('Customized or personalized items.')).toBeInTheDocument();
});

test('an unknown address falls back to the home page', async () => {
  window.history.pushState({}, '', '/collections/does-not-exist');
  render(<App />);

  expect(await screen.findByRole('heading', { name: heroTitle, level: 1 })).toBeInTheDocument();
});

test('shows an error with a retry button when the store data cannot be loaded', async () => {
  let shouldFail = true;
  const working = cloneStorefront();
  global.fetch = jest.fn(() =>
    shouldFail
      ? Promise.reject(new Error('offline'))
      : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(working) })
  );

  render(<App />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/could not load the store/i);

  shouldFail = false;
  fireEvent.click(screen.getByRole('button', { name: /try again/i }));

  expect(await screen.findByRole('heading', { name: heroTitle, level: 1 })).toBeInTheDocument();
});

test('reports a server error instead of an empty store', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) }));

  render(<App />);

  expect(await screen.findByRole('alert')).toHaveTextContent(/503/);
});
