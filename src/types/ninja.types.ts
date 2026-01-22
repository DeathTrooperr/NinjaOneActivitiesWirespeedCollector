export interface Env {
  NINJA_BASE_API: string;
  NINJA_CLIENT_ID: string;
  NINJA_CLIENT_SECRET: string;
  WIRESPEED_WEBHOOK_URL: string;
  TEST_MODE?: string;
  PARSE_OCSF?: string;
  COLLECTOR_DO: DurableObjectNamespace;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface Activity {
  id: number;
  activityTime: number;
  deviceId: number;
  severity: string;
  priority: string;
  seriesUid: string;
  activityType: string;
  statusCode: string;
  status: string;
  activityResult: string;
  sourceConfigUid: string;
  sourceName: string;
  subject: string;
  userId: number;
  message: string;
  type: string;
  data: any;
}

export interface NinjaActivitiesResponse {
  lastActivityId: number;
  activities: Activity[];
}
