"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type {
  Voce,
  Categoria,
  SubCategoria,
  Fornitore,
  Spesa,
  RigaSpesa,
  Documento,
} from "@/lib/supabase/types";
import {
  DocumentUpload,
  type DocumentUploadRef,
} from "@/components/spese/document-upload";
import {
  generatePeriods,
  splitImporto,
  formatImporto,
  formatPeriodo,
  MESI,
} from "@/lib/utils";
import { useUserStore } from "@/store/user-store";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type PeriodLine = { anno: number; mese: number; importo: number };

type SpesaFormProps = {
  mode: "create" | "edit";
  spesaId?: string;
  initialData?: {
    spesa: Spesa;
    righe: RigaSpesa[];
    documenti?: Documento[];
  };
};

const ANNI = Array.from({ length: 21 }, (_, i) => 2020 + i); // 2020-2040
const MESI_OPTIONS = MESI.map((nome, i) => ({ valore: i + 1, nome }));

export function SpesaForm({ mode, spesaId, initialData }: SpesaFormProps) {
  const router = useRouter();
  const { currentUser } = useUserStore();

  const [voci, setVoci] = useState<Voce[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [subCategorie, setSubCategorie] = useState<SubCategoria[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedSpesaId, setSavedSpesaId] = useState<string | null>(
    spesaId ?? null
  );

  // Form state
  const [voceId, setVoceId] = useState<string>("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [subCategoriaId, setSubCategoriaId] = useState<string>("");
  const [annoDf, setAnnoDf] = useState(new Date().getFullYear());
  const [meseDf, setMeseDf] = useState(new Date().getMonth() + 1);
  const [fatturaNum, setFatturaNum] = useState("");
  const [riferimento, setRiferimento] = useState("");
  const [importoTotale, setImportoTotale] = useState<number>(0);
  const [annoDa, setAnnoDa] = useState(new Date().getFullYear());
  const [meseDa, setMeseDa] = useState(new Date().getMonth() + 1);
  const [annoA, setAnnoA] = useState(new Date().getFullYear());
  const [meseA, setMeseA] = useState(new Date().getMonth() + 1);
  const [descrizione, setDescrizione] = useState("");
  const [note, setNote] = useState("");
  const [tipo, setTipo] = useState<"ACT" | "BUDGET">("ACT");
  const [fornitoreId, setFornitoreId] = useState<string>("");
  const [righe, setRighe] = useState<PeriodLine[]>([]);
  const skipRegenerateRef = useRef(false);
  const documentUploadRef = useRef<DocumentUploadRef>(null);

  const supabase = createClient();

  // Load lookup data
  useEffect(() => {
    supabase
      .from("voci")
      .select("id, nome, ordine")
      .eq("attivo", true)
      .order("ordine", { ascending: true })
      .then(({ data }) => {
        if (data) setVoci(data as Voce[]);
      });
    supabase
      .from("fornitori")
      .select("id, nome, ordine")
      .eq("attivo", true)
      .order("ordine", { ascending: true })
      .then(({ data }) => {
        if (data) setFornitori(data as Fornitore[]);
      });
  }, [supabase]);

  // Quando cambia la voce: mantieni categoria e sub-categoria se ancora valide per la nuova voce
  useEffect(() => {
    if (!voceId) {
      setCategorie([]);
      setCategoriaId("");
      setSubCategoriaId("");
      setSubCategorie([]);
      return;
    }
    supabase
      .from("categorie")
      .select("id, nome, voce_id, ordine")
      .eq("voce_id", voceId)
      .eq("attivo", true)
      .order("ordine", { ascending: true })
      .then(({ data }) => {
        const cats = (data ?? []) as Categoria[];
        setCategorie(cats);
        const categoriaStillValid = cats.some((c) => c.id === categoriaId);
        if (!categoriaStillValid) {
          setCategoriaId("");
          setSubCategoriaId("");
          setSubCategorie([]);
          return;
        }
        // Categoria ancora valida: carica sub_categorie e mantieni sub se valida
        supabase
          .from("sub_categorie")
          .select("id, nome, categoria_id, ordine")
          .eq("categoria_id", categoriaId)
          .eq("attivo", true)
          .order("ordine", { ascending: true })
          .then(({ data: subData }) => {
            const subs = (subData ?? []) as SubCategoria[];
            setSubCategorie(subs);
            const subStillValid = subs.some((s) => s.id === subCategoriaId);
            if (!subStillValid) setSubCategoriaId("");
          });
      });
  }, [voceId, supabase]);

  useEffect(() => {
    if (!categoriaId) {
      setSubCategorie([]);
      setSubCategoriaId("");
      return;
    }
    supabase
      .from("sub_categorie")
      .select("id, nome, categoria_id, ordine")
      .eq("categoria_id", categoriaId)
      .eq("attivo", true)
      .order("ordine", { ascending: true })
      .then(({ data }) => {
        if (data) setSubCategorie(data as SubCategoria[]);
        setSubCategoriaId("");
      });
  }, [categoriaId, supabase]);

  // Load initial data for edit mode
  useEffect(() => {
    if (mode !== "edit" || !spesaId || !initialData) {
      if (mode === "edit" && !initialData) setLoading(false);
      return;
    }
    const { spesa, righe: loadedRighe } = initialData;
    setAnnoDf(spesa.anno_df);
    setMeseDf(spesa.mese_df);
    setFatturaNum(spesa.fattura_num ?? "");
    setRiferimento(spesa.riferimento ?? "");
    setImportoTotale(spesa.importo_totale);
    setDescrizione(spesa.descrizione ?? "");
    setNote(spesa.note ?? "");
    setTipo((spesa as Spesa & { tipo?: "ACT" | "BUDGET" }).tipo ?? "ACT");
    setFornitoreId(spesa.fornitore_id ?? "");

    if (loadedRighe.length > 0) {
      const first = loadedRighe[0];
      setVoceId(first.voce_id);
      setCategoriaId(first.categoria_id);
      setSubCategoriaId(first.sub_categoria_id ?? "");

      const annoFrom = Math.min(...loadedRighe.map((r) => r.anno_rif));
      const meseFrom = loadedRighe.find((r) => r.anno_rif === annoFrom)?.mese_rif ?? 1;
      const annoTo = Math.max(...loadedRighe.map((r) => r.anno_rif));
      const meseTo =
        loadedRighe.find((r) => r.anno_rif === annoTo)?.mese_rif ?? 12;

      setAnnoDa(annoFrom);
      setMeseDa(meseFrom);
      setAnnoA(annoTo);
      setMeseA(meseTo);

      setRighe(
        loadedRighe.map((r) => ({
          anno: r.anno_rif,
          mese: r.mese_rif,
          importo: r.importo,
        }))
      );
      skipRegenerateRef.current = true;
    }
    setLoading(false);
  }, [mode, spesaId, initialData]);

  // Regenerate righe when period or importo changes
  useEffect(() => {
    if (skipRegenerateRef.current) {
      skipRegenerateRef.current = false;
      return;
    }

    const periods = generatePeriods(annoDa, meseDa, annoA, meseA);
    if (periods.length === 0 || importoTotale <= 0) {
      setRighe([]);
      return;
    }
    const amounts = splitImporto(importoTotale, periods.length);
    setRighe(
      periods.map((p, i) => ({
        anno: p.anno,
        mese: p.mese,
        importo: amounts[i] ?? 0,
      }))
    );
  }, [annoDa, meseDa, annoA, meseA, importoTotale]);


  const sommaRighe = useMemo(
    () => righe.reduce((acc, r) => acc + r.importo, 0),
    [righe]
  );
  const isValidSplit = Math.abs(sommaRighe - importoTotale) < 0.01;
  const totaleDisplay = formatImporto(importoTotale);
  const sommaDisplay = formatImporto(sommaRighe);

  const updateRigaImporto = (index: number, value: number) => {
    setRighe((prev) =>
      prev.map((r, i) => (i === index ? { ...r, importo: value } : r))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voceId || !categoriaId || importoTotale <= 0) {
      toast.error("Compila i campi obbligatori: Voce, Categoria e Importo Totale.");
      return;
    }
    if (!isValidSplit) {
      toast.error(
        `La somma delle righe (${sommaDisplay}) deve corrispondere all'Importo Totale (${totaleDisplay}).`
      );
      return;
    }
    if (!currentUser) {
      toast.error("Seleziona un utente dall'header.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "edit" && spesaId) {
        const { error: errSpesa } = await supabase
          .from("spese")
          .update({
            anno_df: annoDf,
            mese_df: meseDf,
            fattura_num: fatturaNum || null,
            riferimento: riferimento || null,
            importo_totale: importoTotale,
            descrizione: descrizione || null,
            note: note || null,
            tipo,
            fornitore_id: fornitoreId || null,
          })
          .eq("id", spesaId);

        if (errSpesa) throw errSpesa;

        await supabase.from("righe_spesa").delete().eq("spesa_id", spesaId);

        const { error: errRighe } = await supabase.from("righe_spesa").insert(
          righe.map((r) => ({
            spesa_id: spesaId,
            voce_id: voceId,
            categoria_id: categoriaId,
            sub_categoria_id: subCategoriaId || null,
            anno_rif: r.anno,
            mese_rif: r.mese,
            importo: r.importo,
          }))
        );

        if (errRighe) throw errRighe;
        toast.success("Spesa aggiornata con successo.");
      } else {
        const { data: spesaData, error: errSpesa } = await supabase
          .from("spese")
          .insert({
            anno_df: annoDf,
            mese_df: meseDf,
            fattura_num: fatturaNum || null,
            riferimento: riferimento || null,
            importo_totale: importoTotale,
            descrizione: descrizione || null,
            note: note || null,
            inserito_da: currentUser,
            fonte: "manuale",
            tipo,
            fornitore_id: fornitoreId || null,
          })
          .select("id")
          .single();

        if (errSpesa || !spesaData) throw errSpesa;

        const { error: errRighe } = await supabase.from("righe_spesa").insert(
          righe.map((r) => ({
            spesa_id: spesaData.id,
            voce_id: voceId,
            categoria_id: categoriaId,
            sub_categoria_id: subCategoriaId || null,
            anno_rif: r.anno,
            mese_rif: r.mese,
            importo: r.importo,
          }))
        );

        if (errRighe) throw errRighe;
        setSavedSpesaId(spesaData.id);
        await documentUploadRef.current?.uploadPendingFiles(spesaData.id);
        toast.success("Spesa creata con successo.");
      }
      router.push("/spese");
    } catch (err) {
      console.error(err);
      toast.error("Errore durante il salvataggio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (mode !== "edit" || !spesaId) return;
    if (!confirm("Vuoi eliminare questa spesa? L'operazione non è reversibile."))
      return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("spese").delete().eq("id", spesaId);
      if (error) throw error;
      toast.success("Spesa eliminata.");
      router.push("/spese");
    } catch (err) {
      console.error(err);
      toast.error("Errore durante l'eliminazione.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/spese">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">
          {mode === "create" ? "Nuova spesa" : "Modifica spesa"}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Dati fattura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tipo ACT / BUDGET */}
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipo === "ACT" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipo("ACT")}
                >
                  ACT (Effettivo)
                </Button>
                <Button
                  type="button"
                  variant={tipo === "BUDGET" ? "default" : "outline"}
                  size="sm"
                  className={tipo === "BUDGET" ? "bg-amber-600 hover:bg-amber-700" : ""}
                  onClick={() => setTipo("BUDGET")}
                >
                  BUDGET (Previsione)
                </Button>
              </div>
            </div>

            {/* Fornitore */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fornitore">Fornitore</Label>
                <Select
                  value={fornitoreId || "__none__"}
                  onValueChange={(v) => setFornitoreId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="fornitore">
                    <SelectValue placeholder="Seleziona fornitore (opzionale)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Nessuno —</SelectItem>
                    {fornitori.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Voce, Categoria, Sub-Categoria */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="voce">Voce *</Label>
                <Select
                  value={voceId}
                  onValueChange={setVoceId}
                  required
                >
                  <SelectTrigger id="voce">
                    <SelectValue placeholder="Seleziona voce" />
                  </SelectTrigger>
                  <SelectContent>
                    {voci.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria *</Label>
                <Select
                  value={categoriaId}
                  onValueChange={setCategoriaId}
                  required
                  disabled={!voceId}
                >
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorie.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategoria">Sub-Categoria</Label>
                <Select
                  value={subCategoriaId}
                  onValueChange={setSubCategoriaId}
                  disabled={!categoriaId}
                >
                  <SelectTrigger id="subcategoria">
                    <SelectValue placeholder="Opzionale" />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategorie.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Anno DF, Mese DF, Fattura #, Riferimento */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="anno-df">Anno DF *</Label>
                <Select
                  value={String(annoDf)}
                  onValueChange={(v) => setAnnoDf(parseInt(v, 10))}
                >
                  <SelectTrigger id="anno-df">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNI.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mese-df">Mese DF *</Label>
                <Select
                  value={String(meseDf)}
                  onValueChange={(v) => setMeseDf(parseInt(v, 10))}
                >
                  <SelectTrigger id="mese-df">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESI_OPTIONS.map((m) => (
                      <SelectItem key={m.valore} value={String(m.valore)}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fattura">Fattura #</Label>
                <Input
                  id="fattura"
                  value={fatturaNum}
                  onChange={(e) => setFatturaNum(e.target.value)}
                  placeholder="Opzionale"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="riferimento">Riferimento</Label>
                <Input
                  id="riferimento"
                  value={riferimento}
                  onChange={(e) => setRiferimento(e.target.value)}
                  placeholder="es. POD"
                />
              </div>
            </div>

            {/* Importo Totale */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="importo">Importo Totale (EUR) *</Label>
                <Input
                  id="importo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={importoTotale || ""}
                  onChange={(e) =>
                    setImportoTotale(parseFloat(e.target.value) || 0)
                  }
                  required
                  placeholder="0.00"
                />
              </div>
            </div>

            <Separator />

            {/* Periodo Riferimento */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Periodo riferimento</h3>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Da - Anno</Label>
                  <Select
                    value={String(annoDa)}
                    onValueChange={(v) => setAnnoDa(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNI.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Da - Mese</Label>
                  <Select
                    value={String(meseDa)}
                    onValueChange={(v) => setMeseDa(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESI_OPTIONS.map((m) => (
                        <SelectItem key={m.valore} value={String(m.valore)}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>A - Anno</Label>
                  <Select
                    value={String(annoA)}
                    onValueChange={(v) => setAnnoA(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNI.map((a) => (
                        <SelectItem key={a} value={String(a)}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>A - Mese</Label>
                  <Select
                    value={String(meseA)}
                    onValueChange={(v) => setMeseA(parseInt(v, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESI_OPTIONS.map((m) => (
                        <SelectItem key={m.valore} value={String(m.valore)}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Split preview table */}
            {righe.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Ripartizione per periodo</h3>
                  {!isValidSplit && (
                    <Badge variant="destructive">
                      Somma: {sommaDisplay} ≠ Totale: {totaleDisplay}
                    </Badge>
                  )}
                  {isValidSplit && (
                    <Badge variant="secondary">OK</Badge>
                  )}
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periodo</TableHead>
                        <TableHead className="text-right">Importo (EUR)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {righe.map((r, i) => (
                        <TableRow key={`${r.anno}-${r.mese}`}>
                          <TableCell>
                            {formatPeriodo(r.anno, r.mese)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-24 text-right"
                              value={r.importo || ""}
                              onChange={(e) =>
                                updateRigaImporto(
                                  i,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Descrizione, Note */}
            <div className="grid gap-6 md:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="descrizione">Descrizione</Label>
                <Textarea
                  id="descrizione"
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  placeholder="Opzionale"
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Opzionale"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
            <Separator />

            {/* Document upload: in creazione si possono aggiungere file in coda, allegati al salvataggio */}
            <DocumentUpload
              ref={documentUploadRef}
              spesaId={savedSpesaId ?? spesaId ?? null}
              existingDocuments={initialData?.documenti ?? []}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4 sm:flex-row">
            <Button type="submit" disabled={submitting || !isValidSplit}>
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? "Salva spesa" : "Aggiorna spesa"}
            </Button>
            {mode === "edit" && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
