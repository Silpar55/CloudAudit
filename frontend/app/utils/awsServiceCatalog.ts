import type { ElementType } from "react";
import {
  Boxes,
  Server,
  HardDrive,
  Database,
  Zap,
  Globe,
  Layers,
  Box,
  Cpu,
  Network,
  Shield,
  BarChart2,
  Activity,
  Archive,
} from "lucide-react";
import type { Recommendation } from "~/services/recommendationsService";

/**
 * AWS Cost Explorer SERVICE dimension strings vary by account; we match
 * substrings (first hit wins). Order matters: e.g. Aurora before RDS.
 */
export interface ServiceMeta {
  label: string;
  Icon: ElementType;
  slug: string;
}

type MapEntry = { match: string; meta: ServiceMeta };

export const SERVICE_MAP: MapEntry[] = [
  {
    match: "Amazon Aurora",
    meta: { label: "Aurora", Icon: Database, slug: "aurora" },
  },
  {
    match: "Aurora",
    meta: { label: "Aurora", Icon: Database, slug: "aurora" },
  },
  {
    match: "AmazonEC2",
    meta: { label: "EC2", Icon: Server, slug: "ec2" },
  },
  {
    match: "AmazonRDS",
    meta: { label: "RDS", Icon: HardDrive, slug: "rds" },
  },
  {
    match: "Elastic Compute Cloud",
    meta: { label: "EC2", Icon: Server, slug: "ec2" },
  },
  {
    match: "Relational Database Service",
    meta: { label: "RDS", Icon: HardDrive, slug: "rds" },
  },
  {
    match: "Simple Storage Service",
    meta: { label: "S3", Icon: Archive, slug: "s3" },
  },
  {
    match: "Lambda",
    meta: { label: "Lambda", Icon: Zap, slug: "lambda" },
  },
  {
    match: "CloudFront",
    meta: { label: "CloudFront", Icon: Globe, slug: "cloudfront" },
  },
  {
    match: "DynamoDB",
    meta: { label: "DynamoDB", Icon: Layers, slug: "dynamodb" },
  },
  {
    match: "Elastic Kubernetes",
    meta: { label: "EKS", Icon: Box, slug: "eks" },
  },
  {
    match: "Elastic Container",
    meta: { label: "ECS", Icon: Box, slug: "ecs" },
  },
  {
    match: "ElastiCache",
    meta: { label: "ElastiCache", Icon: Cpu, slug: "elasticache" },
  },
  {
    match: "Virtual Private Cloud",
    meta: { label: "VPC", Icon: Network, slug: "vpc" },
  },
  {
    match: "Route 53",
    meta: { label: "Route 53", Icon: Globe, slug: "route53" },
  },
  {
    match: "CloudWatch",
    meta: { label: "CloudWatch", Icon: Activity, slug: "cloudwatch" },
  },
  {
    match: "Key Management",
    meta: { label: "KMS", Icon: Shield, slug: "kms" },
  },
  {
    match: "Simple Notification",
    meta: { label: "SNS", Icon: BarChart2, slug: "sns" },
  },
  {
    match: "Simple Queue",
    meta: { label: "SQS", Icon: BarChart2, slug: "sqs" },
  },
  {
    match: "Elastic Load Balancing",
    meta: { label: "ELB", Icon: Network, slug: "elb" },
  },
  {
    match: "API Gateway",
    meta: { label: "API Gateway", Icon: Network, slug: "apigateway" },
  },
  {
    match: "Redshift",
    meta: { label: "Redshift", Icon: Database, slug: "redshift" },
  },
  {
    match: "Glue",
    meta: { label: "Glue", Icon: Layers, slug: "glue" },
  },
  {
    match: "Athena",
    meta: { label: "Athena", Icon: BarChart2, slug: "athena" },
  },
];

export function resolveService(fullName: string): ServiceMeta {
  const hit = SERVICE_MAP.find((s) =>
    fullName.toLowerCase().includes(s.match.toLowerCase()),
  );
  if (hit) return hit.meta;

  const abbr = fullName
    .replace(/^Amazon\s+/i, "")
    .replace(/^AWS\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);

  const slug = (abbr || "svc").toLowerCase().replace(/[^a-z0-9-]/g, "") || "svc";

  return {
    label: abbr || fullName.slice(0, 8),
    Icon: Boxes,
    slug,
  };
}

/** Display label for a known slug (sidebar resource title, headers). */
export function getServiceMetaForSlug(slug: string): ServiceMeta {
  const entry = SERVICE_MAP.find((e) => e.meta.slug === slug);
  if (entry) return entry.meta;
  const human = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: human, Icon: Boxes, slug };
}

export function recommendationMatchesSlug(
  r: Recommendation,
  slug: string,
): boolean {
  const t = r.resource_type;
  const rdsBlob = `${r.description} ${r.resource_id}`.toLowerCase();
  switch (slug) {
    case "ec2":
      return t === "ec2_instance";
    case "rds":
      return t === "rds_instance" && !rdsBlob.includes("aurora");
    case "aurora":
      return t === "rds_instance" && rdsBlob.includes("aurora");
    case "s3":
      return t === "s3_bucket";
    case "lambda":
      return t === "other" && /lambda/i.test(r.description);
    default:
      if (t === "other") {
        const blob = `${r.description} ${r.recommendation_type}`.toLowerCase();
        return blob.includes(slug.replace(/-/g, " "));
      }
      return false;
  }
}

export function anomalyMatchesSlug(
  anomaly: {
    resource_id?: string | null;
    root_cause_details?: unknown;
  },
  slug: string,
  rawCeServiceNames: string[],
): boolean {
  const detailsStr = JSON.stringify(
    anomaly.root_cause_details ?? {},
  ).toLowerCase();
  for (const name of rawCeServiceNames) {
    const n = name.toLowerCase();
    const snippet = n.slice(0, Math.min(28, n.length));
    if (snippet.length >= 4 && detailsStr.includes(snippet)) return true;
  }

  const rid = String(anomaly.resource_id ?? "").toLowerCase();
  if (slug === "ec2" && /^i-[a-f0-9]{8,17}/.test(rid)) return true;
  if (
    (slug === "rds" || slug === "aurora") &&
    /^db-[a-z0-9-]+/.test(rid)
  ) {
    if (slug === "aurora") return /aurora|cluster/i.test(rid + detailsStr);
    return !/aurora/i.test(rid + detailsStr);
  }
  if (slug === "s3" && (rid.includes("bucket") || rid.includes("s3"))) {
    return true;
  }
  if (slug === "lambda" && rid.includes("lambda")) return true;

  return false;
}
