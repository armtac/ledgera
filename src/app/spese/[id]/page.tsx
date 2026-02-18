"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Spesa, RigaSpesa, Documento } from "@/lib/supabase/types";
import { SpesaForm } from "@/components/spese/spesa-form";
import { Loader2 } from "lucide-react";

export default function ModificaSpesaPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<{
    spesa: Spesa;
    righe: RigaSpesa[];
    documenti: Documento[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("ID mancante");
      return;
    }

    const load = async () => {
      const { data: spesaData, error: errSpesa } = await supabase
        .from("spese")
        .select("*")
        .eq("id", id)
        .single();

      if (errSpesa || !spesaData) {
        setError("Spesa non trovata");
        setLoading(false);
        return;
      }

      const { data: righeData, error: errRighe } = await supabase
        .from("righe_spesa")
        .select("*")
        .eq("spesa_id", id)
        .order("anno_rif")
        .order("mese_rif");

      if (errRighe) {
        setError("Errore caricamento righe");
        setLoading(false);
        return;
      }

      const { data: docData } = await supabase
        .from("documenti")
        .select("*")
        .eq("spesa_id", id)
        .order("created_at");

      setData({
        spesa: spesaData as Spesa,
        righe: (righeData ?? []) as RigaSpesa[],
        documenti: (docData ?? []) as Documento[],
      });
      setLoading(false);
    };

    load();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? "Spesa non trovata"}</p>
      </div>
    );
  }

  return (
    <SpesaForm
      mode="edit"
      spesaId={id}
      initialData={{ spesa: data.spesa, righe: data.righe, documenti: data.documenti }}
    />
  );
}
