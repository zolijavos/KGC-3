-- KGC ERP Initial Database Setup
-- Creates multi-tenant schema structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Public schema: közös adatok (CORE, PARTNER, KÉSZLET törzs)
-- Tenant-specifikus táblák külön sémákban lesznek létrehozva runtime

-- Alapértelmezett tenant létrehozása dev környezethez
-- A tényleges séma struktúra a Prisma migrációkból jön

-- pgvector extension for AI chatbot (ADR-016)
-- CREATE EXTENSION IF NOT EXISTS vector;
-- Note: Uncomment when pgvector is needed for AI features
