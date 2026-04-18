import { useCallback, useEffect, useRef, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { cn } from '../lib/cn';

export default function ProductsCarousel() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const autoRef = useRef<number | null>(null);
  const hoverRef = useRef(false);

  const goTo = useCallback((index: number, dir: 1 | -1 = 1) => {
    const normalized = (index + PRODUCTS.length) % PRODUCTS.length;
    setDirection(dir);
    setActive(normalized);
  }, []);

  const next = useCallback(() => goTo(active + 1, 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1, -1), [active, goTo]);

  // Auto advance, paused on hover
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!hoverRef.current) {
        setDirection(1);
        setActive((a) => (a + 1) % PRODUCTS.length);
      }
    }, 6500);
    autoRef.current = id;
    return () => {
      if (autoRef.current) window.clearInterval(autoRef.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev]);

  // Preload adjacent images
  useEffect(() => {
    const indexes = [active, (active + 1) % PRODUCTS.length, (active - 1 + PRODUCTS.length) % PRODUCTS.length];
    indexes.forEach((i) => {
      const img = new Image();
      img.src = PRODUCTS[i].image;
    });
  }, [active]);

  const product = PRODUCTS[active];

  return (
    <div
      className="relative"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 items-center">
        {/* Large image stage */}
        <div className="relative order-2 lg:order-1">
          <div className="relative aspect-square w-full max-w-xl mx-auto">
            <div className="absolute inset-[12%] rounded-full bg-gradient-to-br from-cream-200 via-gold-300/30 to-transparent blur-3xl" />

            {PRODUCTS.map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  'absolute inset-0 flex items-center justify-center transition-all duration-[900ms]',
                  'ease-[cubic-bezier(0.16,1,0.3,1)]',
                  i === active
                    ? 'opacity-100 scale-100 translate-x-0 rotate-0 z-10'
                    : i === (active + 1) % PRODUCTS.length
                    ? 'opacity-0 scale-75 translate-x-[40%] rotate-6 z-0'
                    : 'opacity-0 scale-75 -translate-x-[40%] -rotate-6 z-0',
                )}
                aria-hidden={i !== active}
              >
                <img
                  src={p.image}
                  alt={p.name}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="h-full w-full object-contain drop-shadow-[0_30px_60px_rgba(28,26,23,0.25)]"
                />
              </div>
            ))}

            {/* Giant index number */}
            <div className="absolute left-0 top-0 font-display text-[8rem] leading-none text-ink-900/5 select-none pointer-events-none">
              {String(active + 1).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="order-1 lg:order-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/5 px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-gold-600">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            {product.accent}
          </div>

          <h3
            key={`title-${product.id}`}
            className="mt-5 font-display text-4xl lg:text-5xl text-ink-900 leading-[1.05] fade-in-tilt"
          >
            {product.name}
          </h3>

          <p
            key={`desc-${product.id}`}
            className="mt-5 max-w-md text-lg text-ink-500 leading-relaxed fade-in-tilt"
            style={{ animationDelay: '80ms' }}
          >
            {product.description}
          </p>

          <ul className="mt-8 flex flex-wrap gap-2" key={`tags-${product.id}`}>
            {product.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-ink-900/15 bg-white px-4 py-1.5 text-xs uppercase tracking-[0.12em] text-ink-700"
              >
                {tag}
              </li>
            ))}
          </ul>

          <div className="mt-12 flex items-center gap-4">
            <button
              type="button"
              onClick={prev}
              aria-label="Предыдущий продукт"
              className="h-12 w-12 rounded-full border border-ink-900/20 text-ink-900 hover:bg-ink-900 hover:text-cream-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Следующий продукт"
              className="h-12 w-12 rounded-full bg-ink-900 text-cream-50 hover:bg-brand-700 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] inline-flex items-center justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            <div className="ml-2 flex items-center gap-2" role="tablist">
              {PRODUCTS.map((p, i) => (
                <button
                  type="button"
                  key={p.id}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Показать ${p.name}`}
                  onClick={() => goTo(i, i > active ? 1 : -1)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    i === active ? 'w-10 bg-brand-700' : 'w-4 bg-ink-900/20 hover:bg-ink-900/40',
                  )}
                />
              ))}
            </div>
          </div>

          {/* Progress meta */}
          <div className="mt-8 flex items-center gap-4 text-xs uppercase tracking-[0.18em] text-ink-500">
            <span>{String(active + 1).padStart(2, '0')} / {String(PRODUCTS.length).padStart(2, '0')}</span>
            <span className="h-px flex-1 bg-ink-900/15" />
            <span>{product.shortDescription}</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInTilt {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in-tilt {
          animation: fadeInTilt 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
    </div>
  );
}
