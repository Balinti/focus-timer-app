import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { APP_SLUG, APP_URL } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { priceId, userId, email } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User must be logged in to subscribe' },
        { status: 401 }
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || APP_URL;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        app_name: APP_SLUG,
        user_id: userId,
      },
      subscription_data: {
        metadata: {
          app_name: APP_SLUG,
          user_id: userId,
        },
      },
      success_url: `${appUrl}/pricing?success=true`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
