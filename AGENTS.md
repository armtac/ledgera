# Ledgera

Ledgera e' l'applicazione ufficiale per la gestione delle spese familiari.

## Posizione ufficiale

- Progetto attivo: `/Users/at/Projects/ledgera`
- Repository: `https://github.com/armtac/ledgera`
- La vecchia copia in OneDrive e' solo una copia di sicurezza: non modificarla.

## Come lavorare

- Rispondi in italiano, in modo breve e comprensibile.
- Esegui una modifica alla volta e verifica il risultato prima di proseguire.
- Non cambiare il comportamento esistente se non richiesto.
- Non eseguire deploy, migrazioni del database o cancellazioni senza conferma esplicita.

## Verifica

Installa le dipendenze con:

```bash
npm ci --cache /tmp/ledgera-npm-cache
```

Prima di considerare conclusa una modifica:

```bash
npm run build
```

Per una verifica locale:

```bash
npm run start -- --hostname 127.0.0.1 --port 3100
```

## Dati e sicurezza

- Il database e' Supabase.
- Le chiavi sono in `.env.local`: non mostrarle e non pubblicarle.
- Mantieni importazione ed esportazione massiva Excel.
- Prima di cambiare tabelle o campi, verifica l'impatto sull'integrazione ONO.
- ONO comunica con Ledgera tramite Supabase, non tramite la cartella del progetto.

## Struttura principale

- `src/app`: pagine dell'applicazione
- `src/components`: interfaccia e funzioni riutilizzabili
- `src/lib/supabase`: collegamento al database
- `supabase`: struttura e migrazioni del database
