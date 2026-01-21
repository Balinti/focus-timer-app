'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PLANS } from '@/lib/constants';
import { getSupabaseClient, isAppSupabaseConfigured } from '@/lib/supabaseClient';

export default function PricingPage() {
  const { user, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !isAppSupabaseConfigured()) return;

      const supabase = getSupabaseClient();
      if (!supabase) return;

      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('status, price_id')
          .eq('user_id', user.id)
          .single();

        if (data?.status === 'active') {
          if (data.price_id === PLANS.proPlus.priceId) {
            setCurrentPlan('proPlus');
          } else {
            setCurrentPlan('pro');
          }
        }
      } catch {
        // No subscription found
      }
    };

    checkSubscription();
  }, [user]);

  const handleUpgrade = async (planKey: 'pro' | 'proPlus') => {
    const plan = PLANS[planKey];

    if (!plan.priceId) {
      alert('Pricing not configured. Please contact support.');
      return;
    }

    if (!user) {
      signInWithGoogle();
      return;
    }

    setLoading(planKey);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (e) {
      console.error('Checkout error:', e);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const hasProPricing = !!PLANS.pro.priceId;
  const hasProPlusPricing = !!PLANS.proPlus.priceId && !PLANS.proPlus.comingSoon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Start free. Upgrade when you need more power.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <PlanCard
            name={PLANS.free.name}
            price="$0"
            description="Perfect for getting started"
            features={PLANS.free.features}
            buttonText={currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
            buttonDisabled={currentPlan === 'free'}
            highlighted={false}
          />

          {/* Pro Plan */}
          <PlanCard
            name={PLANS.pro.name}
            price={`$${PLANS.pro.price}`}
            period="/month"
            description="For serious focus protection"
            features={PLANS.pro.features}
            buttonText={
              !hasProPricing
                ? 'Pricing not configured'
                : currentPlan === 'pro'
                ? 'Current Plan'
                : loading === 'pro'
                ? 'Loading...'
                : user
                ? 'Upgrade to Pro'
                : 'Sign in to Upgrade'
            }
            buttonDisabled={!hasProPricing || currentPlan === 'pro' || loading === 'pro'}
            onClick={() => handleUpgrade('pro')}
            highlighted={true}
          />

          {/* Pro+ Plan */}
          <PlanCard
            name={PLANS.proPlus.name}
            price={`$${PLANS.proPlus.price}`}
            period="/month"
            description="For teams and power users"
            features={PLANS.proPlus.features}
            buttonText={
              PLANS.proPlus.comingSoon
                ? 'Coming Soon'
                : !hasProPlusPricing
                ? 'Pricing not configured'
                : currentPlan === 'proPlus'
                ? 'Current Plan'
                : loading === 'proPlus'
                ? 'Loading...'
                : user
                ? 'Upgrade to Pro+'
                : 'Sign in to Upgrade'
            }
            buttonDisabled={true}
            highlighted={false}
            comingSoon={PLANS.proPlus.comingSoon}
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <FaqItem
              question="Can I use FocusShield without signing in?"
              answer="Yes! You can start focus sessions and capture ship notes without an account. Your data is stored locally in your browser. Sign in to sync across devices."
            />
            <FaqItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards through Stripe. Your payment information is never stored on our servers."
            />
            <FaqItem
              question="Can I cancel my subscription anytime?"
              answer="Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
            />
            <FaqItem
              question="What happens to my data if I downgrade?"
              answer="Your data is never deleted. On the free plan, you'll have limited access to historical reports, but all your sessions and notes remain safely stored."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  buttonDisabled,
  onClick,
  highlighted,
  comingSoon,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonDisabled: boolean;
  onClick?: () => void;
  highlighted: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-8 ${
        highlighted
          ? 'bg-blue-600 text-white ring-4 ring-blue-600/20 dark:ring-blue-400/20'
          : 'bg-white dark:bg-gray-800'
      } ${comingSoon ? 'opacity-75' : ''}`}
    >
      {highlighted && (
        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
          Most Popular
        </span>
      )}
      {comingSoon && (
        <span className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full text-sm font-medium mb-4">
          Coming Soon
        </span>
      )}

      <h3
        className={`text-xl font-bold mb-2 ${
          highlighted ? 'text-white' : 'text-gray-900 dark:text-white'
        }`}
      >
        {name}
      </h3>

      <div className="flex items-baseline gap-1 mb-2">
        <span
          className={`text-4xl font-bold ${
            highlighted ? 'text-white' : 'text-gray-900 dark:text-white'
          }`}
        >
          {price}
        </span>
        {period && (
          <span
            className={highlighted ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}
          >
            {period}
          </span>
        )}
      </div>

      <p
        className={`text-sm mb-6 ${
          highlighted ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {description}
      </p>

      <button
        onClick={onClick}
        disabled={buttonDisabled}
        className={`w-full py-3 rounded-lg font-medium transition-colors mb-6 ${
          highlighted
            ? 'bg-white text-blue-600 hover:bg-blue-50 disabled:bg-white/80 disabled:text-blue-400'
            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400'
        } disabled:cursor-not-allowed`}
      >
        {buttonText}
      </button>

      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <svg
              className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                highlighted ? 'text-blue-200' : 'text-green-500'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span
              className={`text-sm ${
                highlighted ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {feature}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{question}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{answer}</p>
    </div>
  );
}
