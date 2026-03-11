-- Verifica fattura 412606308816: spese e righe (periodo di riferimento)
-- Esegui in Supabase SQL Editor (Dashboard → SQL Editor)

-- 1) Spesa(e) con questa fattura (Data Fattura = anno_df, mese_df)
SELECT id, anno_df, mese_df, fattura_num, importo_totale, fornitore_id, tipo, fonte
FROM spese
WHERE fattura_num = '412606308816';

-- 2) Righe di spesa (periodo di riferimento = anno_rif, mese_rif) per la stessa fattura
SELECT r.id, r.spesa_id, r.anno_rif, r.mese_rif, r.importo,
       s.anno_df, s.mese_df, s.fattura_num
FROM righe_spesa r
JOIN spese s ON s.id = r.spesa_id
WHERE s.fattura_num = '412606308816'
ORDER BY r.anno_rif, r.mese_rif;

-- Se le righe hanno entrambe mese_rif=1 (gennaio) → il problema è nei dati (AI).
-- Se le righe hanno mese_rif=1 e mese_rif=2 (gen, feb) → i dati sono corretti;
--   in quel caso la dashboard usa anno_rif/mese_rif e dovrebbe mostrare gen+feb separati.
