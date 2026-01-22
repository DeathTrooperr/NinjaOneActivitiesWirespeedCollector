# NinjaOne Activities Wirespeed Collector

This is a Cloudflare Worker that polls the NinjaOne API for activities and forwards them to a Wirespeed webhook.

## Overview

The collector uses a Cloudflare Durable Object to:
1. Periodically poll the NinjaOne API for new activities.
2. Maintain the state of the last processed activity ID to avoid duplicates.
3. Forward each activity to a configured Wirespeed webhook.

Polling occurs every 60 seconds using the Durable Object Alarm API.

## Setup

### Prerequisites

- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- NinjaOne API Credentials (Client ID and Client Secret)
- Wirespeed Webhook URL

### Configuration

The following environment variables need to be configured:

| Variable | Description |
| --- | --- |
| `NINJA_BASE_API` | The base URL for the NinjaOne API (e.g., `https://eu.ninjarmm.com` or `https://app.ninjarmm.com`). |
| `NINJA_CLIENT_ID` | Your NinjaOne API Client ID. |
| `NINJA_CLIENT_SECRET` | Your NinjaOne API Client Secret. |
| `WIRESPEED_WEBHOOK_URL` | The destination Wirespeed webhook URL. |
| `TEST_MODE` | If set to `"true"`, activities will be logged to the console instead of being posted to Wirespeed. |

### Deployment

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your secrets in Cloudflare:
   ```bash
   wrangler secret put NINJA_CLIENT_ID
   wrangler secret put NINJA_CLIENT_SECRET
   wrangler secret put WIRESPEED_WEBHOOK_URL
   ```
4. Update `wrangler.toml` with your `NINJA_BASE_API` and other non-sensitive variables.
5. Deploy the worker:
   ```bash
   npm run deploy
   # or
   wrangler deploy
   ```

## Initialization

After deployment, you must initialize the collector by visiting the `/init` endpoint of your worker:

```
https://ninja-collector.<your-subdomain>.workers.dev/init
```

This will:
1. Fetch activities from the last 24 hours.
2. Post them to Wirespeed (if `TEST_MODE` is not `"true"`).
3. Set the `lastActivityId` in Durable Object storage.
4. Schedule the first alarm to begin the 60-second polling cycle.

## License

ISC
