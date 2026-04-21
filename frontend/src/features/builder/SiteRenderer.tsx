import React from 'react';

interface SectionContent {
  [key: string]: unknown;
}

interface Section {
  id?: string;
  type: string;
  content?: SectionContent;
  settings?: Record<string, unknown>;
}

interface Page {
  slug?: string;
  title?: string;
  sections?: Section[];
}

interface SiteSchema {
  siteName?: string;
  pages?: Page[];
  [key: string]: unknown;
}

// ── Section renderers ──────────────────────────────────────────

function Hero({ content }: { content: SectionContent }) {
  const title = String(content.title ?? content.heading ?? 'Xush kelibsiz');
  const desc = String(content.description ?? content.subtitle ?? '');
  const cta = String(content.ctaText ?? content.cta ?? content.button ?? '');
  return (
    <section className="py-24 px-6 text-center bg-gradient-to-b from-zinc-50 to-white">
      <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 max-w-4xl mx-auto leading-tight">
        {title}
      </h1>
      {desc && (
        <p className="mt-6 text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          {desc}
        </p>
      )}
      {cta && (
        <a
          href="#"
          className="inline-block mt-10 px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl shadow-lg hover:bg-zinc-800 transition-colors"
        >
          {cta}
        </a>
      )}
    </section>
  );
}

interface ListItem {
  title?: string;
  name?: string;
  desc?: string;
  description?: string;
  text?: string;
}

