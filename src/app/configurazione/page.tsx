"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  MoreHorizontal,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Utente, Voce, Categoria, SubCategoria, Fornitore } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TabKey = "voci" | "categorie" | "subcategorie" | "utenti" | "fornitori";

export default function ConfigurazionePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("voci");
  const [loading, setLoading] = useState(true);
  const [voci, setVoci] = useState<Voce[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [subCategorie, setSubCategorie] = useState<SubCategoria[]>([]);
  const [utenti, setUtenti] = useState<Utente[]>([]);
  const [fornitori, setFornitori] = useState<Fornitore[]>([]);

  // Filters
  const [filterVoce, setFilterVoce] = useState<string>("all");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formVoceId, setFormVoceId] = useState<string>("");
  const [formCategoriaId, setFormCategoriaId] = useState<string>("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [vociRes, categorieRes, subCategorieRes, utentiRes, fornitoriRes] =
        await Promise.all([
          supabase
            .from("voci")
            .select("*")
            .order("ordine", { ascending: true }),
          supabase
            .from("categorie")
            .select("*")
            .order("ordine", { ascending: true }),
          supabase
            .from("sub_categorie")
            .select("*")
            .order("ordine", { ascending: true }),
          supabase
            .from("utenti")
            .select("*")
            .order("ordine", { ascending: true }),
          supabase
            .from("fornitori")
            .select("*")
            .order("ordine", { ascending: true }),
        ]);

      if (vociRes.error) throw vociRes.error;
      if (categorieRes.error) throw categorieRes.error;
      if (subCategorieRes.error) throw subCategorieRes.error;
      if (utentiRes.error) throw utentiRes.error;
      if (fornitoriRes.error) throw fornitoriRes.error;

      setVoci(vociRes.data ?? []);
      setCategorie(categorieRes.data ?? []);
      setSubCategorie(subCategorieRes.data ?? []);
      setUtenti(utentiRes.data ?? []);
      setFornitori(fornitoriRes.data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const vociMap = Object.fromEntries(voci.map((v) => [v.id, v]));
  const categorieMap = Object.fromEntries(categorie.map((c) => [c.id, c]));

  const filteredCategorie =
    filterVoce === "all"
      ? categorie
      : categorie.filter((c) => c.voce_id === filterVoce);

  const categorieForSubFilter =
    filterVoce === "all"
      ? categorie
      : categorie.filter((c) => c.voce_id === filterVoce);

  let subCategorieDisplay = subCategorie;
  if (filterCategoria !== "all") {
    subCategorieDisplay = subCategorie.filter(
      (s) => s.categoria_id === filterCategoria
    );
  } else if (filterVoce !== "all") {
    subCategorieDisplay = subCategorie.filter(
      (s) => categorieMap[s.categoria_id]?.voce_id === filterVoce
    );
  }

  const getNextOrdine = (items: { ordine: number }[]) =>
    items.length === 0 ? 0 : Math.max(...items.map((i) => i.ordine)) + 1;

  const openAddDialog = (tab: TabKey) => {
    setDialogMode("add");
    setEditingId(null);
    setFormNome("");
    setFormVoceId(voci[0]?.id ?? "");
    setFormCategoriaId(categorie[0]?.id ?? "");
    setActiveTab(tab);
    setDialogOpen(true);
  };

  const openEditDialog = (
    tab: TabKey,
    item: { id: string; nome: string; voce_id?: string; categoria_id?: string }
  ) => {
    setDialogMode("edit");
    setEditingId(item.id);
    setFormNome(item.nome);
    const voceId = item.voce_id ?? (item.categoria_id ? categorieMap[item.categoria_id]?.voce_id : "");
    setFormVoceId(voceId ?? "");
    setFormCategoriaId(item.categoria_id ?? "");
    setActiveTab(tab);
    setDialogOpen(true);
  };

  const handleToggleAttivo = async (
    table: "voci" | "categorie" | "sub_categorie" | "utenti" | "fornitori",
    id: string,
    currentAttivo: boolean
  ) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ attivo: !currentAttivo, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success(currentAttivo ? "Disattivato" : "Riattivato");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleSoftDelete = async (
    table: "voci" | "categorie" | "sub_categorie" | "utenti" | "fornitori",
    id: string
  ) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ attivo: false, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Elemento disattivato");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Errore nella disattivazione");
    }
  };

  const handleReactivate = async (
    table: "voci" | "categorie" | "sub_categorie" | "utenti" | "fornitori",
    id: string
  ) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ attivo: true, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast.success("Elemento riattivato");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Errore nella riattivazione");
    }
  };

  const handleSubmit = async () => {
    const nome = formNome.trim();
    if (!nome) {
      toast.error("Il nome è obbligatorio");
      return;
    }

    setFormSubmitting(true);
    try {
      if (dialogMode === "add") {
        if (activeTab === "voci") {
          const { error } = await supabase.from("voci").insert({
            nome,
            attivo: true,
            ordine: getNextOrdine(voci),
          });
          if (error) throw error;
          toast.success("Voce creata");
        } else if (activeTab === "categorie") {
          if (!formVoceId) {
            toast.error("Seleziona una Voce");
            setFormSubmitting(false);
            return;
          }
          const { error } = await supabase.from("categorie").insert({
            nome,
            voce_id: formVoceId,
            attivo: true,
            ordine: getNextOrdine(categorie.filter((c) => c.voce_id === formVoceId)),
          });
          if (error) throw error;
          toast.success("Categoria creata");
        } else if (activeTab === "subcategorie") {
          if (!formCategoriaId) {
            toast.error("Seleziona una Categoria");
            setFormSubmitting(false);
            return;
          }
          const { error } = await supabase.from("sub_categorie").insert({
            nome,
            categoria_id: formCategoriaId,
            attivo: true,
            ordine: getNextOrdine(subCategorie.filter((s) => s.categoria_id === formCategoriaId)),
          });
          if (error) throw error;
          toast.success("Sub-categoria creata");
        } else if (activeTab === "utenti") {
          const { error } = await supabase.from("utenti").insert({
            nome,
            attivo: true,
            ordine: getNextOrdine(utenti),
          });
          if (error) throw error;
          toast.success("Utente creato");
        } else if (activeTab === "fornitori") {
          const { error } = await supabase.from("fornitori").insert({
            nome,
            attivo: true,
            ordine: getNextOrdine(fornitori),
          });
          if (error) throw error;
          toast.success("Fornitore creato");
        }
      } else {
        if (activeTab === "voci" && editingId) {
          const { error } = await supabase
            .from("voci")
            .update({ nome, updated_at: new Date().toISOString() })
            .eq("id", editingId);
          if (error) throw error;
          toast.success("Voce aggiornata");
        } else if (activeTab === "categorie" && editingId) {
          if (!formVoceId) {
            toast.error("Seleziona una Voce");
            setFormSubmitting(false);
            return;
          }
          const { error } = await supabase
            .from("categorie")
            .update({
              nome,
              voce_id: formVoceId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingId);
          if (error) throw error;
          toast.success("Categoria aggiornata");
        } else if (activeTab === "subcategorie" && editingId) {
          if (!formCategoriaId) {
            toast.error("Seleziona una Categoria");
            setFormSubmitting(false);
            return;
          }
          const { error } = await supabase
            .from("sub_categorie")
            .update({
              nome,
              categoria_id: formCategoriaId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingId);
          if (error) throw error;
          toast.success("Sub-categoria aggiornata");
        } else if (activeTab === "utenti" && editingId) {
          const { error } = await supabase
            .from("utenti")
            .update({ nome, updated_at: new Date().toISOString() })
            .eq("id", editingId);
          if (error) throw error;
          toast.success("Utente aggiornato");
        } else if (activeTab === "fornitori" && editingId) {
          const { error } = await supabase
            .from("fornitori")
            .update({ nome, updated_at: new Date().toISOString() })
            .eq("id", editingId);
          if (error) throw error;
          toast.success("Fornitore aggiornato");
        }
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Errore nel salvataggio");
    } finally {
      setFormSubmitting(false);
    }
  };

  const TableSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );

  const ActionsCell = ({
    item,
    table,
    onEdit,
  }: {
    item: { id: string; nome: string; attivo: boolean; voce_id?: string; categoria_id?: string };
    table: "voci" | "categorie" | "sub_categorie" | "utenti" | "fornitori";
    onEdit: () => void;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Azioni</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          Modifica
        </DropdownMenuItem>
        {item.attivo ? (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => handleSoftDelete(table, item.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Disattiva
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handleReactivate(table, item.id)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Riattiva
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configurazione
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestione voci, categorie, sub-categorie, utenti e fornitori
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="voci">Voci</TabsTrigger>
          <TabsTrigger value="categorie">Categorie</TabsTrigger>
          <TabsTrigger value="subcategorie">Sub-Categorie</TabsTrigger>
          <TabsTrigger value="utenti">Utenti</TabsTrigger>
          <TabsTrigger value="fornitori">Fornitori</TabsTrigger>
        </TabsList>

        <TabsContent value="voci" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div />
            <Button onClick={() => openAddDialog("voci")}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Voce
            </Button>
          </div>
          {loading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[120px]">Stato</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {voci.map((v) => (
                  <TableRow key={v.id} className={cn(!v.attivo && "opacity-60")}>
                    <TableCell className="font-medium">{v.nome}</TableCell>
                    <TableCell>
                      <Switch
                        checked={v.attivo}
                        onCheckedChange={() =>
                          handleToggleAttivo("voci", v.id, v.attivo)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <ActionsCell
                        item={v}
                        table="voci"
                        onEdit={() => openEditDialog("voci", v)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {voci.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nessuna voce. Aggiungine una per iniziare.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="categorie" className="mt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Filtra per Voce:</Label>
              <Select value={filterVoce} onValueChange={setFilterVoce}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tutte le voci" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le voci</SelectItem>
                  {voci.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openAddDialog("categorie")}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Categoria
            </Button>
          </div>
          {loading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Voce</TableHead>
                  <TableHead className="w-[120px]">Stato</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategorie.map((c) => (
                  <TableRow key={c.id} className={cn(!c.attivo && "opacity-60")}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {vociMap[c.voce_id]?.nome ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.attivo}
                        onCheckedChange={() =>
                          handleToggleAttivo("categorie", c.id, c.attivo)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <ActionsCell
                        item={c}
                        table="categorie"
                        onEdit={() => openEditDialog("categorie", c)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCategorie.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nessuna categoria in questa voce. Aggiungine una.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="subcategorie" className="mt-6">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Voce:</Label>
                <Select
                  value={filterVoce}
                  onValueChange={(v) => {
                    setFilterVoce(v);
                    setFilterCategoria("all");
                  }}
                >
                  <SelectTrigger className="w-[180px]">
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
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Categoria:</Label>
                <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tutte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte</SelectItem>
                    {categorieForSubFilter.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-fit"
              onClick={() => openAddDialog("subcategorie")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Sub-Categoria
            </Button>
          </div>
          {loading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Voce</TableHead>
                  <TableHead className="w-[120px]">Stato</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subCategorieDisplay.map((s) => {
                  const cat = categorieMap[s.categoria_id];
                  const voce = cat ? vociMap[cat.voce_id] : null;
                  return (
                    <TableRow key={s.id} className={cn(!s.attivo && "opacity-60")}>
                      <TableCell className="font-medium">{s.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cat?.nome ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{voce?.nome ?? "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={s.attivo}
                          onCheckedChange={() =>
                            handleToggleAttivo("sub_categorie", s.id, s.attivo)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <ActionsCell
                          item={s}
                          table="sub_categorie"
                          onEdit={() => openEditDialog("subcategorie", s)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {subCategorieDisplay.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nessuna sub-categoria. Modifica i filtri o aggiungine una.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="utenti" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div />
            <Button onClick={() => openAddDialog("utenti")}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Utente
            </Button>
          </div>
          {loading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[120px]">Stato</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {utenti.map((u) => (
                  <TableRow key={u.id} className={cn(!u.attivo && "opacity-60")}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>
                      <Switch
                        checked={u.attivo}
                        onCheckedChange={() =>
                          handleToggleAttivo("utenti", u.id, u.attivo)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <ActionsCell
                        item={u}
                        table="utenti"
                        onEdit={() => openEditDialog("utenti", u)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {utenti.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nessun utente. Aggiungine uno per iniziare.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="fornitori" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <div />
            <Button onClick={() => openAddDialog("fornitori")}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Fornitore
            </Button>
          </div>
          {loading ? (
            <TableSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[120px]">Stato</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornitori.map((f) => (
                  <TableRow key={f.id} className={cn(!f.attivo && "opacity-60")}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell>
                      <Switch
                        checked={f.attivo}
                        onCheckedChange={() =>
                          handleToggleAttivo("fornitori", f.id, f.attivo)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <ActionsCell
                        item={f}
                        table="fornitori"
                        onEdit={() => openEditDialog("fornitori", f)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {fornitori.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nessun fornitore. Aggiungine uno per iniziare.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "add"
                ? activeTab === "voci"
                  ? "Nuova Voce"
                  : activeTab === "categorie"
                    ? "Nuova Categoria"
                    : activeTab === "subcategorie"
                      ? "Nuova Sub-Categoria"
                      : activeTab === "fornitori"
                        ? "Nuovo Fornitore"
                        : "Nuovo Utente"
                : activeTab === "voci"
                  ? "Modifica Voce"
                  : activeTab === "categorie"
                    ? "Modifica Categoria"
                    : activeTab === "subcategorie"
                      ? "Modifica Sub-Categoria"
                      : activeTab === "fornitori"
                        ? "Modifica Fornitore"
                        : "Modifica Utente"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {(activeTab === "categorie" || activeTab === "subcategorie") && (
              <div className="grid gap-2">
                <Label htmlFor="voce">Voce</Label>
                <Select
                  value={formVoceId}
                  onValueChange={(v) => {
                    setFormVoceId(v);
                    if (activeTab === "subcategorie") {
                      const firstCat = categorie.find((c) => c.voce_id === v);
                      setFormCategoriaId(firstCat?.id ?? "");
                    }
                  }}
                >
                  <SelectTrigger>
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
            )}
            {activeTab === "subcategorie" && (
              <div className="grid gap-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select
                  value={formCategoriaId}
                  onValueChange={setFormCategoriaId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorie
                      .filter((c) => !formVoceId || c.voce_id === formVoceId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Nome"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button onClick={handleSubmit} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {dialogMode === "add" ? "Aggiungi" : "Salva"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
