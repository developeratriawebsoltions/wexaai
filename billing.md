Billing Logic Overview
Payment Gateway
Razorpay is used for all payments (INR currency).

Flow
User → Choose Plan → POST /api/billing/upgrade
     → Razorpay Order Created
     → Razorpay Checkout (frontend)
     → Payment Success
     → Razorpay Webhook → POST /api/billing/webhook
     → Subscription activated + Invoice + Payment saved
     → Workspace plan updated
     → Features unlocked

Copy
API Endpoints
Endpoint	Method	Purpose
GET /api/billing/subscription	GET	Fetch current plan & subscription
POST /api/billing/upgrade	POST	Create Razorpay order for a plan
PATCH /api/billing/cancel	PATCH	Mark subscription as cancelled
GET /api/billing/invoices	GET	List all invoices with plan details
GET /api/billing/usage	GET	Contacts, messages, AI credits, team count
POST /api/billing/webhook	POST	Razorpay webhook handler
Webhook Logic (core billing trigger)
[webhook/route.ts](c:\Users\ADMIN\Documents\Next-js\wexa-ai\src\app\api\billing\webhook\route.ts

Verifies Razorpay HMAC signature

Only processes payment.captured events

Extracts workspaceId + planId from payment notes

Upserts subscription → status: active, sets nextBillingDate (+1 month)

Creates Invoice record (INV-{timestamp}-{count})

Creates Payment record

Updates workspace.plan field

Creates a fresh usageLog entry (resets usage counters)

Plans Structure
Plan	Price	Contacts	Messages	AI Credits	Team
Free	₹0	100	500	100	1
Starter	₹999	5,000	20,000	5,000	3
Professional	₹2,999	25,000	1,00,000	25,000	10
Enterprise	Custom	Unlimited	Custom	Unlimited	Unlimited
Enterprise plan (price === 0) is blocked from self-serve upgrade — returns "Contact sales" error.

Feature Access Logic (from billing.txt)
Before any protected action (e.g. Broadcast):

Check subscription is active

Check usage is within plan limits

If exceeded → block and prompt upgrade

Currently, the usage counter increment after actions (like broadcasts) is not yet implemented in the broadcast route — the usageLog is only reset on new payment, but messages sent aren't being counted against limits.


