'use client';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FAQS } from '@/lib/marketing-content';

export function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="marketing-section relative max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24" style={{ zIndex: 1, borderTop: '1px solid rgba(148,163,184,0.08)' }}>
      <div className="text-center mb-12 animate-fade-up">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
          Questions
        </h2>
        <p className="mt-3 text-sm" style={{ color: '#94a3b8' }}>Everything else worth knowing before you sign up.</p>
      </div>

      {/* Each item is its own glass surface with a visible gap to the next,
          rather than divided rows sharing borders — that's what was
          reading as visually weak/cramped. */}
      <div className="space-y-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className="marketing-glass rounded-xl overflow-hidden transition-colors"
              style={{
                background: isOpen ? 'linear-gradient(105deg, rgba(37,99,235,0.16), rgba(15,23,42,0.5))' : 'rgba(15,23,42,0.38)',
                border: `1px solid ${isOpen ? 'rgba(96,165,250,0.42)' : 'rgba(147,197,253,0.14)'}`,
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-medium">{item.q}</span>
                <ChevronDown
                  size={16}
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{ color: '#60a5fa', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                />
              </button>
              <div
                className="grid transition-all duration-200 ease-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="text-sm leading-relaxed px-5 pb-5" style={{ color: '#94a3b8' }}>
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
