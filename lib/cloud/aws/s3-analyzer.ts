import {
  S3Client,
  ListBucketsCommand,
  GetBucketAclCommand,
  GetBucketPolicyStatusCommand,
  GetBucketEncryptionCommand,
  GetBucketLoggingCommand,
  GetBucketVersioningCommand,
  GetBucketLocationCommand,
} from '@aws-sdk/client-s3';
import type { CloudFinding, CloudAsset } from '../types';
import { randomUUID } from 'crypto';

// ─── S3 Security Analyzer ─────────────────────────────────────────────────
// Checks each bucket for: public access, encryption, logging, versioning.

export async function analyzeS3(client: S3Client): Promise<{
  findings: CloudFinding[];
  assets: CloudAsset[];
}> {
  const findings: CloudFinding[] = [];
  const assets: CloudAsset[] = [];

  try {
    const bucketsResp = await client.send(new ListBucketsCommand({}));
    const buckets = bucketsResp.Buckets ?? [];

    for (const bucket of buckets.slice(0, 30)) { // Cap at 30 buckets
      const name = bucket.Name!;

      // Get bucket region for accurate client
      let region = 'us-east-1';
      try {
        const locResp = await client.send(new GetBucketLocationCommand({ Bucket: name }));
        region = locResp.LocationConstraint ?? 'us-east-1';
      } catch {}

      assets.push({
        type: 'CLOUD_RESOURCE',
        name: `S3: ${name}`,
        value: `arn:aws:s3:::${name}`,
        region,
      });

      // ── Public access via policy ──────────────────────────────────────
      try {
        const policyStatus = await client.send(new GetBucketPolicyStatusCommand({ Bucket: name }));
        if (policyStatus.PolicyStatus?.IsPublic) {
          findings.push({
            id: randomUUID(),
            service: 'S3',
            resourceType: 'AWS::S3::Bucket',
            resourceId: `arn:aws:s3:::${name}`,
            resourceName: name,
            title: `S3 bucket "${name}" is publicly accessible via bucket policy`,
            description: `The bucket "${name}" has a bucket policy that grants public read or write access. Any internet user can access objects in this bucket.`,
            severity: 'CRITICAL',
            category: 'S3_EXPOSURE',
            recommendation: 'Remove or restrict the bucket policy to deny public access. Enable S3 Block Public Access settings at the bucket and account level.',
            evidence: { bucket: name, isPublicByPolicy: true, region },
          });
        }
      } catch {}

      // ── Public access via ACL ─────────────────────────────────────────
      try {
        const aclResp = await client.send(new GetBucketAclCommand({ Bucket: name }));
        const hasPublicAcl = (aclResp.Grants ?? []).some(g =>
          g.Grantee?.URI === 'http://acs.amazonaws.com/groups/global/AllUsers' ||
          g.Grantee?.URI === 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers'
        );
        if (hasPublicAcl) {
          findings.push({
            id: randomUUID(),
            service: 'S3',
            resourceType: 'AWS::S3::Bucket',
            resourceId: `arn:aws:s3:::${name}`,
            resourceName: name,
            title: `S3 bucket "${name}" has public ACL`,
            description: `The bucket "${name}" has an ACL granting access to AllUsers or AuthenticatedUsers (all AWS accounts). This exposes the bucket to unauthorized access.`,
            severity: 'CRITICAL',
            category: 'PUBLIC_ACCESS',
            recommendation: 'Set the bucket ACL to private and enable S3 Block Public Access. Migrate from ACL-based access to bucket policies.',
            evidence: { bucket: name, publicAcl: true, region },
          });
        }
      } catch {}

      // ── Encryption ────────────────────────────────────────────────────
      try {
        await client.send(new GetBucketEncryptionCommand({ Bucket: name }));
        // If no exception, encryption is configured
      } catch (err: any) {
        if (err.name === 'ServerSideEncryptionConfigurationNotFoundError' ||
            err.Code === 'ServerSideEncryptionConfigurationNotFoundError') {
          findings.push({
            id: randomUUID(),
            service: 'S3',
            resourceType: 'AWS::S3::Bucket',
            resourceId: `arn:aws:s3:::${name}`,
            resourceName: name,
            title: `S3 bucket "${name}" has no default encryption`,
            description: `The bucket "${name}" does not have default server-side encryption enabled. New objects will be stored unencrypted unless the upload request specifies encryption.`,
            severity: 'MEDIUM',
            category: 'ENCRYPTION_DISABLED',
            recommendation: 'Enable default SSE-S3 or SSE-KMS encryption on the bucket. This protects data at rest without affecting application code.',
            evidence: { bucket: name, encryptionEnabled: false, region },
          });
        }
      }

      // ── Access logging ────────────────────────────────────────────────
      try {
        const loggingResp = await client.send(new GetBucketLoggingCommand({ Bucket: name }));
        if (!loggingResp.LoggingEnabled) {
          findings.push({
            id: randomUUID(),
            service: 'S3',
            resourceType: 'AWS::S3::Bucket',
            resourceId: `arn:aws:s3:::${name}`,
            resourceName: name,
            title: `S3 bucket "${name}" has server access logging disabled`,
            description: `The bucket "${name}" does not have server access logging enabled. Without logging, you cannot audit who accessed objects in this bucket or detect unauthorized access.`,
            severity: 'LOW',
            category: 'LOGGING_DISABLED',
            recommendation: 'Enable S3 server access logging and store logs in a separate, dedicated logging bucket.',
            evidence: { bucket: name, loggingEnabled: false, region },
          });
        }
      } catch {}

      // ── Versioning ────────────────────────────────────────────────────
      try {
        const versionResp = await client.send(new GetBucketVersioningCommand({ Bucket: name }));
        if (versionResp.Status !== 'Enabled') {
          findings.push({
            id: randomUUID(),
            service: 'S3',
            resourceType: 'AWS::S3::Bucket',
            resourceId: `arn:aws:s3:::${name}`,
            resourceName: name,
            title: `S3 bucket "${name}" has versioning disabled`,
            description: `Versioning is not enabled on "${name}". Without versioning, accidentally deleted or overwritten objects cannot be recovered, and ransomware attacks can permanently destroy data.`,
            severity: 'LOW',
            category: 'IAM_MISCONFIGURATION',
            recommendation: 'Enable S3 versioning to protect against accidental deletion and ransomware. Configure lifecycle rules to manage version storage costs.',
            evidence: { bucket: name, versioningStatus: versionResp.Status ?? 'Not enabled', region },
          });
        }
      } catch {}
    }
  } catch (err: any) {
    console.error('[CloudSecurity] S3 analysis error:', err.message);
  }

  return { findings, assets };
}
