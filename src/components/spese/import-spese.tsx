"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Voce, Categoria, SubCategoria, Fornitore } from "@/lib/supabase/types";
import { useUserStore } from "@/store/user-store";
import { MESI, generatePeriods, splitImporto } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Column mapping for the Excel template
const TEMPLATE_COLUMNS = [
  "Voce",
  "Categoria",
  "Sub-Categoria",
  "Fornitore",
  "Anno DF",
  "Mese DF",
  "Fattura #",
  "Riferimento",
  "Importo Totale",
  "Mese Rif Da",
  "Anno Rif Da",
  "Mese Rif A",
  "Anno Rif A",
  "Descrizione",
  "Note",
  "Tipo",
] as const;

type ParsedRow = {
  rowNum: number;
  voce: string;
  categoria: string;
  subCategoria: string;
  fornitore: string;
  annoDf: number;
  meseDf: number;
  fatturaNum: string;
  riferimento: string;
  importoTotale: number;
  meseRifDa: number;
  annoRifDa: number;
  meseRifA: number;
  annoRifA: number;
  descrizione: string;
  note: string;
  tipo: "ACT" | "BUDGET";
  errors: string[];
  voceId?: string;
  categoriaId?: string;
  subCategoriaId?: string;
  fornitoreId?: string;
};

interface ImportSpeseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

function downloadTemplate(
  voci: Voce[],
  categorie: Categoria[],
  subCategorie: SubCategoria[],
  fornitori: Fornitore[]
) {
  const wb = XLSX.utils.book_new();

  // Main sheet with headers and example row
  const exampleData = [
    TEMPLATE_COLUMNS as unknown as string[],
    [
      "Case",
      "Condominio",
      "via Valignani (CH)",
      "Condominio",
      new Date().getFullYear(),
      1,
      "F-2025-001",
      "",
      150,
      1,
      new Date().getFullYear(),
      2,
      new Date().getFullYear(),
      "Condominio gennaio-febbraio",
      "",
      "ACT",
    ],
    [
      "Altre spese",
      "AI",
      "ChatGPT",
      "OpenAI",
      new Date().getFullYear(),
      2,
      "",
      "",
      20,
      2,
      new Date().getFullYear(),
      2,
      new Date().getFullYear(),
      "Abbonamento ChatGPT Plus",
      "",
      "BUDGET",
    ],
  ];

  const wsMain = XLSX.utils.aoa_to_sheet(exampleData);

  // Set column widths
  wsMain["!cols"] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 30 },
    { wch: 30 },
    { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, wsMain, "Spese");

  // Reference sheet with valid values
  const refData: string[][] = [
    ["Voce", "Categoria", "Sub-Categoria", "Fornitore", "Mesi (1-12)", "Tipo"],
    ["", "", "", "", "", "ACT = Effettivo"],
    ["", "", "", "", "", "BUDGET = Previsione"],
  ];

  // Build a flat list of all valid combinations
  voci.forEach((v) => {
    const vCategorie = categorie.filter((c) => c.voce_id === v.id);
    if (vCategorie.length === 0) {
      refData.push([v.nome, "", "", "", "", ""]);
    }
    vCategorie.forEach((c) => {
      const cSubs = subCategorie.filter((s) => s.categoria_id === c.id);
      if (cSubs.length === 0) {
        refData.push([v.nome, c.nome, "", "", "", ""]);
      }
      cSubs.forEach((s) => {
        refData.push([v.nome, c.nome, s.nome, "", "", ""]);
      });
    });
  });

  // Add fornitori names
  fornitori.forEach((f, i) => {
    if (refData[i + 1]) {
      refData[i + 1][3] = f.nome;
    } else {
      refData.push(["", "", "", f.nome, "", ""]);
    }
  });

  // Add month reference
  MESI.forEach((nome, i) => {
    if (refData[i + 1]) {
      refData[i + 1][4] = `${i + 1} = ${nome}`;
    } else {
      refData.push(["", "", "", "", `${i + 1} = ${nome}`, ""]);
    }
  });

  const wsRef = XLSX.utils.aoa_to_sheet(refData);
  wsRef["!cols"] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsRef, "Valori Ammessi");

  XLSX.writeFile(wb, "ledgera_template_import.xlsx");
}

