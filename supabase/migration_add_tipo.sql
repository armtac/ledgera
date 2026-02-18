-- ============================================================
-- Migration: Add tipo column (ACT/BUDGET) to spese table
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE spese ADD COLUMN tipo TEXT NOT NULL DEFAULT 'ACT'
  CHECK (tipo IN ('ACT', 'BUDGET'));

CREATE INDEX idx_spese_tipo ON spese(tipo);
