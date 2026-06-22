import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

test('opens the sidebar and navigates to a collection url', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', {
      name: /sharper category pages, cleaner routing, and the old sidebar structure back in place/i,
      level: 1,
    })
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /open shop menu/i }));

  expect(screen.getAllByRole('button', { name: /men's collection/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /women western/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /traditional/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /accessories/i }).length).toBeGreaterThan(0);

  fireEvent.click(screen.getAllByRole('button', { name: /traditional/i }).slice(-1)[0]);

  expect(screen.getByRole('button', { name: /kurti sets/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^sarees$/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /^sarees$/i }));

  expect(
    screen.getByRole('heading', {
      name: /^sarees$/i,
      level: 1,
    })
  ).toBeInTheDocument();
  expect(screen.queryByText(/^view as$/i)).not.toBeInTheDocument();
  expect(window.location.pathname).toBe('/collections/traditional/sarees');
});

test('opens the cart drawer from add to cart on the collection page', () => {
  window.history.pushState({}, '', '/collections/traditional/sarees');
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: /add to cart/i })[0]);

  expect(screen.getByText(/item added to your cart/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /view my cart \(1\)/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /cart 1 items/i })).toBeInTheDocument();
});

test('opens a product details page with zoom preview when a product is clicked', () => {
  window.history.pushState({}, '', '/collections/traditional/sarees');
  const { container } = render(<App />);

  fireEvent.click(
    screen.getByRole('button', {
      name: /view details for banarasi silk saree with blouse piece/i,
    })
  );

  expect(
    screen.getByRole('heading', {
      name: /banarasi silk saree with blouse piece/i,
      level: 1,
    })
  ).toBeInTheDocument();
  expect(window.location.pathname).toBe('/products/banarasi-saree');

  const zoomArea = screen.getByLabelText(/product image zoom area/i);
  const zoomPanel = container.querySelector('.product-detail__zoom-panel');

  expect(zoomPanel).not.toHaveClass('is-active');

  fireEvent.mouseEnter(zoomArea);
  fireEvent.mouseMove(zoomArea, { clientX: 120, clientY: 120 });

  expect(zoomPanel).toHaveClass('is-active');
});
