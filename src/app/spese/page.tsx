"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function useIsMobile(breakpoint = 768) {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    [breakpoint]
  );
  const getSnapshot = useCallback(
    () => window.innerWidth < breakpoint,
    [breakpoint]
  );
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type RowSelectionState,
  type ColumnDef,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import type { Spesa, Voce, Categoria, SubCategoria, Utente, Fornitore } from "@/lib/supabase/types";
import { formatImporto, formatPeriodo, MESI } from "@/lib/utils";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { ArrowUpDown, FileSpreadsheet, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ImportSpese } from "@/components/spese/import-spese";

// --- Types ---

type RigaSpesaWithNames = {
  voce_id: string;
  categoria_id: string;
  sub_categoria_id: string | null;
  voci: { nome: string } | null;
  categorie: { nome: string } | null;
  sub_categorie: { nome: string } | null;
};

type SpesaListItem = Spesa & {
  righe_spesa: RigaSpesaWithNames[];
  utenti?: { nome: string } | null;
  fornitori?: { nome: string } | null;
};

type FonteSpesa = "manuale" | "ai_agent" | "telegram";
type TipoSpesa = "ACT" | "BUDGET";

// --- Helpers ---

const FONTE_LABELS: Record<FonteSpesa, string> = {
  manuale: "Manuale",
  ai_agent: "AI Agent",
  telegram: "Telegram",
};

const TIPO_LABELS: Record<TipoSpesa, string> = {
  ACT: "ACT",
  BUDGET: "BUDGET",
};

function FonteBadge({ fonte }: { fonte: FonteSpesa }) {
  const variants: Record<FonteSpesa, string> = {
    manuale: "bg-blue-100 text-blue-800 border-blue-200",
    ai_agent: "bg-purple-100 text-purple-800 border-purple-200",
    telegram: "bg-green-100 text-green-800 border-green-200",
  };
  return (
    <Badge variant="outline" className={cn("border", variants[fonte])}>
      {FONTE_LABELS[fonte]}
    </Badge>
  );
}

function TipoBadge({ tipo }: { tipo: TipoSpesa }) {
  const variants: Record<TipoSpesa, string> = {
    ACT: "bg-blue-100 text-blue-800 border-blue-200",
    BUDGET: "bg-amber-100 text-amber-800 border-amber-200",
  };
  return (
    <Badge variant="outline" className={cn("border", variants[tipo])}>
      {TIPO_LABELS[tipo]}
    </Badge>
  );
}

const currentYear = new Date().getFullYear();

// --- Main Component ---

