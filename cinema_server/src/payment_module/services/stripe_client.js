import Stripe from 'stripe';

let stripeClient = null;

export function getStripe() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey)
      throw new Error('STRIPE_SECRET_KEY is not defined in .env');

    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}