function Features({ content }: { content: SectionContent }) {
  const title = String(content.title ?? 'Xizmatlarimiz');
  const items: ListItem[] = (content.items as ListItem[]) ?? (content.features as ListItem[]) ?? [];
  return (
    <section className="py-20 px-6 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-black text-center text-zinc-900 mb-12">{title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="p-8 bg-white rounded-3xl border border-zinc-100 shadow-sm">
              <h3 className="text-xl font-bold text-zinc-900">{item.title ?? item.name ?? ''}</h3>
              <p className="mt-3 text-zinc-600">{item.desc ?? item.description ?? item.text ?? ''}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface StatItem {
  value?: string | number;
  number?: string | number;
  label?: string;
  title?: string;
}

function Stats({ content }: { content: SectionContent }) {
  const items: StatItem[] = (content.items as StatItem[]) ?? (content.stats as StatItem[]) ?? [];
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-5xl font-black text-zinc-900">{item.value ?? item.number ?? ''}</div>
            <div className="mt-2 text-sm font-semibold text-zinc-500 uppercase tracking-widest">
              {item.label ?? item.title ?? ''}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

interface PricingItem {
  name?: string;
  title?: string;
  price?: string | number;
  description?: string;
  cta?: string;
}

function Pricing({ content }: { content: SectionContent }) {
  const title = String(content.title ?? 'Tariflar');
  const items: PricingItem[] = (content.items as PricingItem[]) ?? (content.plans as PricingItem[]) ?? [];
  return (
    <section className="py-20 px-6 bg-zinc-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-black text-center text-zinc-900 mb-12">{title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="p-8 bg-white rounded-3xl border border-zinc-200 flex flex-col">
              <h3 className="text-xl font-bold text-zinc-900">{item.name ?? item.title ?? ''}</h3>
              <div className="mt-4 text-4xl font-black">{item.price ?? ''}</div>
              <p className="mt-3 text-zinc-600 flex-1">{item.description ?? ''}</p>
              <a href="#" className="mt-6 text-center px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl">
                {item.cta ?? 'Tanlash'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ content }: { content: SectionContent }) {
  const title = String(content.title ?? 'Bog\'lanish');
  const email = content.email ? String(content.email) : '';
  const phone = content.phone ? String(content.phone) : '';
  const address = content.address ? String(content.address) : '';
  return (
    <section className="py-20 px-6 bg-white text-center">
      <h2 className="text-4xl font-black text-zinc-900">{title}</h2>
      <div className="mt-6 space-y-2 text-zinc-600">
        {email && (
          <div>
            Email:{' '}
            <a className="underline" href={`mailto:${email}`}>
              {email}
            </a>
          </div>
        )}
        {phone && <div>Telefon: {phone}</div>}
        {address && <div>Manzil: {address}</div>}
      </div>
    </section>
  );
}

function About({ content }: { content: SectionContent }) {
  return <Hero content={content} />;
}

function Services({ content }: { content: SectionContent }) {
  return <Features content={content} />;
}

// ── Section map ────────────────────────────────────────────────

const SECTION_MAP: Record<string, React.FC<{ content: SectionContent }>> = {
  hero: Hero,
  features: Features,
  stats: Stats,
  pricing: Pricing,
  contact: Contact,
  about: About,
  services: Services,
};

// ── Schema normalizer — istalgan formatni standartga keltiradi ──

function normalizeSections(schema: SiteSchema): Section[] {
  // Format 1: {pages: [{sections: [...]}]}
  if (Array.isArray(schema.pages) && schema.pages.length > 0) {
    const page = schema.pages.find((p) => p.slug === 'home') ?? schema.pages[0];
    if (Array.isArray(page?.sections) && page.sections.length > 0) {
      return page.sections;
    }
  }

  // Format 2: {sections: [...]} — pages yo'q, to'g'ridan-to'g'ri
  if (Array.isArray((schema as Record<string, unknown>).sections)) {
    return (schema as Record<string, unknown>).sections as Section[];
  }

  // Format 3: Sxemaning o'zi section-like kalitlarga ega (hero, features, ...)
  const knownKeys = ['hero', 'features', 'services', 'about', 'stats', 'pricing', 'contact'];
  const inlineSections: Section[] = [];
  for (const key of knownKeys) {
    const val = (schema as Record<string, unknown>)[key];
    if (val && typeof val === 'object') {
      inlineSections.push({ id: key, type: key, content: val as SectionContent });
    }
  }
  if (inlineSections.length > 0) return inlineSections;

  // Format 4: pages mavjud lekin sections yo'q — pages ni section sifatida ko'rsatamiz
  if (Array.isArray(schema.pages) && schema.pages.length > 0) {
    return schema.pages.map((p, i) => ({
      id: `page-${i}`,
      type: 'hero',
      content: { title: p.title ?? p.slug ?? `Sahifa ${i + 1}`, description: '' },
    }));
  }

  return [];
}

// ── Main renderer ──────────────────────────────────────────────

export const SiteRenderer = React.memo(function SiteRenderer({
  schema,
}: {
  schema: SiteSchema | null | undefined;
}) {
  if (!schema) return null;

  const sections = normalizeSections(schema);

  if (sections.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-16 text-center">
        <div className="text-5xl mb-4">🏗️</div>
        <p className="font-bold text-zinc-500 mb-2">Sayt bo&apos;limlari topilmadi</p>
        <p className="text-zinc-400 text-sm">Chatda &quot;qaytadan yaratib ber&quot; deb yozing</p>
      </div>
    );
  }

  const siteName = String(schema.siteName ?? schema.name ?? '');

  return (
    <div className="w-full">
      {/* Navbar */}
      {siteName && (
        <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
          <span className="font-black text-lg text-zinc-900">{siteName}</span>
          <div className="flex gap-4 text-sm text-zinc-500">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="hover:text-zinc-900 transition-colors capitalize">
                {s.type}
              </a>
            ))}
          </div>
        </nav>
      )}

      {sections.map((section, i) => {
        const Component = SECTION_MAP[section.type?.toLowerCase() ?? ''];
        const content: SectionContent = (section.content as SectionContent) ?? {};
        if (!Component) {
          return (
            <div
              key={section.id ?? i}
              className="py-10 px-6 border border-dashed border-zinc-300 text-center text-zinc-400 m-6 rounded-3xl"
            >
              Bo&apos;lim: {section.type}
            </div>
          );
        }
        return (
          <div key={section.id ?? i} id={section.id}>
            <Component content={content} />
          </div>
        );
      })}
    </div>
  );
});