export default function SpesePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [spese, setSpese] = useState<SpesaListItem[]>([]);
  const [voci, setVoci] = useState<Voce[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [subCategorie, setSubCategorie] = useState<SubCategoria[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [importOpen, setImportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [anno, setAnno] = useState<string>("all");
  const [mese, setMese] = useState<string>("");
  const [voceId, setVoceId] = useState<string>("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [subCategoriaId, setSubCategoriaId] = useState<string>("");
  const [inseritoDa, setInseritoDa] = useState<string>("");
  const [fonte, setFonte] = useState<string>("");
  const [tipoFilter, setTipoFilter] = useState<string>("");
  const [fornitoreId, setFornitoreId] = useState<string>("");

  const clearFilters = useCallback(() => {
    setAnno("all");
    setMese("");
    setVoceId("");
    setCategoriaId("");
    setSubCategoriaId("");
    setInseritoDa("");
    setFonte("");
    setTipoFilter("");
    setFornitoreId("");
    setRowSelection({});
  }, []);

  // Data loading
  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setLoading(true);

      const [
        { data: speseData },
        { data: vociData },
        { data: categorieData },
        { data: subCategorieData },
        { data: utentiData },
        { data: fornitoriData },
      ] = await Promise.all([
        supabase
          .from("spese")
          .select(
            `
            *,
            fornitori (nome),
            righe_spesa (
              voce_id,
              categoria_id,
              sub_categoria_id,
              voci (nome),
              categorie (nome),
              sub_categorie (nome)
            )
          `
          )
          .order("anno_df", { ascending: false })
          .order("mese_df", { ascending: false }),

        supabase.from("voci").select("*").eq("attivo", true).order("ordine"),
        supabase.from("categorie").select("*").eq("attivo", true).order("ordine"),
        supabase.from("sub_categorie").select("*").eq("attivo", true).order("ordine"),
        supabase.from("utenti").select("*").eq("attivo", true).order("ordine"),
        supabase.from("fornitori").select("*").eq("attivo", true).order("ordine"),
      ]);

      setSpese((speseData ?? []) as SpesaListItem[]);
      setVoci((vociData ?? []) as Voce[]);
      setCategorie((categorieData ?? []) as Categoria[]);
      setSubCategorie((subCategorieData ?? []) as SubCategoria[]);
      setUtenti((utentiData ?? []) as Utente[]);
      setFornitori((fornitoriData ?? []) as Fornitore[]);
      setLoading(false);
    }

    load();
  }, [reloadKey]);

  // Filtered data (client-side)
  const filteredSpese = useMemo(() => {
    return spese.filter((s) => {
      if (anno && anno !== "all" && s.anno_df !== parseInt(anno, 10)) return false;
      if (mese && s.mese_df !== parseInt(mese, 10)) return false;
      if (inseritoDa && s.inserito_da !== inseritoDa) return false;
      if (fonte && s.fonte !== fonte) return false;
      if (tipoFilter && (s as SpesaListItem & { tipo?: string }).tipo !== tipoFilter) return false;
      if (fornitoreId && s.fornitore_id !== fornitoreId) return false;

      const riga = s.righe_spesa?.[0];
      if (!riga) return !voceId && !categoriaId && !subCategoriaId;

      if (voceId && riga.voce_id !== voceId) return false;
      if (categoriaId && riga.categoria_id !== categoriaId) return false;
      if (subCategoriaId && riga.sub_categoria_id !== subCategoriaId) return false;

      return true;
    });
  }, [spese, anno, mese, voceId, categoriaId, subCategoriaId, inseritoDa, fonte, tipoFilter, fornitoreId]);

  // Filtered categories by selected voce
  const filteredCategorie = useMemo(() => {
    if (!voceId) return categorie;
    return categorie.filter((c) => c.voce_id === voceId);
  }, [categorie, voceId]);

  // Filtered sub-categories by selected categoria
  const filteredSubCategorie = useMemo(() => {
    if (!categoriaId) return subCategorie;
    return subCategorie.filter((sc) => sc.categoria_id === categoriaId);
  }, [subCategorie, categoriaId]);

  // Reset dependent filters when parent changes
  useEffect(() => {
    if (voceId && !filteredCategorie.some((c) => c.id === categoriaId)) {
      setCategoriaId("");
      setSubCategoriaId("");
    }
  }, [voceId, categoriaId, filteredCategorie]);

  useEffect(() => {
    if (categoriaId && !filteredSubCategorie.some((sc) => sc.id === subCategoriaId)) {
      setSubCategoriaId("");
    }
  }, [categoriaId, subCategoriaId, filteredSubCategorie]);

  // Table columns
  const columns = useMemo<ColumnDef<SpesaListItem>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-primary"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Seleziona tutto"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 cursor-pointer accent-primary"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            aria-label="Seleziona riga"
          />
        ),
        enableSorting: false,
      },
      {
        id: "periodo",
        accessorFn: (row) => `${row.anno_df}-${row.mese_df}`,
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Data DF
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) =>
          formatPeriodo(row.original.anno_df, row.original.mese_df),
      },
      {
        id: "voce",
        accessorFn: (row) => row.righe_spesa?.[0]?.voci?.nome ?? "—",
        header: "Voce",
        cell: ({ row }) => row.original.righe_spesa?.[0]?.voci?.nome ?? "—",
      },
      {
        id: "categoria",
        accessorFn: (row) => row.righe_spesa?.[0]?.categorie?.nome ?? "—",
        header: "Categoria",
        cell: ({ row }) => row.original.righe_spesa?.[0]?.categorie?.nome ?? "—",
      },
      {
        id: "sub_categoria",
        accessorFn: (row) => row.righe_spesa?.[0]?.sub_categorie?.nome ?? "—",
        header: "Sub-Categoria",
        cell: ({ row }) =>
          row.original.righe_spesa?.[0]?.sub_categorie?.nome ?? "—",
      },
      {
        id: "fornitore",
        accessorFn: (row) => row.fornitori?.nome ?? "—",
        header: "Fornitore",
        cell: ({ row }) => row.original.fornitori?.nome ?? "—",
      },
      {
        id: "tipo",
        accessorFn: (row) => (row as SpesaListItem & { tipo?: string }).tipo ?? "ACT",
        header: "Tipo",
        cell: ({ row }) => (
          <TipoBadge tipo={((row.original as SpesaListItem & { tipo?: string }).tipo ?? "ACT") as TipoSpesa} />
        ),
      },
      {
        id: "fattura_num",
        accessorKey: "fattura_num",
        header: "Fattura#",
        cell: ({ row }) => row.original.fattura_num ?? "—",
      },
      {
        id: "importo_totale",
        accessorKey: "importo_totale",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            Importo Totale
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) =>
          formatImporto(row.original.importo_totale),
      },
      {
        id: "inserito_da",
        accessorKey: "inserito_da",
        header: "Inserito da",
        cell: ({ row }) => row.original.inserito_da,
      },
      {
        id: "fonte",
        accessorKey: "fonte",
        header: "Fonte",
        cell: ({ row }) => (
          <FonteBadge fonte={row.original.fonte as FonteSpesa} />
        ),
      },
      {
        id: "azioni",
        header: "Azioni",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/spese/${row.original.id}`);
            }}
            aria-label="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [router]
  );

  const columnVisibility = useMemo(
    () =>
      isMobile
        ? {
            categoria: false as boolean,
            sub_categoria: false as boolean,
            fornitore: false as boolean,
            fattura_num: false as boolean,
            inserito_da: false as boolean,
          }
        : ({} as Record<string, boolean>),
    [isMobile]
  );

  const table = useReactTable({
    data: filteredSpese,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: () => {},
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalImporto = useMemo(
    () => filteredSpese.reduce((sum, s) => sum + s.importo_totale, 0),
    [filteredSpese]
  );

  const anni = useMemo(() => {
    const years = new Set(spese.map((s) => s.anno_df));
    return Array.from(years).sort((a, b) => b - a);
  }, [spese]);

  const yearOptions = useMemo(() => {
    if (anni.length === 0) return [currentYear];
    return [...anni];
  }, [anni]);

  const selectedCount = Object.keys(rowSelection).length;

  const handleBulkDelete = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Vuoi eliminare ${selectedIds.length} spese selezionate? L'operazione non è reversibile.`
      )
    )
      return;

    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("spese")
        .delete()
        .in("id", selectedIds);
      if (error) throw error;
      toast.success(`${selectedIds.length} spese eliminate con successo.`);
      setRowSelection({});
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      toast.error("Errore durante l'eliminazione.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Elenco Spese</h1>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Elimina ({selectedCount})
            </Button>
          )}
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importa Excel
          </Button>
          <Button asChild>
            <Link href="/spese/nuova">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Spesa
            </Link>
          </Button>
        </div>
      </div>

      <ImportSpese
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => setReloadKey((k) => k + 1)}
      />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-sm font-medium text-muted-foreground">Filtri</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Anno
              </label>
              <Select value={anno} onValueChange={setAnno}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Anno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Mese
              </label>
              <Select value={mese || "all"} onValueChange={(v) => setMese(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {MESI.map((nome, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Voce
              </label>
              <Select value={voceId || "all"} onValueChange={(v) => setVoceId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {voci.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Categoria
              </label>
              <Select value={categoriaId || "all"} onValueChange={(v) => setCategoriaId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {filteredCategorie.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Sub-Categoria
              </label>
              <Select value={subCategoriaId || "all"} onValueChange={(v) => setSubCategoriaId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {filteredSubCategorie.map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>
                      {sc.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Tipo
              </label>
              <Select value={tipoFilter || "all"} onValueChange={(v) => setTipoFilter(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                  <SelectItem value="BUDGET">BUDGET</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Fornitore
              </label>
              <Select value={fornitoreId || "all"} onValueChange={(v) => setFornitoreId(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {fornitori.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Inserito da
              </label>
              <Select value={inseritoDa || "all"} onValueChange={(v) => setInseritoDa(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  {utenti.map((u) => (
                    <SelectItem key={u.id} value={u.nome}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Fonte
              </label>
              <Select value={fonte || "all"} onValueChange={(v) => setFonte(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {(Object.keys(FONTE_LABELS) as FonteSpesa[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      {FONTE_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Trash2 className="mr-2 h-4 w-4" />
              Pulisci filtri
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {filteredSpese.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nessuna spesa trovata
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 even:bg-muted/20",
                      row.getIsSelected() && "bg-blue-50 even:bg-blue-50"
                    )}
                    onClick={() => router.push(`/spese/${row.original.id}`)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.id === "select" && "w-[40px]",
                          cell.column.id === "azioni" && "w-[60px]"
                        )}
                        onClick={
                          cell.column.id === "azioni" || cell.column.id === "select"
                            ? (e) => e.stopPropagation()
                            : undefined
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
                {(() => {
                  const importoIndex = table
                    .getVisibleLeafColumns()
                    .findIndex((c) => c.id === "importo_totale");
                  const before = importoIndex >= 0 ? importoIndex : 5;
                  const after =
                    table.getVisibleLeafColumns().length - 1 - before;
                  return (
                    <>
                      <TableCell colSpan={before} className="text-right">
                        Totale ({filteredSpese.length} spese)
                      </TableCell>
                      <TableCell>{formatImporto(totalImporto)}</TableCell>
                      <TableCell colSpan={after} />
                    </>
                  );
                })()}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Card>
    </div>
  );
}
