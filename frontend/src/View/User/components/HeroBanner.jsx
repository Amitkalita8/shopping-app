import { useEffect, useRef, useState } from 'react';
import { resolveProductImage } from '../productImages';

// Home page banner: one slide per collection, moving on every 3 seconds, also while the
// cursor is over it. It only waits while the browser tab is in the background.
export const SLIDE_INTERVAL_MS = 3000;

export const BANNER_SLIDES = [
  {
    id: 'sarees',
    eyebrow: 'Traditional',
    title: 'Banarasi & Tissue Sarees',
    path: '/collections/traditional/sarees',
    images: ['banarasi-saree-real.png', 'tissue-saree-real.png'],
    tone: 'saree',
  },
  {
    id: 'mens',
    eyebrow: "Men's Collection",
    title: 'Shirts & Tees for Every Day',
    path: '/collections/mens-collection/shirt',
    images: ['mens-shirt-real.png', 'mens-tshirt-real.png'],
    tone: 'mens',
  },
  {
    id: 'festive',
    eyebrow: 'Festive Edit',
    title: 'Kurtis & Mekhela Sador',
    path: '/collections/traditional/kurti-sets',
    images: ['kurti-set-real.png', 'mekhela-sador-real.png', 'single-kurti-real.png'],
    tone: 'festive',
  },
  {
    id: 'western',
    eyebrow: 'Women Western',
    title: 'Tops, Tees & Bottoms',
    path: '/collections/women-western/top',
    images: ['women-top-real.png', 'women-tshirt-real.png', 'women-bottoms-real.png'],
    tone: 'western',
  },
  {
    id: 'accessories',
    eyebrow: 'Accessories',
    title: 'Temple Jewellery & Potli Bags',
    path: '/collections/accessories',
    images: ['temple-jewelry-real.png', 'potli-bag-real.png'],
    tone: 'accessories',
  },
];

function HeroBanner({ onNavigate, slides = BANNER_SLIDES, interval = SLIDE_INTERVAL_MS }) {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [seen, setSeen] = useState(() => new Set([0, 1]));
  const touchStart = useRef(null);

  const count = slides.length;
  const paused = hidden;

  const goTo = (next) => {
    const target = (next + count) % count;
    setIndex(target);
    setSeen((current) => (current.has(target) && current.has((target + 1) % count)
      ? current
      : new Set([...current, target, (target + 1) % count])));
  };

  // A timeout per slide (not an interval) restarts the 3 seconds after every manual change.
  useEffect(() => {
    if (paused || count < 2) return undefined;
    const timer = setTimeout(() => goTo(index + 1), interval);
    return () => clearTimeout(timer);
    // goTo only depends on values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, count, interval]);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (!count) return null;

  return (
    <section
      aria-label="Featured collections"
      aria-roledescription="carousel"
      className="hero-banner"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') goTo(index - 1);
        if (event.key === 'ArrowRight') goTo(index + 1);
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const distance = event.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(distance) > 40) goTo(distance < 0 ? index + 1 : index - 1);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0].clientX;
      }}
    >
      <div className="hero-banner__viewport">
        <div className="hero-banner__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, slideIndex) => {
            const active = slideIndex === index;
            return (
              <article
                aria-hidden={!active}
                aria-label={`${slideIndex + 1} of ${count}`}
                aria-roledescription="slide"
                className={`hero-banner__slide hero-banner__slide--${slide.tone}`}
                inert={active ? undefined : true}
                key={slide.id}
              >
                <div className="hero-banner__copy">
                  <p className="hero-banner__eyebrow">{slide.eyebrow}</p>
                  <h2>{slide.title}</h2>
                  <button onClick={() => onNavigate(slide.path)} type="button">
                    Shop now
                  </button>
                </div>
                <div className={`hero-banner__images hero-banner__images--${slide.images.length}`}>
                  {slide.images.map((image, imageIndex) => (
                    <img
                      alt={imageIndex === 0 ? slide.title : ''}
                      decoding="async"
                      key={image}
                      // The current and next slide load now; the rest wait until they come close.
                      loading={seen.has(slideIndex) ? 'eager' : 'lazy'}
                      src={resolveProductImage(image)}
                    />
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {count > 1 ? (
          <>
            <button
              aria-label="Previous banner"
              className="hero-banner__arrow hero-banner__arrow--prev"
              onClick={() => goTo(index - 1)}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label="Next banner"
              className="hero-banner__arrow hero-banner__arrow--next"
              onClick={() => goTo(index + 1)}
              type="button"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="hero-banner__controls">
          <div className="hero-banner__dots">
            {slides.map((slide, slideIndex) => (
              <button
                aria-current={slideIndex === index ? 'true' : undefined}
                aria-label={`Show banner ${slideIndex + 1}: ${slide.title}`}
                className={slideIndex === index ? 'is-active' : undefined}
                key={slide.id}
                onClick={() => goTo(slideIndex)}
                type="button"
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default HeroBanner;