export function ImportSpese({
  open,
  onOpenChange,
  onImportComplete,
}: ImportSpeseProps) {
  const { currentUser } = useUserStore();
  const supabase = createClient();

  const [voci, setVoci] = useState<Voce[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [subCategorie, setSubCategorie] = useState<SubCategoria[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  // Load lookup data
  useEffect(() => {
    if (!open) return;
    async function load() {
      const [vRes, cRes, sRes, fRes] = await Promise.all([
        supabase.from("voci").select("*").eq("attivo", true).order("ordine"),
        supabase.from("categorie").select("*").eq("attivo", true).order("ordine"),
        supabase.from("sub_categorie").select("*").eq("attivo", true).order("ordine"),
        supabase.from("fornitori").select("*").eq("attivo", true).order("ordine"),
      ]);
      setVoci((vRes.data ?? []) as Voce[]);
      setCategorie((cRes.data ?? []) as Categoria[]);
      setSubCategorie((sRes.data ?? []) as SubCategoria[]);
      setFornitori((fRes.data ?? []) as Fornitore[]);
    }
    load();
  }, [open, supabase]);

  const resolveIds = useCallback(
    (row: Omit<ParsedRow, "voceId" | "categoriaId" | "subCategoriaId" | "fornitoreId">) => {
      const errors: string[] = [];
      const voce = voci.find(
        (v) => v.nome.toLowerCase() === row.voce.toLowerCase()
      );
      if (!voce) errors.push(`Voce "${row.voce}" non trovata`);

      let cat: Categoria | undefined;
      if (voce) {
        cat = categorie.find(
          (c) =>
            c.voce_id === voce.id &&
            c.nome.toLowerCase() === row.categoria.toLowerCase()
        );
        if (!cat) errors.push(`Categoria "${row.categoria}" non trovata per voce "${row.voce}"`);
      }

      let sub: SubCategoria | undefined;
      if (cat && row.subCategoria) {
        sub = subCategorie.find(
          (s) =>
            s.categoria_id === cat!.id &&
            s.nome.toLowerCase() === row.subCategoria.toLowerCase()
        );
        if (!sub) errors.push(`Sub-Categoria "${row.subCategoria}" non trovata`);
      }

      let forn: Fornitore | undefined;
      if (row.fornitore) {
        forn = fornitori.find(
          (f) => f.nome.toLowerCase() === row.fornitore.toLowerCase()
        );
        if (!forn) errors.push(`Fornitore "${row.fornitore}" non trovato`);
      }

      return {
        voceId: voce?.id,
        categoriaId: cat?.id,
        subCategoriaId: sub?.id,
        fornitoreId: forn?.id,
        errors,
      };
    },
    [voci, categorie, subCategorie, fornitori]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
          toast.error("Il file non contiene fogli.");
          return;
        }

        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });

        if (json.length === 0) {
          toast.error("Il foglio è vuoto. Usa il template per il formato corretto.");
          return;
        }

        const rows: ParsedRow[] = json.map((raw, i) => {
          const rowErrors: string[] = [];

          const voce = String(raw["Voce"] ?? "").trim();
          const categoria = String(raw["Categoria"] ?? "").trim();
          const subCategoria = String(raw["Sub-Categoria"] ?? "").trim();
          const fornitore = String(raw["Fornitore"] ?? "").trim();
          const annoDf = Number(raw["Anno DF"]) || 0;
          const meseDf = Number(raw["Mese DF"]) || 0;
          const fatturaNum = String(raw["Fattura #"] ?? "").trim();
          const riferimento = String(raw["Riferimento"] ?? "").trim();
          const importoTotale = Number(raw["Importo Totale"]) || 0;
          const meseRifDa = Number(raw["Mese Rif Da"]) || meseDf;
          const annoRifDa = Number(raw["Anno Rif Da"]) || annoDf;
          const meseRifA = Number(raw["Mese Rif A"]) || meseRifDa;
          const annoRifA = Number(raw["Anno Rif A"]) || annoRifDa;
          const descrizione = String(raw["Descrizione"] ?? "").trim();
          const note = String(raw["Note"] ?? "").trim();
          const tipoRaw = String(raw["Tipo"] ?? "ACT").trim().toUpperCase();
          const tipo: "ACT" | "BUDGET" = tipoRaw === "BUDGET" ? "BUDGET" : "ACT";
          if (tipoRaw && tipoRaw !== "ACT" && tipoRaw !== "BUDGET") {
            rowErrors.push(`Tipo "${tipoRaw}" non valido (usa ACT o BUDGET)`);
          }

          if (!voce) rowErrors.push("Voce obbligatoria");
          if (!categoria) rowErrors.push("Categoria obbligatoria");
          if (annoDf < 2000 || annoDf > 2100) rowErrors.push("Anno DF non valido");
          if (meseDf < 1 || meseDf > 12) rowErrors.push("Mese DF non valido");
          if (importoTotale <= 0) rowErrors.push("Importo deve essere > 0");
          if (meseRifDa < 1 || meseRifDa > 12) rowErrors.push("Mese Rif Da non valido");
          if (meseRifA < 1 || meseRifA > 12) rowErrors.push("Mese Rif A non valido");

          const baseRow = {
            rowNum: i + 2,
            voce,
            categoria,
            subCategoria,
            fornitore,
            annoDf,
            meseDf,
            fatturaNum,
            riferimento,
            importoTotale,
            meseRifDa,
            annoRifDa,
            meseRifA,
            annoRifA,
            descrizione,
            note,
            tipo,
            errors: rowErrors,
          };

          const resolved = resolveIds(baseRow);
          return {
            ...baseRow,
            ...resolved,
            errors: [...rowErrors, ...resolved.errors],
          };
        });

        setParsedRows(rows);
      } catch (err) {
        console.error(err);
        toast.error("Errore nella lettura del file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const errorRows = parsedRows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (validRows.length === 0) {
      toast.error("Nessuna riga valida da importare.");
      return;
    }
    if (!currentUser) {
      toast.error("Seleziona un utente dall'header.");
      return;
    }

    setImporting(true);
    let imported = 0;
    let failed = 0;

    for (const row of validRows) {
      try {
        const { data: spesaData, error: errSpesa } = await supabase
          .from("spese")
          .insert({
            anno_df: row.annoDf,
            mese_df: row.meseDf,
            fattura_num: row.fatturaNum || null,
            riferimento: row.riferimento || null,
            importo_totale: row.importoTotale,
            descrizione: row.descrizione || null,
            note: row.note || null,
            inserito_da: currentUser,
            fonte: "manuale",
            tipo: row.tipo,
            fornitore_id: row.fornitoreId || null,
          })
          .select("id")
          .single();

        if (errSpesa || !spesaData) throw errSpesa;

        const periods = generatePeriods(
          row.annoRifDa,
          row.meseRifDa,
          row.annoRifA,
          row.meseRifA
        );
        const amounts = splitImporto(row.importoTotale, periods.length);

        const { error: errRighe } = await supabase.from("righe_spesa").insert(
          periods.map((p, idx) => ({
            spesa_id: spesaData.id,
            voce_id: row.voceId!,
            categoria_id: row.categoriaId!,
            sub_categoria_id: row.subCategoriaId || null,
            anno_rif: p.anno,
            mese_rif: p.mese,
            importo: amounts[idx] ?? 0,
          }))
        );

        if (errRighe) throw errRighe;
        imported++;
      } catch (err) {
        console.error(`Errore riga ${row.rowNum}:`, err);
        failed++;
      }
    }

    setImporting(false);

    if (failed === 0) {
      toast.success(`${imported} spese importate con successo.`);
    } else {
      toast.warning(
        `${imported} importate, ${failed} fallite. Controlla la console per dettagli.`
      );
    }

    setParsedRows([]);
    setFileName("");
    onOpenChange(false);
    onImportComplete();
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importa spese da Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Download template */}
          <div className="rounded-lg border border-dashed p-4 space-y-2">
            <p className="text-sm font-medium">1. Scarica il template</p>
            <p className="text-xs text-muted-foreground">
              Il template include le colonne corrette, righe di esempio e un
              foglio &quot;Valori Ammessi&quot; con tutte le Voci, Categorie e Sub-Categorie
              disponibili.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplate(voci, categorie, subCategorie, fornitori)}
              disabled={voci.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Scarica template Excel
            </Button>
          </div>

          {/* Step 2: Upload file */}
          <div className="rounded-lg border border-dashed p-4 space-y-2">
            <p className="text-sm font-medium">2. Carica il file compilato</p>
            <p className="text-xs text-muted-foreground">
              Elimina le righe di esempio dal template prima di caricare. I nomi
              di Voce, Categoria e Sub-Categoria devono corrispondere
              esattamente (non case-sensitive).
            </p>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Seleziona file .xlsx
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
              {fileName && (
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span>{fileName}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setParsedRows([]);
                      setFileName("");
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-sm font-medium">3. Anteprima</p>
                <Badge variant="secondary">
                  {parsedRows.length} righe trovate
                </Badge>
                {validRows.length > 0 && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {validRows.length} valide
                  </Badge>
                )}
                {errorRows.length > 0 && (
                  <Badge variant="destructive">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {errorRows.length} con errori
                  </Badge>
                )}
              </div>

              <div className="rounded-md border overflow-x-auto max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Voce</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Sub-Cat.</TableHead>
                      <TableHead className="text-right">Importo</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row) => (
                      <TableRow
                        key={row.rowNum}
                        className={
                          row.errors.length > 0 ? "bg-red-50" : ""
                        }
                      >
                        <TableCell className="text-muted-foreground">
                          {row.rowNum}
                        </TableCell>
                        <TableCell>{row.voce}</TableCell>
                        <TableCell>{row.categoria}</TableCell>
                        <TableCell>{row.subCategoria || "—"}</TableCell>
                        <TableCell className="text-right">
                          {row.importoTotale > 0
                            ? `€${Math.round(row.importoTotale).toLocaleString("it-IT")}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.meseRifDa}/{row.annoRifDa}
                          {(row.meseRifDa !== row.meseRifA ||
                            row.annoRifDa !== row.annoRifA) &&
                            ` → ${row.meseRifA}/${row.annoRifA}`}
                        </TableCell>
                        <TableCell>
                          {row.errors.length === 0 ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <span
                              className="text-xs text-destructive"
                              title={row.errors.join("\n")}
                            >
                              {row.errors[0]}
                              {row.errors.length > 1 &&
                                ` (+${row.errors.length - 1})`}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Annulla
          </Button>
          {validRows.length > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Importa {validRows.length} spese
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
