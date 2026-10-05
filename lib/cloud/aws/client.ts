import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { IAMClient } from '@aws-sdk/client-iam';
import { S3Client } from '@aws-sdk/client-s3';
import { EC2Client } from '@aws-sdk/client-ec2';

// ─── AWS Client Factory ────────────────────────────────────────────────────
// Uses the assume-role pattern. The platform's own AWS credentials assume
// the customer's read-only role, getting temporary credentials (1h TTL).
// No long-lived customer credentials are ever stored.

export interface AssumedCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
}

export async function assumeRole(
  roleArn: string,
  externalId?: string
): Promise<AssumedCredentials> {
  const sts = new STSClient({
    region: 'us-east-1',
    // Uses the platform's own AWS credentials from environment
    // CLOUD_AWS_ACCESS_KEY_ID and CLOUD_AWS_SECRET_ACCESS_KEY
    credentials: process.env.CLOUD_AWS_ACCESS_KEY_ID ? {
      accessKeyId: process.env.CLOUD_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUD_AWS_SECRET_ACCESS_KEY!,
    } : undefined,
  });

  const result = await sts.send(new AssumeRoleCommand({
    RoleArn: roleArn,
    RoleSessionName: 'ZyphorixGuardScan',
    DurationSeconds: 3600, // 1 hour
    ExternalId: externalId,
  }));

  const creds = result.Credentials;
  if (!creds?.AccessKeyId || !creds.SecretAccessKey || !creds.SessionToken) {
    throw new Error('Failed to assume role — check that the role ARN is correct and the trust policy allows this account');
  }

  return {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.SessionToken,
    expiration: creds.Expiration ?? new Date(Date.now() + 3600 * 1000),
  };
}

export function makeIAMClient(creds: AssumedCredentials): IAMClient {
  return new IAMClient({
    region: 'us-east-1',
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
}

export function makeS3Client(creds: AssumedCredentials, region = 'us-east-1'): S3Client {
  return new S3Client({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
}

export function makeEC2Client(creds: AssumedCredentials, region = 'us-east-1'): EC2Client {
  return new EC2Client({
    region,
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
    },
  });
}
