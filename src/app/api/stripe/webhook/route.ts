import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin, isAdminConfigured } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    console.error('Stripe secret key not configured');
    return NextResponse.json({ received: true });
  }

  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // If no webhook secret, parse the event directly (less secure, for development)
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, stripe);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    // Still return 200 to prevent Stripe from retrying
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  if (!isAdminConfigured()) {
    console.warn('Supabase admin not configured, skipping subscription update');
    return;
  }

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.warn('No user_id in checkout session metadata');
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.warn('No subscription ID in checkout session');
    return;
  }

  // Fetch subscription details from Stripe
  const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
  const sub = subscriptionResponse as Stripe.Subscription;

  // Get current period end from the first subscription item
  const firstItem = sub.items.data[0];
  const periodEnd = firstItem?.current_period_end;

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscriptionId,
    status: sub.status,
    price_id: firstItem?.price.id,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to upsert subscription:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (!isAdminConfigured()) {
    console.warn('Supabase admin not configured, skipping subscription update');
    return;
  }

  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.warn('No user_id in subscription metadata');
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // Get current period end from the first subscription item
  const firstItem = subscription.items.data[0];
  const periodEnd = firstItem?.current_period_end;

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: firstItem?.price.id,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to update subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  if (!isAdminConfigured()) {
    console.warn('Supabase admin not configured, skipping subscription update');
    return;
  }

  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.warn('No user_id in subscription metadata');
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to update subscription status:', error);
  }
}
