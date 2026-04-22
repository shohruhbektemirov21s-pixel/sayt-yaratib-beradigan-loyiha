'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Sparkles, Globe, Terminal, Cpu, Mail } from 'lucide-react';
import { Link } from '@/i18n/routing';

export function PremiumFooter() {
  const t = useTranslations('Footer');

  const links = {
    product: [t('product'), 'Features', 'Pricing', 'Showcase', 'API'],
    company: [t('company'), 'About', 'Blog', 'Careers', 'Contact'],
    legal: [t('legal'), 'Privacy', 'Terms', 'Cookie Policy', 'Licenses']
  };

  return (
    <footer className="bg-black pt-32 pb-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-24">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">
                NanoStUp
              </span>
            </Link>
            <p className="text-zinc-500 text-lg max-w-sm font-medium leading-relaxed">
              {t('desc')}
            </p>
            <div className="flex items-center gap-4 mt-8">
              {[Globe, Terminal, Cpu, Mail].map((Icon, i) => (
                <button key={i} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>


          {Object.entries(links).map(([key, items]) => (
            <div key={key}>
              <h4 className="text-white font-bold mb-6">{items[0]}</h4>
              <ul className="space-y-4">
                {items.slice(1).map((item) => (
                  <li key={item}>
                    <button className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:row items-center justify-between gap-6">
          <p className="text-zinc-600 text-sm font-medium">
            © {new Date().getFullYear()} NanoStUp. {t('rights')}
          </p>
          <div className="flex items-center gap-6 text-sm font-bold text-zinc-600">
             <span className="w-2 h-2 rounded-full bg-emerald-500" />
             SYSTEMS OPERATIONAL
          </div>
        </div>
      </div>
    </footer>
  );
}
