-- Run this in your Neon PostgreSQL console to add webhook integrations support
-- Or add the model to schema.prisma and run: npx prisma db push

CREATE TABLE IF NOT EXISTS "Integration" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL,
  "provider"       TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "webhookUrl"     TEXT NOT NULL,
  "events"         TEXT[] NOT NULL DEFAULT '{}',
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "secret"         TEXT,
  "lastUsedAt"     TIMESTAMP(3),
  "lastError"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Integration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Integration_organizationId_fkey" 
    FOREIGN KEY ("organizationId") 
    REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Integration_organizationId_idx" ON "Integration"("organizationId");

-- Playbooks table
CREATE TABLE IF NOT EXISTS "Playbook" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "description"    TEXT NOT NULL DEFAULT '',
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "trigger"        TEXT NOT NULL,
  "conditions"     JSONB NOT NULL DEFAULT '[]',
  "actions"        JSONB NOT NULL DEFAULT '[]',
  "runCount"       INTEGER NOT NULL DEFAULT 0,
  "lastRunAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Playbook_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

-- Playbook runs
CREATE TABLE IF NOT EXISTS "PlaybookRun" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "playbookId"   TEXT NOT NULL,
  "triggeredBy"  TEXT NOT NULL,
  "triggerType"  TEXT NOT NULL,
  "status"       TEXT NOT NULL,
  "results"      JSONB NOT NULL DEFAULT '[]',
  "durationMs"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaybookRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlaybookRun_pb_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE
);

-- Log ingestion table
CREATE TABLE IF NOT EXISTS "LogEntry" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "organizationId" TEXT NOT NULL,
  "source"         TEXT NOT NULL,
  "level"          TEXT NOT NULL,
  "message"        TEXT NOT NULL,
  "metadata"       JSONB,
  "timestamp"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LogEntry_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "LogEntry_org_time_idx" ON "LogEntry"("organizationId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "LogEntry_level_idx" ON "LogEntry"("organizationId", "level");
CREATE INDEX IF NOT EXISTS "PlaybookRun_pb_idx" ON "PlaybookRun"("playbookId");
