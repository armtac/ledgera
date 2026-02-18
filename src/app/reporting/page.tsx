"use client";

import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { createClient } from "@/lib/supabase/client";
import type { Voce, Categoria, SubCategoria } from "@/lib/supabase/types";
import { formatImporto, getMeseLabel, generatePeriods } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

const COLORS = [
  "#1e40af",
  "#3b82f6",
  "#06b6d4",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

type JoinResult = { nome: string }[] | { nome: string } | null | undefined;
type JoinResultTipo = { tipo: string }[] | { tipo: string } | null | undefined;

function getJoinName(rel: JoinResult): string | undefined {
  if (!rel) return undefined;
  if (Array.isArray(rel)) return rel[0]?.nome;
  return (rel as { nome: string }).nome;
}

type RigaSpesaRow = {
  id: string;
  anno_rif: number;
  mese_rif: number;
  importo: number;
  voce_id: string;
  categoria_id: string;
  sub_categoria_id: string | null;
  voci: JoinResult;
  categorie: JoinResult;
  sub_categorie: JoinResult;
  spese: JoinResultTipo;
};

export default function ReportingPage() {
  const [loading, setLoading] = useState(true);
  const [righe, setRighe] = useState<RigaSpesaRow[]>([]);
  const [voci, setVoci] = useState<Voce[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [subCategorie, setSubCategorie] = useState<SubCategoria[]>([]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [yearFrom, setYearFrom] = useState<string>(String(currentYear));
  const [yearTo, setYearTo] = useState<string>(String(currentYear));
  const [meseFrom, setMeseFrom] = useState<string>("1");
  const [meseTo, setMeseTo] = useState<string>("12");
  const [voceFilter, setVoceFilter] = useState<string>("all");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [subCategoriaFilter, setSubCategoriaFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("ACT");
  const [compareYears, setCompareYears] = useState<string[]>([]);
  const [periodo1, setPeriodo1] = useState<{ anno: number; mese: number } | null>(
    null
  );
  const [periodo2, setPeriodo2] = useState<{ anno: number; mese: number } | null>(
    null
  );

  const getTipo = (r: RigaSpesaRow): string => {
    const s = r.spese;
    if (!s) return "ACT";
    if (Array.isArray(s)) return s[0]?.tipo ?? "ACT";
    return (s as { tipo: string }).tipo ?? "ACT";
  };
  const getCat = (r: RigaSpesaRow) => getJoinName(r.categorie) ?? "Altro";
  const getVoce = (r: RigaSpesaRow) => getJoinName(r.voci) ?? "Non definita";

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [righeRes, vociRes, categorieRes, subCategorieRes] =
          await Promise.all([
            supabase
              .from("righe_spesa")
              .select(
                "id, anno_rif, mese_rif, importo, voce_id, categoria_id, sub_categoria_id, voci(nome), categorie(nome), sub_categorie(nome), spese(tipo)"
              ),
            supabase.from("voci").select("*").order("ordine", { ascending: true }),
            supabase
              .from("categorie")
              .select("*")
              .order("ordine", { ascending: true }),
            supabase
              .from("sub_categorie")
              .select("*")
              .order("ordine", { ascending: true }),
          ]);

        if (righeRes.error) throw righeRes.error;
        if (vociRes.error) throw vociRes.error;
        if (categorieRes.error) throw categorieRes.error;
        if (subCategorieRes.error) throw subCategorieRes.error;

        setRighe((righeRes.data as RigaSpesaRow[]) ?? []);
        setVoci(vociRes.data ?? []);
        setCategorie(categorieRes.data ?? []);
        setSubCategorie(subCategorieRes.data ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  const filteredRighe = useMemo(() => {
    let r = righe;
    const annoF = parseInt(yearFrom, 10);
    const annoT = parseInt(yearTo, 10);
    const meseF = parseInt(meseFrom, 10);
    const meseT = parseInt(meseTo, 10);

    r = r.filter((row) => {
      if (row.anno_rif < annoF || row.anno_rif > annoT) return false;
      if (row.anno_rif === annoF && row.mese_rif < meseF) return false;
      if (row.anno_rif === annoT && row.mese_rif > meseT) return false;
      if (voceFilter !== "all" && row.voce_id !== voceFilter) return false;
      if (categoriaFilter !== "all" && row.categoria_id !== categoriaFilter)
        return false;
      if (
        subCategoriaFilter !== "all" &&
        row.sub_categoria_id !== subCategoriaFilter
      )
        return false;
      if (tipoFilter !== "all") {
        const tipo = getTipo(row);
        if (tipo !== tipoFilter) return false;
      }
      return true;
    });
    return r;
  }, [
    righe,
    yearFrom,
    yearTo,
    meseFrom,
    meseTo,
    voceFilter,
    categoriaFilter,
    subCategoriaFilter,
    tipoFilter,
  ]);

  const categorieForFilter =
    voceFilter === "all"
      ? categorie
      : categorie.filter((c) => c.voce_id === voceFilter);
  const subCategorieForFilter =
    categoriaFilter === "all"
      ? subCategorie.filter((s) =>
          voceFilter === "all"
            ? true
            : categorie.find((c) => c.id === s.categoria_id)?.voce_id === voceFilter
        )
      : subCategorie.filter((s) => s.categoria_id === categoriaFilter);

  const periods = useMemo(() => {
    const annoF = parseInt(yearFrom, 10);
    const annoT = parseInt(yearTo, 10);
    const meseF = parseInt(meseFrom, 10);
    const meseT = parseInt(meseTo, 10);
    return generatePeriods(annoF, meseF, annoT, meseT);
  }, [yearFrom, yearTo, meseFrom, meseTo]);

  // Trend Temporale (line chart, multi-year, ACT/BUDGET overlay)
  const showDualLines = tipoFilter === "all";

  // Solo periodi già trascorsi (anno corrente fino al mese corrente, niente mesi futuri)
  const trendPeriods = useMemo(
    () =>
      periods.filter(
        (p) =>
          p.anno < currentYear ||
          (p.anno === currentYear && p.mese <= currentMonth)
      ),
    [periods, currentYear, currentMonth]
  );

  const trendData = useMemo(() => {
    const useCompareYears = compareYears.length > 0;
    const anniToCompare = useCompareYears
      ? compareYears.map((y) => parseInt(y, 10))
      : [];

    return trendPeriods.map(({ anno, mese }) => {
      const point: Record<string, string | number> = {
        label: `${getMeseLabel(mese).slice(0, 3)} ${anno.toString().slice(2)}`,
        fullLabel: `${getMeseLabel(mese)} ${anno}`,
      };
      // Una sola linea temporale: ACT, BUDGET o entrambi (stessa logica di "TUTTI")
      if (!useCompareYears) {
        const totACT = filteredRighe
          .filter((r) => r.anno_rif === anno && r.mese_rif === mese && getTipo(r) === "ACT")
          .reduce((s, r) => s + r.importo, 0);
        const totBUDGET = filteredRighe
          .filter((r) => r.anno_rif === anno && r.mese_rif === mese && getTipo(r) === "BUDGET")
          .reduce((s, r) => s + r.importo, 0);
        if (showDualLines) {
          point["ACT"] = totACT;
          point["BUDGET"] = totBUDGET;
        } else {
          point[tipoFilter] = tipoFilter === "ACT" ? totACT : totBUDGET;
        }
      } else {
        anniToCompare.forEach((a) => {
          const tot = filteredRighe
            .filter((r) => r.anno_rif === a && r.mese_rif === mese)
            .reduce((s, r) => s + r.importo, 0);
          point[`anno_${a}`] = tot;
        });
      }
      return point;
    });
  }, [trendPeriods, compareYears, filteredRighe, showDualLines]);

  const lineKeys = useMemo(() => {
    if (compareYears.length > 0) {
      const anni = compareYears.map((y) => parseInt(y, 10));
      return anni.map((a) => `anno_${a}`);
    }
    if (showDualLines) return ["ACT", "BUDGET"];
    return [tipoFilter];
  }, [compareYears, showDualLines, tipoFilter]);

  // Breakdown per Categoria (stacked bar)
  const categoriaNames = useMemo(() => {
    const names = new Set<string>();
    filteredRighe.forEach((r) => {
      const n = getCat(r);
      names.add(n);
    });
    return Array.from(names);
  }, [filteredRighe]);

  // Keys for dual-mode bars: "CatName|ACT" and "CatName|BUDGET"
  const breakdownBarKeys = useMemo(() => {
    if (!showDualLines) return categoriaNames;
    const keys: string[] = [];
    categoriaNames.forEach((cat) => {
      keys.push(`${cat}|ACT`);
      keys.push(`${cat}|BUDGET`);
    });
    return keys;
  }, [categoriaNames, showDualLines]);

  const breakdownCategoriaData = useMemo(() => {
    return periods.map(({ anno, mese }) => {
      const point: Record<string, string | number> = {
        label: `${getMeseLabel(mese).slice(0, 3)} ${anno.toString().slice(2)}`,
        fullLabel: `${getMeseLabel(mese)} ${anno}`,
      };
      const periodRows = filteredRighe.filter((r) => r.anno_rif === anno && r.mese_rif === mese);
      if (showDualLines) {
        categoriaNames.forEach((cat) => {
          const catRows = periodRows.filter((r) => getCat(r) === cat);
          point[`${cat}|ACT`] = catRows.filter((r) => getTipo(r) === "ACT").reduce((s, r) => s + r.importo, 0);
          point[`${cat}|BUDGET`] = catRows.filter((r) => getTipo(r) === "BUDGET").reduce((s, r) => s + r.importo, 0);
        });
      } else {
        categoriaNames.forEach((cat) => {
          point[cat] = periodRows.filter((r) => getCat(r) === cat).reduce((s, r) => s + r.importo, 0);
        });
      }
      return point;
    });
  }, [periods, categoriaNames, filteredRighe, showDualLines]);

  // Confronto periodi (side-by-side)
  const confrontoData = useMemo(() => {
    if (!periodo1 || !periodo2) return [];
    const cats = new Set<string>();
    filteredRighe.forEach((r) => {
      cats.add(getCat(r));
    });

    if (showDualLines) {
      const l1 = getPeriodoLabel(periodo1);
      const l2 = getPeriodoLabel(periodo2);
      return Array.from(cats).map((cat) => {
        const matchP1 = (r: RigaSpesaRow) => r.anno_rif === periodo1.anno && r.mese_rif === periodo1.mese && (getCat(r)) === cat;
        const matchP2 = (r: RigaSpesaRow) => r.anno_rif === periodo2.anno && r.mese_rif === periodo2.mese && (getCat(r)) === cat;
        return {
          categoria: cat,
          [`${l1} ACT`]: filteredRighe.filter((r) => matchP1(r) && getTipo(r) === "ACT").reduce((s, r) => s + r.importo, 0),
          [`${l1} BUDGET`]: filteredRighe.filter((r) => matchP1(r) && getTipo(r) === "BUDGET").reduce((s, r) => s + r.importo, 0),
          [`${l2} ACT`]: filteredRighe.filter((r) => matchP2(r) && getTipo(r) === "ACT").reduce((s, r) => s + r.importo, 0),
          [`${l2} BUDGET`]: filteredRighe.filter((r) => matchP2(r) && getTipo(r) === "BUDGET").reduce((s, r) => s + r.importo, 0),
        };
      }).filter((row) => Object.entries(row).some(([k, v]) => k !== "categoria" && typeof v === "number" && v > 0));
    }

    return Array.from(cats).map((cat) => {
      const tot1 = filteredRighe
        .filter(
          (r) =>
            r.anno_rif === periodo1.anno &&
            r.mese_rif === periodo1.mese &&
            (getCat(r)) === cat
        )
        .reduce((s, r) => s + r.importo, 0);
      const tot2 = filteredRighe
        .filter(
          (r) =>
            r.anno_rif === periodo2.anno &&
            r.mese_rif === periodo2.mese &&
            (getCat(r)) === cat
        )
        .reduce((s, r) => s + r.importo, 0);
      return {
        categoria: cat,
        [getPeriodoLabel(periodo1)]: tot1,
        [getPeriodoLabel(periodo2)]: tot2,
      };
    }).filter((row) => (row[getPeriodoLabel(periodo1)] as number) > 0 || (row[getPeriodoLabel(periodo2)] as number) > 0);
  }, [periodo1, periodo2, filteredRighe, showDualLines]);

  function getPeriodoLabel(p: { anno: number; mese: number }) {
    return `${getMeseLabel(p.mese).slice(0, 3)} ${p.anno}`;
  }

  // Tabella riepilogativa per Voce > Categoria (con split tipo quando "Tutti")
  const tabellaRiepilogativa = useMemo(() => {
    const colKeys = periods.map(
      (p) => `${getMeseLabel(p.mese).slice(0, 3)} ${p.anno.toString().slice(2)}`
    );

    if (showDualLines) {
      const byVoceCatTipo: Record<string, Record<string, Record<string, Record<string, number>>>> = {};
      filteredRighe.forEach((r) => {
        const voce = getVoce(r);
        const cat = getCat(r);
        const tipo = getTipo(r);
        const key = `${getMeseLabel(r.mese_rif).slice(0, 3)} ${r.anno_rif.toString().slice(2)}`;
        if (!byVoceCatTipo[voce]) byVoceCatTipo[voce] = {};
        if (!byVoceCatTipo[voce][cat]) byVoceCatTipo[voce][cat] = {};
        if (!byVoceCatTipo[voce][cat][tipo]) byVoceCatTipo[voce][cat][tipo] = {};
        byVoceCatTipo[voce][cat][tipo][key] = (byVoceCatTipo[voce][cat][tipo][key] ?? 0) + r.importo;
      });

      const rows: { voce: string; categoria: string; tipo: string; cols: Record<string, number>; totale: number }[] = [];
      Object.keys(byVoceCatTipo).sort().forEach((voce) => {
        Object.keys(byVoceCatTipo[voce]).sort().forEach((cat) => {
          (["ACT", "BUDGET"] as const).forEach((tipo) => {
            const data = byVoceCatTipo[voce]?.[cat]?.[tipo] ?? {};
            const cols: Record<string, number> = {};
            let totale = 0;
            colKeys.forEach((k) => {
              const v = data[k] ?? 0;
              cols[k] = v;
              totale += v;
            });
            if (totale > 0) {
              rows.push({ voce, categoria: cat, tipo, cols, totale });
            }
          });
        });
      });
      return { rows, colKeys };
    }

    const byVoceCategoria: Record<string, Record<string, Record<string, number>>> = {};
    filteredRighe.forEach((r) => {
      const voce = getVoce(r);
      const cat = getCat(r);
      const key = `${getMeseLabel(r.mese_rif).slice(0, 3)} ${r.anno_rif.toString().slice(2)}`;
      if (!byVoceCategoria[voce]) byVoceCategoria[voce] = {};
      if (!byVoceCategoria[voce][cat]) byVoceCategoria[voce][cat] = {};
      byVoceCategoria[voce][cat][key] =
        (byVoceCategoria[voce][cat][key] ?? 0) + r.importo;
    });

    const rows: { voce: string; categoria: string; tipo: string; cols: Record<string, number>; totale: number }[] = [];
    Object.keys(byVoceCategoria).sort().forEach((voce) => {
      Object.keys(byVoceCategoria[voce]).sort().forEach((cat) => {
        const cols: Record<string, number> = {};
        let totale = 0;
        colKeys.forEach((k) => {
          const v = byVoceCategoria[voce][cat][k] ?? 0;
          cols[k] = v;
          totale += v;
        });
        rows.push({ voce, categoria: cat, tipo: "", cols, totale });
      });
    });
    return { rows, colKeys };
  }, [filteredRighe, periods, showDualLines]);

  const years = useMemo(() => {
    const anni = new Set<number>();
    anni.add(currentYear);
    righe.forEach((r) => anni.add(r.anno_rif));
    return Array.from(anni).sort((a, b) => b - a);
  }, [righe, currentYear]);

  const handleAddCompareYear = (y: string) => {
    if (y && !compareYears.includes(y)) {
      setCompareYears((prev) => [...prev, y].sort((a, b) => a.localeCompare(b)));
    }
  };

  const handleRemoveCompareYear = (y: string) => {
    setCompareYears((prev) => prev.filter((x) => x !== y));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reporting</h1>
          <p className="text-muted-foreground mt-1">
            Analisi dettagliata e confronti
          </p>
        </div>
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reporting</h1>
        <p className="text-muted-foreground mt-1">
          Analisi dettagliata e confronti
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtri</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filtra i dati per anno, periodo, voce e categoria
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Anno da</Label>
              <Select value={yearFrom} onValueChange={setYearFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mese da</Label>
              <Select value={meseFrom} onValueChange={setMeseFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {getMeseLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anno a</Label>
              <Select value={yearTo} onValueChange={setYearTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mese a</Label>
              <Select value={meseTo} onValueChange={setMeseTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {getMeseLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Voce</Label>
              <Select value={voceFilter} onValueChange={setVoceFilter}>
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={categoriaFilter}
                onValueChange={(v) => {
                  setCategoriaFilter(v);
                  setSubCategoriaFilter("all");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {categorieForFilter.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sub-Categoria</Label>
              <Select
                value={subCategoriaFilter}
                onValueChange={setSubCategoriaFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  {subCategorieForFilter.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tutti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="ACT">ACT</SelectItem>
                  <SelectItem value="BUDGET">BUDGET</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm">Confronto anni (Trend):</Label>
            <Select
              value=""
              onValueChange={(v) => {
                if (v) handleAddCompareYear(v);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Aggiungi anno" />
              </SelectTrigger>
              <SelectContent>
                {years
                  .filter((y) => !compareYears.includes(String(y)))
                  .map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {compareYears.map((y) => (
              <Button
                key={y}
                variant="secondary"
                size="sm"
                onClick={() => handleRemoveCompareYear(y)}
              >
                {y} ×
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="trend">Trend Temporale</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown Categoria</TabsTrigger>
          <TabsTrigger value="confronto">Confronto Periodi</TabsTrigger>
          <TabsTrigger value="tabella">Tabella Riepilogativa</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Temporale</CardTitle>
              <p className="text-sm text-muted-foreground">
                Andamento mensile delle spese
                {compareYears.length > 0 &&
                  ` - Confronto anni: ${compareYears.join(", ")}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v) => `€${Math.round(v).toLocaleString("it-IT")}`}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatImporto(value), ""]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.fullLabel ?? ""
                      }
                    />
                    <Legend />
                    {lineKeys.map((key, i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key === "ACT" ? "ACT (Effettivo)" : key === "BUDGET" ? "BUDGET (Previsione)" : key.replace("anno_", "Anno ")}
                        stroke={key === "BUDGET" ? "#d97706" : COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        strokeDasharray={key === "BUDGET" ? "5 5" : undefined}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Breakdown per Categoria</CardTitle>
              <p className="text-sm text-muted-foreground">
                {showDualLines
                  ? "ACT vs BUDGET per mese (barre affiancate)"
                  : "Spese per categoria per mese (grafico a barre impilate)"}
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    key={showDualLines ? "dual" : "single"}
                    data={breakdownCategoriaData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      tickFormatter={(v) => `€${Math.round(v).toLocaleString("it-IT")}`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatImporto(value),
                        showDualLines ? name.replace("|", " — ") : name,
                      ]}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.fullLabel ?? ""
                      }
                    />
                    <Legend
                      formatter={(value: string) =>
                        showDualLines ? value.replace("|", " — ") : value
                      }
                    />
                    {showDualLines
                      ? categoriaNames.flatMap((cat, i) => [
                          <Bar
                            key={`${cat}|ACT`}
                            dataKey={`${cat}|ACT`}
                            stackId="act"
                            fill={COLORS[i % COLORS.length]}
                            name={`${cat}|ACT`}
                          />,
                          <Bar
                            key={`${cat}|BUDGET`}
                            dataKey={`${cat}|BUDGET`}
                            stackId="budget"
                            fill={COLORS[i % COLORS.length]}
                            fillOpacity={0.35}
                            name={`${cat}|BUDGET`}
                          />,
                        ])
                      : categoriaNames.map((cat, i) => (
                          <Bar
                            key={cat}
                            dataKey={cat}
                            stackId="a"
                            fill={COLORS[i % COLORS.length]}
                            name={cat}
                          />
                        ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="confronto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confronto Periodi</CardTitle>
              <p className="text-sm text-muted-foreground">
                Confronta due periodi (mese/anno)
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2">
                  <Label>Periodo 1</Label>
                  <Select
                    value={
                      periodo1
                        ? `${periodo1.anno}-${periodo1.mese}`
                        : "none"
                    }
                    onValueChange={(v) => {
                      if (v === "none") setPeriodo1(null);
                      else {
                        const [a, m] = v.split("-").map(Number);
                        setPeriodo1({ anno: a, mese: m });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {periods.map((p) => (
                        <SelectItem
                          key={`${p.anno}-${p.mese}`}
                          value={`${p.anno}-${p.mese}`}
                        >
                          {getMeseLabel(p.mese)} {p.anno}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Periodo 2</Label>
                  <Select
                    value={
                      periodo2
                        ? `${periodo2.anno}-${periodo2.mese}`
                        : "none"
                    }
                    onValueChange={(v) => {
                      if (v === "none") setPeriodo2(null);
                      else {
                        const [a, m] = v.split("-").map(Number);
                        setPeriodo2({ anno: a, mese: m });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {periods.map((p) => (
                        <SelectItem
                          key={`${p.anno}-${p.mese}`}
                          value={`${p.anno}-${p.mese}`}
                        >
                          {getMeseLabel(p.mese)} {p.anno}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {confrontoData.length > 0 ? (
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={confrontoData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => `€${Math.round(v).toLocaleString("it-IT")}`} />
                      <YAxis
                        type="category"
                        dataKey="categoria"
                        width={75}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => formatImporto(value)}
                      />
                      <Legend />
                      {showDualLines ? (
                        <>
                          {periodo1 && <Bar dataKey={`${getPeriodoLabel(periodo1)} ACT`} fill={COLORS[0]} radius={[0, 4, 4, 0]} />}
                          {periodo1 && <Bar dataKey={`${getPeriodoLabel(periodo1)} BUDGET`} fill={COLORS[0]} fillOpacity={0.35} radius={[0, 4, 4, 0]} />}
                          {periodo2 && <Bar dataKey={`${getPeriodoLabel(periodo2)} ACT`} fill={COLORS[1]} radius={[0, 4, 4, 0]} />}
                          {periodo2 && <Bar dataKey={`${getPeriodoLabel(periodo2)} BUDGET`} fill={COLORS[1]} fillOpacity={0.35} radius={[0, 4, 4, 0]} />}
                        </>
                      ) : (
                        <>
                          {periodo1 && (
                            <Bar
                              dataKey={getPeriodoLabel(periodo1)}
                              fill={COLORS[0]}
                              radius={[0, 4, 4, 0]}
                            />
                          )}
                          {periodo2 && (
                            <Bar
                              dataKey={getPeriodoLabel(periodo2)}
                              fill={COLORS[1]}
                              radius={[0, 4, 4, 0]}
                            />
                          )}
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  Seleziona due periodi per confrontare
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tabella" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tabella Riepilogativa</CardTitle>
              <p className="text-sm text-muted-foreground">
                Riepilogo per Voce &gt; Categoria con colonne mensili
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Voce</TableHead>
                      <TableHead className="font-semibold">Categoria</TableHead>
                      {showDualLines && (
                        <TableHead className="font-semibold">Tipo</TableHead>
                      )}
                      {tabellaRiepilogativa.colKeys.map((k) => (
                        <TableHead key={k} className="text-right min-w-[80px]">
                          {k}
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-semibold min-w-[90px]">
                        Totale
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabellaRiepilogativa.rows.map((row, i) => (
                      <TableRow
                        key={`${row.voce}-${row.categoria}-${row.tipo}-${i}`}
                        className={row.tipo === "BUDGET" ? "bg-amber-50/60" : ""}
                      >
                        <TableCell className="font-medium">{row.voce}</TableCell>
                        <TableCell>{row.categoria}</TableCell>
                        {showDualLines && (
                          <TableCell>
                            <span className={`text-xs font-medium ${row.tipo === "BUDGET" ? "text-amber-700" : "text-blue-700"}`}>
                              {row.tipo}
                            </span>
                          </TableCell>
                        )}
                        {tabellaRiepilogativa.colKeys.map((k) => (
                          <TableCell key={k} className="text-right">
                            {row.cols[k]! > 0
                              ? formatImporto(row.cols[k]!)
                              : "—"}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-medium">
                          {formatImporto(row.totale)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {tabellaRiepilogativa.rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={tabellaRiepilogativa.colKeys.length + (showDualLines ? 4 : 3)}
                          className="text-center text-muted-foreground py-8"
                        >
                          Nessun dato nel periodo selezionato
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {tabellaRiepilogativa.rows.length > 0 && (
                    <TableFooter>
                      {showDualLines ? (
                        <>
                          {(["ACT", "BUDGET"] as const).map((tipo) => {
                            const tipoRows = tabellaRiepilogativa.rows.filter((r) => r.tipo === tipo);
                            if (tipoRows.length === 0) return null;
                            return (
                              <TableRow key={tipo}>
                                <TableCell colSpan={2} className="font-semibold">
                                  Totale
                                </TableCell>
                                <TableCell className={`font-semibold ${tipo === "BUDGET" ? "text-amber-700" : "text-blue-700"}`}>
                                  {tipo}
                                </TableCell>
                                {tabellaRiepilogativa.colKeys.map((k) => {
                                  const tot = tipoRows.reduce((s, r) => s + (r.cols[k] ?? 0), 0);
                                  return (
                                    <TableCell key={k} className="text-right font-semibold">
                                      {formatImporto(tot)}
                                    </TableCell>
                                  );
                                })}
                                <TableCell className="text-right font-semibold">
                                  {formatImporto(tipoRows.reduce((s, r) => s + r.totale, 0))}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </>
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="font-semibold">
                            Totale
                          </TableCell>
                          {tabellaRiepilogativa.colKeys.map((k) => {
                            const tot = tabellaRiepilogativa.rows.reduce(
                              (s, r) => s + (r.cols[k] ?? 0),
                              0
                            );
                            return (
                              <TableCell key={k} className="text-right font-semibold">
                                {formatImporto(tot)}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-semibold">
                            {formatImporto(
                              tabellaRiepilogativa.rows.reduce(
                                (s, r) => s + r.totale,
                                0
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableFooter>
                  )}
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
