import type { Env, OAuthTokenResponse, NinjaActivitiesResponse, Activity } from './types/ninja.types';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      const id = env.COLLECTOR_DO.idFromName('singleton');
      const obj = env.COLLECTOR_DO.get(id);
      return await obj.fetch(request);
    }
    return new Response('Not found', { status: 404 });
  },
};

export class CollectorDO implements DurableObject {
  constructor(private state: DurableObjectState, private env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      const initialized = await this.state.storage.get<boolean>('initialized');
      if (initialized) {
        return new Response('Collector already initialized', { status: 200 });
      }
      await this.collectLogs(true);
      return new Response('Collector initialized');
    }
    return new Response('DO fetch', { status: 200 });
  }

  async alarm() {
    console.log('Alarm triggered, polling for new logs...');
    await this.collectLogs(false);
  }

  async collectLogs(init: boolean) {
    try {
      console.log(`Starting collectLogs(init=${init})`);
      const accessToken = await this.getAccessToken();
      
      let url = `${this.env.NINJA_BASE_API}/v2/activities?pageSize=1000`;
      
      if (init) {
        // Last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        url += `&after=${twentyFourHoursAgo}`;
      } else {
        const lastActivityId = await this.state.storage.get<number>('lastActivityId');
        if (lastActivityId) {
          url += `&newerThan=${lastActivityId}`;
        }
      }

      console.log(`Fetching from NinjaOne: ${url}`);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`NinjaOne API error: ${response.status} ${await response.text()}`);
      }

      const data = (await response.json()) as NinjaActivitiesResponse;
      console.log(`Fetched ${data.activities.length} activities`);

      if (data.activities.length > 0) {
        // Sort activities by ID just in case, though Ninja usually returns them ordered
        const sortedActivities = [...data.activities].sort((a, b) => a.id - b.id);
        
        // Post to Wirespeed
        for (const activity of sortedActivities) {
          await this.postToWirespeed(activity);
        }

        // Set lastActivityId to the highest ID we found
        const lastActivity = sortedActivities[sortedActivities.length - 1];
        if (lastActivity) {
          const newLastId = lastActivity.id;
          await this.state.storage.put('lastActivityId', newLastId);
          console.log(`Updated lastActivityId to ${newLastId}`);
        }
      } else if (data.lastActivityId && !init) {
          // If no activities, we do NOT update lastActivityId to ensure it stays the same
          console.log(`No new activities. lastActivityId remains ${await this.state.storage.get<number>('lastActivityId')}`);
      }

      // Mark as initialized if this was an init call
      if (init) {
        await this.state.storage.put('initialized', true);
      }

      // Schedule next run 60 seconds from the end of execution
      const alarmTime = Date.now() + 60 * 1000;
      await this.state.storage.setAlarm(alarmTime);
      console.log(`Scheduled next alarm for ${new Date(alarmTime).toISOString()}`);

    } catch (error) {
      console.error('Error in collectLogs:', error);
      await this.state.storage.setAlarm(Date.now() + 60 * 1000);
    }
  }

  private async getAccessToken(): Promise<string> {
    const url = `${this.env.NINJA_BASE_API}/ws/oauth/token`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.env.NINJA_CLIENT_ID,
        client_secret: this.env.NINJA_CLIENT_SECRET,
        scope: 'monitoring',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as OAuthTokenResponse;
    return data.access_token;
  }

  private async postToWirespeed(activity: Activity) {
    let payload: any = activity;

    if (this.env.PARSE_OCSF === 'true') {
      // Implement
    }

    if (this.env.TEST_MODE === 'true') {
      console.log(`[TEST_MODE] Would post activity ${activity.id} to Wirespeed:`, JSON.stringify(payload, null, 2));
      return;
    }

    const response = await fetch(this.env.WIRESPEED_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to post activity ${activity.id} to Wirespeed: ${response.status}`);
    }
  }
}

interface DurableObject {
    init?(): Promise<void>;
    alarm?(): Promise<void>;
}
