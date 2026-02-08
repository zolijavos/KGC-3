-- Story 45-1: Dashboard Widget Jogosultságok Admin
-- Migration: Add DashboardWidgetPermission table

-- Create WidgetRole enum
CREATE TYPE "WidgetRole" AS ENUM ('OPERATOR', 'STORE_MANAGER', 'ADMIN');

-- Create dashboard_widget_permissions table
CREATE TABLE "dashboard_widget_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "widget_id" VARCHAR(50) NOT NULL,
    "role" "WidgetRole" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "dashboard_widget_permissions_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint (one permission per tenant+widget+role combination)
ALTER TABLE "dashboard_widget_permissions"
ADD CONSTRAINT "dashboard_widget_permissions_tenant_widget_role_key"
UNIQUE ("tenant_id", "widget_id", "role");

-- Add foreign key to tenant
ALTER TABLE "dashboard_widget_permissions"
ADD CONSTRAINT "dashboard_widget_permissions_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key to user (updater)
ALTER TABLE "dashboard_widget_permissions"
ADD CONSTRAINT "dashboard_widget_permissions_updated_by_fkey"
FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "dashboard_widget_permissions_tenant_id_idx" ON "dashboard_widget_permissions"("tenant_id");
CREATE INDEX "dashboard_widget_permissions_widget_id_idx" ON "dashboard_widget_permissions"("widget_id");

-- Enable RLS (ADR-001: Multi-tenancy)
ALTER TABLE "dashboard_widget_permissions" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation
CREATE POLICY "dashboard_widget_permissions_tenant_isolation" ON "dashboard_widget_permissions"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Comment for documentation
COMMENT ON TABLE "dashboard_widget_permissions" IS 'Story 45-1: Dashboard widget jogosultságok admin felületen konfigurálható';
COMMENT ON COLUMN "dashboard_widget_permissions"."widget_id" IS 'Widget azonosító (pl. revenue-kpi, stock-summary)';
COMMENT ON COLUMN "dashboard_widget_permissions"."role" IS 'Szerepkör: OPERATOR, STORE_MANAGER, vagy ADMIN';
COMMENT ON COLUMN "dashboard_widget_permissions"."enabled" IS 'Jogosultság aktív-e';
