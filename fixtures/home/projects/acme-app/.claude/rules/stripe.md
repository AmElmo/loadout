---
paths:
  - "lib/stripe/**"
  - "app/api/webhooks/**"
  - "app/api/billing/**"
---
# Stripe Integration Rules

- Always verify webhook signatures with `stripe.webhooks.constructEvent()`
- Store Stripe customer ID and subscription ID in our database
- Handle these webhook events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
- Use idempotency keys for all Stripe API calls that create resources
- Never expose Stripe secret key to the client — use publishable key only
- All prices in cents — convert to display currency only in UI layer
