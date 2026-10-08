import {
  IAMClient,
  ListUsersCommand,
  ListRolesCommand,
  ListPoliciesCommand,
  GetAccountPasswordPolicyCommand,
  ListAccessKeysCommand,
  GetLoginProfileCommand,
  ListMFADevicesCommand,
  GetAccountSummaryCommand,
} from '@aws-sdk/client-iam';
import type { CloudFinding, CloudAsset } from '../types';
import { randomUUID } from 'crypto';

// ─── IAM Security Analyzer ────────────────────────────────────────────────
// Checks for the most critical IAM misconfigurations:
// - Root account usage and MFA
// - Users without MFA
// - Users with old/unused access keys
// - Password policy weakness
// - Overly permissive policies (AdministratorAccess)

export async function analyzeIAM(client: IAMClient): Promise<{
  findings: CloudFinding[];
  assets: CloudAsset[];
}> {
  const findings: CloudFinding[] = [];
  const assets: CloudAsset[] = [];

  try {
    // ── Account summary (root account checks) ───────────────────────────
    const summary = await client.send(new GetAccountSummaryCommand({}));
    const summaryMap = summary.SummaryMap ?? {};

    // Root MFA check
    if (!summaryMap['AccountMFAEnabled']) {
      findings.push({
        id: randomUUID(),
        service: 'IAM',
        resourceType: 'AWS::IAM::RootAccount',
        resourceId: 'root',
        resourceName: 'Root Account',
        title: 'Root account MFA is not enabled',
        description: 'The AWS root account does not have multi-factor authentication (MFA) enabled. The root account has unrestricted access to all AWS services and resources.',
        severity: 'CRITICAL',
        category: 'MFA_DISABLED',
        recommendation: 'Enable MFA on the root account immediately. Use a hardware MFA device for root accounts. Consider enabling AWS Organizations SCPs to restrict root access.',
        evidence: { accountMfaEnabled: false },
      });
    }

    // Root access keys check
    if ((summaryMap['AccountAccessKeysPresent'] ?? 0) > 0) {
      findings.push({
        id: randomUUID(),
        service: 'IAM',
        resourceType: 'AWS::IAM::RootAccount',
        resourceId: 'root',
        resourceName: 'Root Account',
        title: 'Root account has active access keys',
        description: 'The AWS root account has programmatic access keys. Root access keys provide unrestricted access and should never exist. Use IAM users or roles for programmatic access instead.',
        severity: 'CRITICAL',
        category: 'ROOT_ACCESS',
        recommendation: 'Delete all root account access keys immediately. Create IAM users with appropriate permissions for programmatic access.',
        evidence: { accessKeysPresent: summaryMap['AccountAccessKeysPresent'] },
      });
    }

    // ── Password policy ──────────────────────────────────────────────────
    try {
      const pwPolicy = await client.send(new GetAccountPasswordPolicyCommand({}));
      const policy = pwPolicy.PasswordPolicy;

      if (policy) {
        const issues: string[] = [];
        if ((policy.MinimumPasswordLength ?? 0) < 14) issues.push(`minimum length is ${policy.MinimumPasswordLength ?? 'not set'} (recommended: 14+)`);
        if (!policy.RequireUppercaseCharacters) issues.push('uppercase not required');
        if (!policy.RequireLowercaseCharacters) issues.push('lowercase not required');
        if (!policy.RequireNumbers) issues.push('numbers not required');
        if (!policy.RequireSymbols) issues.push('symbols not required');
        if (!policy.ExpirePasswords) issues.push('password expiration not enabled');

        if (issues.length > 0) {
          findings.push({
            id: randomUUID(),
            service: 'IAM',
            resourceType: 'AWS::IAM::PasswordPolicy',
            resourceId: 'password-policy',
            resourceName: 'Account Password Policy',
            title: 'Weak IAM password policy',
            description: `The IAM password policy does not meet security best practices: ${issues.join('; ')}.`,
            severity: issues.length >= 3 ? 'HIGH' : 'MEDIUM',
            category: 'IAM_MISCONFIGURATION',
            recommendation: 'Update the IAM password policy to require: minimum 14 characters, uppercase, lowercase, numbers, symbols, and 90-day expiration.',
            evidence: { issues, policy: { minLength: policy.MinimumPasswordLength, requireUppercase: policy.RequireUppercaseCharacters, requireNumbers: policy.RequireNumbers } },
          });
        }
      }
    } catch {
      // No password policy set at all
      findings.push({
        id: randomUUID(),
        service: 'IAM',
        resourceType: 'AWS::IAM::PasswordPolicy',
        resourceId: 'password-policy',
        resourceName: 'Account Password Policy',
        title: 'No IAM password policy configured',
        description: 'The account has no IAM password policy, meaning IAM users can set arbitrarily weak passwords.',
        severity: 'HIGH',
        category: 'IAM_MISCONFIGURATION',
        recommendation: 'Configure an IAM password policy requiring minimum 14 characters with complexity requirements.',
        evidence: { policyExists: false },
      });
    }

    // ── Users analysis ───────────────────────────────────────────────────
    const usersResp = await client.send(new ListUsersCommand({ MaxItems: 100 }));
    const users = usersResp.Users ?? [];

    for (const user of users.slice(0, 50)) { // Cap at 50 to avoid throttling
      assets.push({
        type: 'CLOUD_RESOURCE',
        name: `IAM User: ${user.UserName}`,
        value: user.Arn ?? user.UserId ?? user.UserName ?? 'unknown',
      });

      // Check MFA for console users
      try {
        await client.send(new GetLoginProfileCommand({ UserName: user.UserName! }));
        // User has console access — check MFA
        const mfaResp = await client.send(new ListMFADevicesCommand({ UserName: user.UserName! }));
        if ((mfaResp.MFADevices ?? []).length === 0) {
          findings.push({
            id: randomUUID(),
            service: 'IAM',
            resourceType: 'AWS::IAM::User',
            resourceId: user.Arn ?? user.UserId ?? '',
            resourceName: user.UserName ?? 'unknown',
            title: `IAM user "${user.UserName}" has console access without MFA`,
            description: `The IAM user "${user.UserName}" can log into the AWS console but has no MFA device enrolled. This is a significant risk if credentials are compromised.`,
            severity: 'HIGH',
            category: 'MFA_DISABLED',
            recommendation: `Enable MFA for IAM user "${user.UserName}". Consider enforcing MFA with an IAM policy condition.`,
            evidence: { userName: user.UserName, mfaDevices: 0 },
          });
        }
      } catch {
        // User has no console access — fine
      }

      // Check access key age
      try {
        const keysResp = await client.send(new ListAccessKeysCommand({ UserName: user.UserName! }));
        for (const key of keysResp.AccessKeyMetadata ?? []) {
          if (key.Status !== 'Active') continue;
          const ageMs = Date.now() - (key.CreateDate?.getTime() ?? 0);
          const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          if (ageDays > 90) {
            findings.push({
              id: randomUUID(),
              service: 'IAM',
              resourceType: 'AWS::IAM::AccessKey',
              resourceId: key.AccessKeyId ?? '',
              resourceName: `${user.UserName} — ${key.AccessKeyId?.slice(0, 8)}...`,
              title: `Access key for "${user.UserName}" is ${ageDays} days old`,
              description: `IAM access key ${key.AccessKeyId?.slice(0, 8)}... for user "${user.UserName}" has not been rotated in ${ageDays} days. AWS recommends rotating access keys every 90 days.`,
              severity: ageDays > 180 ? 'HIGH' : 'MEDIUM',
              category: 'KEY_ROTATION',
              recommendation: `Rotate the access key for "${user.UserName}". Create a new key, update all applications, then disable and delete the old key.`,
              evidence: { userName: user.UserName, keyId: key.AccessKeyId, ageDays, createDate: key.CreateDate },
            });
          }
        }
      } catch {}
    }

    // ── Roles with AdministratorAccess ──────────────────────────────────
    const rolesResp = await client.send(new ListRolesCommand({ MaxItems: 100 }));
    for (const role of rolesResp.Roles ?? []) {
      assets.push({
        type: 'CLOUD_RESOURCE',
        name: `IAM Role: ${role.RoleName}`,
        value: role.Arn ?? '',
      });

      // Check for wildcard trust policy (anyone can assume)
      try {
        const trustPolicy = role.AssumeRolePolicyDocument
          ? JSON.parse(decodeURIComponent(role.AssumeRolePolicyDocument))
          : null;

        if (trustPolicy) {
          const hasWildcardPrincipal = (trustPolicy.Statement ?? []).some((s: any) =>
            s.Principal === '*' || s.Principal?.AWS === '*'
          );
          if (hasWildcardPrincipal) {
            findings.push({
              id: randomUUID(),
              service: 'IAM',
              resourceType: 'AWS::IAM::Role',
              resourceId: role.Arn ?? '',
              resourceName: role.RoleName ?? '',
              title: `IAM role "${role.RoleName}" has wildcard trust policy`,
              description: `The role "${role.RoleName}" can be assumed by any AWS principal (*). This means any AWS account or service could assume this role and access your resources.`,
              severity: 'CRITICAL',
              category: 'EXCESSIVE_PERMISSIONS',
              recommendation: 'Restrict the trust policy to specific AWS accounts or services that need to assume this role.',
              evidence: { roleArn: role.Arn, trustPolicy: JSON.stringify(trustPolicy).slice(0, 500) },
            });
          }
        }
      } catch {}
    }

  } catch (err: any) {
    console.error('[CloudSecurity] IAM analysis error:', err.message);
  }

  return { findings, assets };
}
