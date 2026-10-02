# Delivery issue claims

## Setup

The claim table is included in the `orders` migrations. Apply it in each environment:

```powershell
python manage.py migrate
```

To enable vision-model comparison, set `OPENAI_API_KEY` in the backend environment. `OPENAI_VISION_MODEL` is optional and defaults to `gpt-4o-mini`. Never commit the API key. Without it, the app records a local image-similarity estimate and marks the result as uncertain for human review.

## Workflow

Customers can submit one image per purchased order item after the order is delivered. Uploads accept JPEG, PNG, or WebP up to 8 MB. Admins review the catalog image beside the submitted image, inspect the advisory analysis, and approve or reject the claim. Approval requires a refund processing date and sends the customer the decision by email; the message is also available in order details.

Image analysis is advisory and does not approve claims automatically. Claim approval records and communicates a refund date; it does not initiate a payment-provider refund. Refunds must still be processed through the existing payment workflow.
