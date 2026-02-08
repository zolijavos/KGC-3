-- Epic 40: Bérgép Megtérülés & Előzmények (ADR-051)
-- Migration: Add EquipmentProfitSnapshot table and purchasedFrom field

-- Add purchasedFrom field to rental_equipment
ALTER TABLE "rental_equipment"
ADD COLUMN IF NOT EXISTS "purchased_from" VARCHAR(255);

-- Create equipment_profit_snapshots table
CREATE TABLE IF NOT EXISTS "equipment_profit_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_revenue" DECIMAL(12, 2) NOT NULL,
    "total_service_cost" DECIMAL(12, 2) NOT NULL,
    "purchase_price" DECIMAL(12, 2) NOT NULL,
    "profit" DECIMAL(12, 2) NOT NULL,
    "roi_percent" DECIMAL(5, 2) NOT NULL,
    "recommendation" VARCHAR(20) NOT NULL DEFAULT 'KEEP',
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_profit_snapshots_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint (one snapshot per equipment per period end)
ALTER TABLE "equipment_profit_snapshots"
ADD CONSTRAINT "equipment_profit_snapshots_tenant_equipment_period_key"
UNIQUE ("tenant_id", "equipment_id", "period_end");

-- Add foreign key to rental_equipment
ALTER TABLE "equipment_profit_snapshots"
ADD CONSTRAINT "equipment_profit_snapshots_equipment_id_fkey"
FOREIGN KEY ("equipment_id") REFERENCES "rental_equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "equipment_profit_snapshots_tenant_id_idx" ON "equipment_profit_snapshots"("tenant_id");
CREATE INDEX IF NOT EXISTS "equipment_profit_snapshots_equipment_id_idx" ON "equipment_profit_snapshots"("equipment_id");
CREATE INDEX IF NOT EXISTS "equipment_profit_snapshots_period_end_idx" ON "equipment_profit_snapshots"("period_end");
CREATE INDEX IF NOT EXISTS "equipment_profit_snapshots_recommendation_idx" ON "equipment_profit_snapshots"("recommendation");

-- Enable RLS (ADR-001: Multi-tenancy)
ALTER TABLE "equipment_profit_snapshots" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation
CREATE POLICY "equipment_profit_snapshots_tenant_isolation" ON "equipment_profit_snapshots"
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Comment for documentation
COMMENT ON TABLE "equipment_profit_snapshots" IS 'Epic 40 (ADR-051): Bérgép megtérülés pillanatképek historikus elemzéshez';
COMMENT ON COLUMN "equipment_profit_snapshots"."total_revenue" IS 'Σ(Rental.totalAmount) az adott időszakban';
COMMENT ON COLUMN "equipment_profit_snapshots"."total_service_cost" IS 'Σ(Worksheet.totalCost WHERE !isWarranty) - csak nem garanciális';
COMMENT ON COLUMN "equipment_profit_snapshots"."profit" IS 'totalRevenue - purchasePrice - totalServiceCost';
COMMENT ON COLUMN "equipment_profit_snapshots"."roi_percent" IS '(profit / purchasePrice) * 100';
COMMENT ON COLUMN "equipment_profit_snapshots"."recommendation" IS 'KEEP | SELLABLE | LOSS - automatikus javaslat';
