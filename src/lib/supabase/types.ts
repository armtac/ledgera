export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      utenti: {
        Row: {
          id: string;
          nome: string;
          attivo: boolean;
          ordine: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          attivo?: boolean;
          ordine?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          attivo?: boolean;
          ordine?: number;
          updated_at?: string;
        };
      };
      voci: {
        Row: {
          id: string;
          nome: string;
          attivo: boolean;
          ordine: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          attivo?: boolean;
          ordine?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          attivo?: boolean;
          ordine?: number;
          updated_at?: string;
        };
      };
      categorie: {
        Row: {
          id: string;
          voce_id: string;
          nome: string;
          attivo: boolean;
          ordine: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          voce_id: string;
          nome: string;
          attivo?: boolean;
          ordine?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          voce_id?: string;
          nome?: string;
          attivo?: boolean;
          ordine?: number;
          updated_at?: string;
        };
      };
      sub_categorie: {
        Row: {
          id: string;
          categoria_id: string;
          nome: string;
          attivo: boolean;
          ordine: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          categoria_id: string;
          nome: string;
          attivo?: boolean;
          ordine?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          categoria_id?: string;
          nome?: string;
          attivo?: boolean;
          ordine?: number;
          updated_at?: string;
        };
      };
      fornitori: {
        Row: {
          id: string;
          nome: string;
          attivo: boolean;
          ordine: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          attivo?: boolean;
          ordine?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          attivo?: boolean;
          ordine?: number;
          updated_at?: string;
        };
      };
      spese: {
        Row: {
          id: string;
          anno_df: number;
          mese_df: number;
          fattura_num: string | null;
          riferimento: string | null;
          importo_totale: number;
          descrizione: string | null;
          note: string | null;
          inserito_da: string;
          fonte: "manuale" | "ai_agent" | "telegram";
          tipo: "ACT" | "BUDGET";
          fornitore_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          anno_df: number;
          mese_df: number;
          fattura_num?: string | null;
          riferimento?: string | null;
          importo_totale: number;
          descrizione?: string | null;
          note?: string | null;
          inserito_da: string;
          fonte?: "manuale" | "ai_agent" | "telegram";
          tipo?: "ACT" | "BUDGET";
          fornitore_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          anno_df?: number;
          mese_df?: number;
          fattura_num?: string | null;
          riferimento?: string | null;
          importo_totale?: number;
          descrizione?: string | null;
          note?: string | null;
          inserito_da?: string;
          fonte?: "manuale" | "ai_agent" | "telegram";
          tipo?: "ACT" | "BUDGET";
          fornitore_id?: string | null;
          updated_at?: string;
        };
      };
      righe_spesa: {
        Row: {
          id: string;
          spesa_id: string;
          voce_id: string;
          categoria_id: string;
          sub_categoria_id: string | null;
          anno_rif: number;
          mese_rif: number;
          importo: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          spesa_id: string;
          voce_id: string;
          categoria_id: string;
          sub_categoria_id?: string | null;
          anno_rif: number;
          mese_rif: number;
          importo: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          spesa_id?: string;
          voce_id?: string;
          categoria_id?: string;
          sub_categoria_id?: string | null;
          anno_rif?: number;
          mese_rif?: number;
          importo?: number;
        };
      };
      documenti: {
        Row: {
          id: string;
          spesa_id: string;
          nome_file: string;
          storage_path: string;
          mime_type: string | null;
          dimensione_bytes: number | null;
          caricato_da: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          spesa_id: string;
          nome_file: string;
          storage_path: string;
          mime_type?: string | null;
          dimensione_bytes?: number | null;
          caricato_da: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          spesa_id?: string;
          nome_file?: string;
          storage_path?: string;
          mime_type?: string | null;
          dimensione_bytes?: number | null;
          caricato_da?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Utente = Database["public"]["Tables"]["utenti"]["Row"];
export type Voce = Database["public"]["Tables"]["voci"]["Row"];
export type Categoria = Database["public"]["Tables"]["categorie"]["Row"];
export type SubCategoria = Database["public"]["Tables"]["sub_categorie"]["Row"];
export type Fornitore = Database["public"]["Tables"]["fornitori"]["Row"];
export type Spesa = Database["public"]["Tables"]["spese"]["Row"];
export type RigaSpesa = Database["public"]["Tables"]["righe_spesa"]["Row"];
export type Documento = Database["public"]["Tables"]["documenti"]["Row"];

export type SpesaConRighe = Spesa & {
  righe_spesa: (RigaSpesa & {
    voci: Voce;
    categorie: Categoria;
    sub_categorie: SubCategoria | null;
  })[];
  documenti: Documento[];
};
