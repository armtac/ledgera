-- ============================================================
-- Migration: Add fornitori table and fornitore_id FK on spese
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create fornitori table
CREATE TABLE fornitori (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  attivo BOOLEAN NOT NULL DEFAULT true,
  ordine INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Seed initial values
INSERT INTO fornitori (nome, ordine) VALUES
  ('ACA', 1),
  ('Comune CH', 2),
  ('Comune FR', 3),
  ('Condominio', 4),
  ('EnelEnergia', 5),
  ('Hera', 6),
  ('Telecom', 7),
  ('Wind', 8),
  ('HO', 9),
  ('Suno', 10),
  ('Windsurf', 11),
  ('Spotify', 12),
  ('OpenAI', 13),
  ('Vittoria', 14),
  ('Altro', 15);

-- 3. Add fornitore_id FK to spese (nullable for existing rows)
ALTER TABLE spese ADD COLUMN fornitore_id UUID REFERENCES fornitori(id) ON DELETE RESTRICT;

-- 4. Index for performance
CREATE INDEX idx_spese_fornitore ON spese(fornitore_id);

-- 5. RLS
ALTER TABLE fornitori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON fornitori FOR ALL USING (true) WITH CHECK (true);

-- 6. Updated_at trigger
CREATE TRIGGER update_fornitori_updated_at BEFORE UPDATE ON fornitori
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
