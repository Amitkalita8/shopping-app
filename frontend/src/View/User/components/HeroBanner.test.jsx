import { act, fireEvent, render, screen } from '@testing-library/react';
import HeroBanner, { BANNER_SLIDES, SLIDE_INTERVAL_MS } from './HeroBanner';

function activeSlideTitle() {
  const slide = document.querySelector('.hero-banner__slide[aria-hidden="false"]');
  return slide.querySelector('h2').textContent;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('shows five banners and moves to the next one every 3 seconds, wrapping around', () => {
  render(<HeroBanner onNavigate={() => {}} />);

  expect(BANNER_SLIDES).toHaveLength(5);
  expect(SLIDE_INTERVAL_MS).toBe(3000);
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[0].title);

  act(() => jest.advanceTimersByTime(2999));
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[0].title);

  act(() => jest.advanceTimersByTime(1));
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[1].title);

  for (let i = 2; i < 5; i += 1) {
    act(() => jest.advanceTimersByTime(3000));
  }
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[4].title);

  act(() => jest.advanceTimersByTime(3000));
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[0].title);
});

test('keeps sliding while the cursor is over it and after a dot is clicked, with no pause button', () => {
  const { container } = render(<HeroBanner onNavigate={() => {}} />);
  const banner = container.querySelector('.hero-banner');

  fireEvent.mouseEnter(banner);
  fireEvent.mouseOver(banner);
  act(() => jest.advanceTimersByTime(3000));
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[1].title);

  const dot = screen.getByRole('button', { name: `Show banner 4: ${BANNER_SLIDES[3].title}` });
  dot.focus();
  fireEvent.click(dot);
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[3].title);
  act(() => jest.advanceTimersByTime(3000));
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[4].title);

  expect(screen.queryByRole('button', { name: /pause|play/i })).not.toBeInTheDocument();
});

test('arrows and dots change the banner, and Shop now opens its collection', () => {
  const onNavigate = jest.fn();
  render(<HeroBanner onNavigate={onNavigate} />);

  fireEvent.click(screen.getByRole('button', { name: 'Previous banner' }));
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[4].title);

  fireEvent.click(screen.getByRole('button', { name: `Show banner 3: ${BANNER_SLIDES[2].title}` }));
  expect(activeSlideTitle()).toBe(BANNER_SLIDES[2].title);

  // Only the visible banner's button can be reached.
  fireEvent.click(screen.getByRole('button', { name: 'Shop now' }));
  expect(onNavigate).toHaveBeenCalledWith(BANNER_SLIDES[2].path);
});
