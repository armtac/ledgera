-- ============================================================
-- Ledgera Database Schema
-- Run this in your Supabase SQL Editor to set up the database
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. UTENTI (Users - simple name selection, no auth)
-- ============================================================
CREATE TABLE utenti (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  attivo BOOLEAN NOT NULL DEFAULT true,
  ordine INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default users
INSERT INTO utenti (nome, ordine) VALUES
  ('Armando', 1),
  ('Viviana', 2),
  ('ONO', 3);

-- ============================================================
-- 2. VOCI (Top-level: Case, Altre spese, etc.)
-- ============================================================
CREATE TABLE voci (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  attivo BOOLEAN NOT NULL DEFAULT true,
  ordine INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO voci (nome, ordine) VALUES
  ('Case', 1),
  ('Altre spese', 2);

-- ============================================================
-- 3. CATEGORIE (CTG: Condominio, Luce, Gas, etc.)
-- ============================================================
CREATE TABLE categorie (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voce_id UUID NOT NULL REFERENCES voci(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true,
  ordine INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(voce_id, nome)
);

-- Categories for "Case"
INSERT INTO categorie (voce_id, nome, ordine)
SELECT v.id, c.nome, c.ordine
FROM voci v
CROSS JOIN (VALUES
  ('Condominio', 1),
  ('Lavori', 2),
  ('IMU', 3),
  ('TARI', 4),
  ('Acqua', 5),
  ('Luce', 6),
  ('Gas', 7),
  ('Internet', 8)
) AS c(nome, ordine)
WHERE v.nome = 'Case';

-- Categories for "Altre spese"
INSERT INTO categorie (voce_id, nome, ordine)
SELECT v.id, c.nome, c.ordine
FROM voci v
CROSS JOIN (VALUES
  ('AI', 1),
  ('Assicurazioni', 2),
  ('Altri abbonamenti', 3),
  ('Sanità', 4),
  ('Altro', 5)
) AS c(nome, ordine)
WHERE v.nome = 'Altre spese';

-- ============================================================
-- 4. SUB_CATEGORIE (Sub-CTG: addresses, insurance types, etc.)
-- ============================================================
CREATE TABLE sub_categorie (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID NOT NULL REFERENCES categorie(id) ON DELETE RESTRICT,
  nome TEXT NOT NULL,
  attivo BOOLEAN NOT NULL DEFAULT true,
  ordine INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(categoria_id, nome)
);

-- Sub-categories for housing categories (addresses)
-- We insert for each "Case" category that relates to properties
DO $$
DECLARE
  v_case_id UUID;
  v_cat_id UUID;
  addr RECORD;
BEGIN
  SELECT id INTO v_case_id FROM voci WHERE nome = 'Case';

  FOR v_cat_id IN
    SELECT id FROM categorie WHERE voce_id = v_case_id
      AND nome IN ('Condominio','Lavori','IMU','TARI','Acqua','Luce','Gas','Internet')
  LOOP
    FOR addr IN
      SELECT * FROM (VALUES
        ('via Valignani (CH)', 1),
        ('via Ferri (CH)', 2),
        ('via Frentani (CH)', 3),
        ('via D''Annunzio (FR)', 4),
        ('via Villa Rossi (TE)', 5)
      ) AS a(nome, ordine)
    LOOP
      INSERT INTO sub_categorie (categoria_id, nome, ordine)
      VALUES (v_cat_id, addr.nome, addr.ordine)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Sub-categories for "Assicurazioni"
INSERT INTO sub_categorie (categoria_id, nome, ordine)
SELECT c.id, s.nome, s.ordine
FROM categorie c
JOIN voci v ON v.id = c.voce_id
CROSS JOIN (VALUES
  ('Assicurazione Vita', 1),
  ('Assicurazione Casa-Famiglia', 2),
  ('Assicurazione Sanitaria', 3),
  ('Assicurazione veicoli', 4),
  ('Altre assicurazioni', 5)
) AS s(nome, ordine)
WHERE v.nome = 'Altre spese' AND c.nome = 'Assicurazioni';

-- Sub-categories for "AI"
INSERT INTO sub_categorie (categoria_id, nome, ordine)
SELECT c.id, s.nome, s.ordine
FROM categorie c
JOIN voci v ON v.id = c.voce_id
CROSS JOIN (VALUES
  ('Suno', 1),
  ('Windsurf', 2),
  ('ChatGPT', 3),
  ('Fly.io', 4),
  ('Altro', 5)
) AS s(nome, ordine)
WHERE v.nome = 'Altre spese' AND c.nome = 'AI';

-- Sub-categories for "Altri abbonamenti"
INSERT INTO sub_categorie (categoria_id, nome, ordine)
SELECT c.id, s.nome, s.ordine
FROM categorie c
JOIN voci v ON v.id = c.voce_id
CROSS JOIN (VALUES
  ('Netflix', 1),
  ('Disney+', 2),
  ('Spotify', 3),
  ('Altro', 4)
) AS s(nome, ordine)
WHERE v.nome = 'Altre spese' AND c.nome = 'Altri abbonamenti';

-- ============================================================
-- 5. FORNITORI (Suppliers)
-- ============================================================
CREATE TABLE fornitori (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  attivo BOOLEAN NOT NULL DEFAULT true,
  ordine INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- ============================================================
-- 6. SPESE (Expense header)
-- ============================================================
CREATE TABLE spese (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anno_df INT NOT NULL CHECK (anno_df >= 2000 AND anno_df <= 2100),
  mese_df INT NOT NULL CHECK (mese_df >= 1 AND mese_df <= 12),
  fattura_num TEXT,
  riferimento TEXT,
  importo_totale DECIMAL(12,2) NOT NULL CHECK (importo_totale >= 0),
  descrizione TEXT,
  note TEXT,
  inserito_da TEXT NOT NULL,
  fonte TEXT NOT NULL DEFAULT 'manuale' CHECK (fonte IN ('manuale', 'ai_agent', 'telegram')),
  tipo TEXT NOT NULL DEFAULT 'ACT' CHECK (tipo IN ('ACT', 'BUDGET')),
  fornitore_id UUID REFERENCES fornitori(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. RIGHE_SPESA (Expense lines - one per reference period)
-- ============================================================
CREATE TABLE righe_spesa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spesa_id UUID NOT NULL REFERENCES spese(id) ON DELETE CASCADE,
  voce_id UUID NOT NULL REFERENCES voci(id) ON DELETE RESTRICT,
  categoria_id UUID NOT NULL REFERENCES categorie(id) ON DELETE RESTRICT,
  sub_categoria_id UUID REFERENCES sub_categorie(id) ON DELETE RESTRICT,
  anno_rif INT NOT NULL CHECK (anno_rif >= 2000 AND anno_rif <= 2100),
  mese_rif INT NOT NULL CHECK (mese_rif >= 1 AND mese_rif <= 12),
  importo DECIMAL(12,2) NOT NULL CHECK (importo >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. DOCUMENTI (Documents/attachments linked to expenses)
-- ============================================================
CREATE TABLE documenti (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spesa_id UUID NOT NULL REFERENCES spese(id) ON DELETE CASCADE,
  nome_file TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  dimensione_bytes BIGINT,
  caricato_da TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. INDEXES for reporting performance
-- ============================================================
CREATE INDEX idx_righe_spesa_periodo ON righe_spesa(anno_rif, mese_rif);
CREATE INDEX idx_righe_spesa_voce ON righe_spesa(voce_id);
CREATE INDEX idx_righe_spesa_categoria ON righe_spesa(categoria_id);
CREATE INDEX idx_righe_spesa_sub_categoria ON righe_spesa(sub_categoria_id);
CREATE INDEX idx_righe_spesa_spesa ON righe_spesa(spesa_id);
CREATE INDEX idx_spese_periodo_df ON spese(anno_df, mese_df);
CREATE INDEX idx_spese_fonte ON spese(fonte);
CREATE INDEX idx_spese_tipo ON spese(tipo);
CREATE INDEX idx_spese_fornitore ON spese(fornitore_id);
CREATE INDEX idx_documenti_spesa ON documenti(spesa_id);
CREATE INDEX idx_categorie_voce ON categorie(voce_id);
CREATE INDEX idx_sub_categorie_categoria ON sub_categorie(categoria_id);

-- ============================================================
-- 10. Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_utenti_updated_at BEFORE UPDATE ON utenti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voci_updated_at BEFORE UPDATE ON voci
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorie_updated_at BEFORE UPDATE ON categorie
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sub_categorie_updated_at BEFORE UPDATE ON sub_categorie
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fornitori_updated_at BEFORE UPDATE ON fornitori
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spese_updated_at BEFORE UPDATE ON spese
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 11. Row Level Security (disabled for now, ready for future)
-- ============================================================
ALTER TABLE utenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE voci ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornitori ENABLE ROW LEVEL SECURITY;
ALTER TABLE spese ENABLE ROW LEVEL SECURITY;
ALTER TABLE righe_spesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;

-- Allow all access (no auth for now)
CREATE POLICY "Allow all" ON utenti FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON voci FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON categorie FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON sub_categorie FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON fornitori FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON spese FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON righe_spesa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON documenti FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 12. Supabase Storage bucket for documents
-- ============================================================
-- Run this separately in Supabase Dashboard > Storage:
-- Create a bucket named "documenti" with public access disabled
-- Or use the Supabase API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documenti', 'documenti', false);
