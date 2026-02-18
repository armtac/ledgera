"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { createClient } from "@/lib/supabase/client";
import { formatImporto, getMeseLabel } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp } from "lucide-react";

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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [righe, setRighe] = useState<RigaSpesaRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from("righe_spesa")
        .select(
          "id, anno_rif, mese_rif, importo, voce_id, categoria_id, sub_categoria_id, voci(nome), categorie(nome), sub_categorie(nome), spese(tipo)"
        );

      if (error) {
        console.error("Error fetching righe_spesa:", error);
        setRighe([]);
      } else {
        setRighe((data as RigaSpesaRow[]) ?? []);
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const getTipo = (r: RigaSpesaRow): string => {
    const s = r.spese;
    if (!s) return "ACT";
    if (Array.isArray(s)) return s[0]?.tipo ?? "ACT";
    return (s as { tipo: string }).tipo ?? "ACT";
  };
  const getCat = (r: RigaSpesaRow) => getJoinName(r.categorie) ?? "Non definita";
  const righeACT = righe.filter((r) => getTipo(r) === "ACT");

  const prevYear = currentYear - 1;

  // YTD anno corrente (ACT)
  const actYTD = righeACT
    .filter((r) => r.anno_rif === currentYear && r.mese_rif <= currentMonth)
    .reduce((sum, r) => sum + r.importo, 0);

  // YTD anno precedente (ACT) – stesso periodo (es. Gen–Feb 25)
  const actYTDPrecedente = righeACT
    .filter((r) => r.anno_rif === prevYear && r.mese_rif <= currentMonth)
    .reduce((sum, r) => sum + r.importo, 0);

  // Totale anno precedente (tutto l’anno)
  const totaleAnnoPrecedente = righeACT
    .filter((r) => r.anno_rif === prevYear)
    .reduce((sum, r) => sum + r.importo, 0);

  const varianzaVsPrecedente = actYTD - actYTDPrecedente;
  const varianzaVsPrecedentePct =
    actYTDPrecedente > 0 ? (varianzaVsPrecedente / actYTDPrecedente) * 100 : 0;

  // Trend 12 mesi
  const last12Months: { anno: number; mese: number }[] = [];
  let a = currentYear;
  let m = currentMonth;
  for (let i = 0; i < 12; i++) {
    last12Months.unshift({ anno: a, mese: m });
    m--;
    if (m < 1) {
      m = 12;
      a--;
    }
  }

  const trend12Mesi = last12Months.map(({ anno, mese }) => ({
    label: `${getMeseLabel(mese).slice(0, 3)} ${anno.toString().slice(2)}`,
    importo: righeACT
      .filter((r) => r.anno_rif === anno && r.mese_rif === mese)
      .reduce((sum, r) => sum + r.importo, 0),
    fullLabel: `${getMeseLabel(mese)} ${anno}`,
  }));

  // Top 5 Categorie (solo ACT)
  const byCategoria = righeACT.reduce<Record<string, number>>((acc, r) => {
    const nome = getCat(r);
    acc[nome] = (acc[nome] ?? 0) + r.importo;
    return acc;
  }, {});

  const top5Categorie = Object.entries(byCategoria)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Panoramica delle spese e trend
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Panoramica delle spese e trend
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {getMeseLabel(currentMonth).slice(0, 3)} {String(prevYear).slice(2)} YTD Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{formatImporto(actYTDPrecedente)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Gen – {getMeseLabel(currentMonth)} {prevYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {getMeseLabel(currentMonth).slice(0, 3)} {String(currentYear).slice(2)} YTD Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatImporto(actYTD)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Gen – {getMeseLabel(currentMonth)} {currentYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variazione vs Anno Precedente
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <span
              className={`text-2xl font-bold flex items-center gap-1 ${
                varianzaVsPrecedente <= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {varianzaVsPrecedente <= 0 ? (
                <ArrowDown className="h-5 w-5" />
              ) : (
                <ArrowUp className="h-5 w-5" />
              )}
              {formatImporto(Math.abs(varianzaVsPrecedente))}
            </span>
            <p className="text-xs text-muted-foreground">
              {varianzaVsPrecedente <= 0 ? "sotto" : "sopra"} anno precedente ({varianzaVsPrecedentePct >= 0 ? "+" : ""}{varianzaVsPrecedentePct.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totale Anno Precedente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatImporto(totaleAnnoPrecedente)}</p>
            <p className="text-xs text-muted-foreground mt-1">Anno {prevYear}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trend 12 mesi</CardTitle>
            <p className="text-sm text-muted-foreground">
              Totale spese per mese
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend12Mesi} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `€${Math.round(v).toLocaleString("it-IT")}`} />
                  <Tooltip
                    formatter={(value: number) => [formatImporto(value), "Importo"]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullLabel ?? ""
                    }
                  />
                  <Bar dataKey="importo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Categorie</CardTitle>
            <p className="text-sm text-muted-foreground">
              Le categorie con spesa maggiore
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={top5Categorie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {top5Categorie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatImporto(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
