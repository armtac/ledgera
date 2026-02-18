"use client";

import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Utente } from "@/lib/supabase/types";
import { useUserStore } from "@/store/user-store";
import { ChevronDown, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const { currentUser, setCurrentUser } = useUserStore();
  const [users, setUsers] = useState<Utente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("utenti")
      .select("id, nome")
      .eq("attivo", true)
      .order("ordine", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setUsers(data as Utente[]);
        }
        setLoading(false);
      });
  }, [setCurrentUser]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      <h1 className="text-lg font-semibold text-foreground">Ledgera</h1>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <User className="h-4 w-4" />
            <span className="max-w-[120px] truncate sm:max-w-[180px]">
              {loading ? "Caricamento..." : currentUser ?? "Utente"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {users.map((user) => (
            <DropdownMenuItem
              key={user.id}
              onClick={() => setCurrentUser(user.nome)}
              className={cn(
                currentUser === user.nome && "bg-accent font-medium"
              )}
            >
              {user.nome}
            </DropdownMenuItem>
          ))}
          {users.length === 0 && !loading && (
            <DropdownMenuItem disabled>Nessun utente</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
