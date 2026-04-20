'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out our AI builder.',
    features: ['1 Project', '3 Pages per project', '10 AI generations', 'Basic support'],
    cta: 'Start for Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    description: 'Best for growing businesses and creators.',
    features: ['10 Projects', 'Unlimited Pages', '100 AI generations', 'SEO optimization', 'Custom domains', 'Priority support'],
    cta: 'Get Started',
    popular: true,
  },
  {
    name: 'Agency',
    price: '$49',
    description: 'For power users and professional agencies.',
    features: ['Unlimited Projects', 'Unlimited Pages', 'Unlimited generations', 'White-labeling', 'API Access', 'Dedicated manager'],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Simple, transparent pricing</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Choose the plan that's right for you. All plans include access to our cutting-edge AI builder.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-8 rounded-3xl border ${tier.popular ? 'border-purple-500 bg-purple-500/5' : 'border-white/10 bg-white/5'} flex flex-col`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-600 rounded-full text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> MOST POPULAR
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="mt-4 text-gray-400 text-sm leading-relaxed">{tier.description}</p>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {tier.features.map((feature, j) => (
                  <div key={j} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>

              <Link href="/register">
                <Button className={`w-full py-6 rounded-2xl font-bold transition-all ${tier.popular ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-white text-black hover:bg-gray-200'}`}>
                  {tier.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
