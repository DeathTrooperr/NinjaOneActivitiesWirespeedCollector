# NinjaOne Activities Wirespeed Collector

A Cloudflare Worker that polls the NinjaOne API for activities and forwards them to a Wirespeed webhook.

## Overview

The collector uses a Cloudflare Durable Object to:
1.  **Periodically poll** the NinjaOne API for new activities.
2.  **Maintain state** of the last processed activity ID to ensure exactly-once processing (as much as possible).
3.  **Forward activities** to a configured Wirespeed webhook.

Polling occurs every 60 seconds using the Durable Object Alarm API, ensuring a persistent and reliable collection cycle.

## Setup

### Prerequisites

-   [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
-   NinjaOne API Credentials (Client ID and Client Secret) with `monitoring` scope.
-   Wirespeed Webhook URL.

### Configuration

#### Environment Variables & Secrets

The following variables should be configured in `wrangler.toml` or as secrets:

| Variable | Type | Description |
| --- | --- | --- |
| `NINJA_BASE_API` | Var | The base URL for the NinjaOne API (e.g., `https://eu.ninjarmm.com`). |
| `NINJA_CLIENT_ID` | Secret | Your NinjaOne API Client ID. |
| `NINJA_CLIENT_SECRET` | Secret | Your NinjaOne API Client Secret. |
| `WIRESPEED_WEBHOOK_URL` | Secret | The destination Wirespeed webhook URL. |
| `TEST_MODE` | Var | If set to `"true"`, activities are logged to the console instead of being posted. |
| `PARSE_OCSF` | Var | (Optional) If set to `"true"`, enables OCSF transformation (if implemented). |

### Deployment

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-repo/ninja-collector.git
    cd ninja-collector
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Secrets:**
    Set the sensitive credentials in Cloudflare:
    ```bash
    wrangler secret put NINJA_CLIENT_ID
    wrangler secret put NINJA_CLIENT_SECRET
    wrangler secret put WIRESPEED_WEBHOOK_URL
    ```

4.  **Update `wrangler.toml`:**
    Set `NINJA_BASE_API` and check `compatibility_date`.

5.  **Deploy:**
    ```bash
    npm run deploy
    ```

## Initialization

After deployment, the collector is idle. You **must** trigger the initialization:

```http
GET https://ninja-collector.<your-subdomain>.workers.dev/init
```

**What happens during initialization?**
1.  The worker fetches activities from the **last 24 hours**.
2.  It posts them to Wirespeed (unless `TEST_MODE` is active).
3.  It stores the `lastActivityId` to mark the starting point.
4.  It schedules the **first alarm** to start the 60-second polling loop.

## Monitoring & Logs

You can monitor the collector logs using wrangler:

```bash
wrangler tail
```

Look for `Starting collectLogs` and `Fetched X activities` to verify it's working correctly.