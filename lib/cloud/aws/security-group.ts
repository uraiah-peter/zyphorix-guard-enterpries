import {
  EC2Client,
  DescribeSecurityGroupsCommand,
  DescribeInstancesCommand,
} from '@aws-sdk/client-ec2';
import type { CloudFinding, CloudAsset } from '../types';
import { randomUUID } from 'crypto';

// ─── EC2 Security Group Analyzer ──────────────────────────────────────────
// Checks security groups for dangerous inbound rules: open SSH, RDP, database
// ports exposed to 0.0.0.0/0 (the entire internet).

const DANGEROUS_PORTS: Record<number, { name: string; severity: 'CRITICAL' | 'HIGH' }> = {
  22:    { name: 'SSH',            severity: 'CRITICAL' },
  3389:  { name: 'RDP',            severity: 'CRITICAL' },
  3306:  { name: 'MySQL',          severity: 'HIGH' },
  5432:  { name: 'PostgreSQL',     severity: 'HIGH' },
  1433:  { name: 'MSSQL',          severity: 'HIGH' },
  6379:  { name: 'Redis',          severity: 'HIGH' },
  27017: { name: 'MongoDB',        severity: 'HIGH' },
  9200:  { name: 'Elasticsearch',  severity: 'HIGH' },
  8080:  { name: 'HTTP-Alt',       severity: 'HIGH' },
  8443:  { name: 'HTTPS-Alt',      severity: 'HIGH' },
  2375:  { name: 'Docker API',     severity: 'CRITICAL' },
  2379:  { name: 'etcd',           severity: 'CRITICAL' },
  10250: { name: 'Kubernetes API', severity: 'CRITICAL' },
};

export async function analyzeSecurityGroups(
  client: EC2Client,
  region: string
): Promise<{ findings: CloudFinding[]; assets: CloudAsset[] }> {
  const findings: CloudFinding[] = [];
  const assets: CloudAsset[] = [];

  try {
    const sgResp = await client.send(new DescribeSecurityGroupsCommand({ MaxResults: 100 }));
    const sgs = sgResp.SecurityGroups ?? [];

    for (const sg of sgs) {
      assets.push({
        type: 'CLOUD_RESOURCE',
        name: `SG: ${sg.GroupName ?? sg.GroupId}`,
        value: `arn:aws:ec2:${region}::security-group/${sg.GroupId}`,
        region,
      });

      // Check each inbound rule
      for (const rule of sg.IpPermissions ?? []) {
        const isAllProtocol = rule.IpProtocol === '-1';

        // Check for 0.0.0.0/0 (IPv4) or ::/0 (IPv6)
        const openToWorld = (rule.IpRanges ?? []).some(r => r.CidrIp === '0.0.0.0/0') ||
                            (rule.Ipv6Ranges ?? []).some(r => r.CidrIpv6 === '::/0');

        if (!openToWorld) continue;

        // All traffic open to world
        if (isAllProtocol) {
          findings.push({
            id: randomUUID(),
            service: 'EC2',
            resourceType: 'AWS::EC2::SecurityGroup',
            resourceId: sg.GroupId ?? '',
            resourceName: sg.GroupName ?? sg.GroupId ?? '',
            title: `Security group "${sg.GroupName}" allows ALL traffic from internet`,
            description: `Security group ${sg.GroupId} (${sg.GroupName}) allows all protocols and all ports from 0.0.0.0/0. This is the most dangerous possible security group configuration.`,
            severity: 'CRITICAL',
            category: 'OPEN_PORT',
            recommendation: 'Remove the all-traffic rule immediately. Define specific rules for only the ports and protocols actually needed.',
            evidence: { sgId: sg.GroupId, sgName: sg.GroupName, region, protocol: 'ALL', cidr: '0.0.0.0/0' },
          });
          continue;
        }

        // Check specific dangerous ports
        const fromPort = rule.FromPort ?? 0;
        const toPort = rule.ToPort ?? 65535;

        for (const [port, portInfo] of Object.entries(DANGEROUS_PORTS)) {
          const portNum = parseInt(port);
          if (fromPort <= portNum && portNum <= toPort) {
            findings.push({
              id: randomUUID(),
              service: 'EC2',
              resourceType: 'AWS::EC2::SecurityGroup',
              resourceId: sg.GroupId ?? '',
              resourceName: sg.GroupName ?? sg.GroupId ?? '',
              title: `${portInfo.name} port (${port}) open to internet in "${sg.GroupName}"`,
              description: `Security group ${sg.GroupId} allows inbound ${portInfo.name} traffic (port ${port}) from 0.0.0.0/0 (the entire internet). This exposes services to brute force attacks and exploitation.`,
              severity: portInfo.severity,
              category: 'OPEN_PORT',
              recommendation: `Restrict port ${port} access to specific trusted IP ranges or a bastion host. Never expose ${portInfo.name} directly to the internet.`,
              evidence: { sgId: sg.GroupId, sgName: sg.GroupName, port: portNum, service: portInfo.name, region, fromPort, toPort, cidr: '0.0.0.0/0' },
            });
          }
        }

        // Large port ranges open to world
        if (toPort - fromPort > 1000 && !isAllProtocol) {
          findings.push({
            id: randomUUID(),
            service: 'EC2',
            resourceType: 'AWS::EC2::SecurityGroup',
            resourceId: sg.GroupId ?? '',
            resourceName: sg.GroupName ?? sg.GroupId ?? '',
            title: `Security group "${sg.GroupName}" has large port range open to internet`,
            description: `Ports ${fromPort}–${toPort} are open to 0.0.0.0/0. Opening large port ranges to the internet significantly increases your attack surface.`,
            severity: 'HIGH',
            category: 'OPEN_PORT',
            recommendation: 'Narrow the port range to only the specific ports needed. Apply the principle of least privilege to network access.',
            evidence: { sgId: sg.GroupId, fromPort, toPort, portRange: toPort - fromPort, region },
          });
        }
      }
    }

    // EC2 instances as assets
    try {
      const instancesResp = await client.send(new DescribeInstancesCommand({ MaxResults: 50 }));
      for (const reservation of instancesResp.Reservations ?? []) {
        for (const instance of reservation.Instances ?? []) {
          const name = instance.Tags?.find(t => t.Key === 'Name')?.Value ?? instance.InstanceId ?? '';
          assets.push({
            type: 'CLOUD_RESOURCE',
            name: `EC2: ${name}`,
            value: instance.InstanceId ?? '',
            region,
          });
        }
      }
    } catch {}

  } catch (err: any) {
    console.error('[CloudSecurity] EC2 analysis error:', err.message);
  }

  return { findings, assets };
}
