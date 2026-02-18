-- ============================================================
-- Bucket "documenti" per le fatture allegate
-- ============================================================
--
-- PASSO 1 - Dashboard (obbligatorio):
--   1. Vai su https://supabase.com/dashboard > il tuo progetto
--   2. Menu sinistro: Storage
--   3. "New bucket" > Nome: documenti
--   4. Lascia "Public bucket" DISATTIVATO (privato)
--   5. Crea
--
-- PASSO 2 - Policy (esegui questo SQL nel SQL Editor):
-- ============================================================

DROP POLICY IF EXISTS "Allow upload documenti" ON storage.objects;
DROP POLICY IF EXISTS "Allow read documenti" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete documenti" ON storage.objects;

-- Policy: upload
CREATE POLICY "Allow upload documenti"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'documenti');

-- Policy: lettura
CREATE POLICY "Allow read documenti"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documenti');

-- Policy: eliminazione
CREATE POLICY "Allow delete documenti"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'documenti');
