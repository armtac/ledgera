"use client";

import {
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { toast } from "sonner";
import { FileUp, Loader2, Trash2, FileText, Image } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Documento } from "@/lib/supabase/types";
import { useUserStore } from "@/store/user-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentUploadProps {
  spesaId: string | null;
  existingDocuments?: Documento[];
  onDocumentsChange?: (docs: Documento[]) => void;
}

export type DocumentUploadRef = {
  uploadPendingFiles: (spesaId: string) => Promise<void>;
};

export const DocumentUpload = forwardRef<
  DocumentUploadRef,
  DocumentUploadProps
>(function DocumentUpload(
  { spesaId, existingDocuments = [], onDocumentsChange },
  ref
) {
  const { currentUser } = useUserStore();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Documento[]>(existingDocuments);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const supabase = createClient();
  const documentsRef = useRef(documents);
  documentsRef.current = documents;
  const pendingFilesRef = useRef(pendingFiles);
  pendingFilesRef.current = pendingFiles;

  const updateDocs = useCallback(
    (newDocs: Documento[]) => {
      setDocuments(newDocs);
      onDocumentsChange?.(newDocs);
    },
    [onDocumentsChange]
  );

  const addPendingFiles = useCallback((files: File[]) => {
    const valid: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Il file ${file.name} supera il limite di 10MB.`);
        continue;
      }
      valid.push(file);
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  }, []);

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  useImperativeHandle(ref, () => ({
    async uploadPendingFiles(targetSpesaId: string) {
      const files = [...pendingFilesRef.current];
      if (files.length === 0) return;
      setPendingFiles([]);
      setUploading(true);
      try {
        for (const file of files) {
          const ext = file.name.split(".").pop() ?? "bin";
          const storagePath = `${targetSpesaId}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("documenti")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
            });
          if (uploadError) throw uploadError;
          const { data: docData, error: insertError } = await supabase
            .from("documenti")
            .insert({
              spesa_id: targetSpesaId,
              nome_file: file.name,
              storage_path: storagePath,
              mime_type: file.type || `application/${ext}`,
              dimensione_bytes: file.size,
              caricato_da: currentUser,
            })
            .select()
            .single();
          if (insertError || !docData) throw insertError;
          updateDocs([...documentsRef.current, docData as Documento]);
        }
        toast.success(
          files.length === 1
            ? "Documento allegato."
            : `${files.length} documenti allegati.`
        );
      } catch (err) {
        console.error(err);
        toast.error("Errore nel caricamento di uno o più documenti.");
        setPendingFiles((prev) => [...prev, ...files]);
      } finally {
        setUploading(false);
      }
    },
  }), [pendingFilesRef, supabase, currentUser, updateDocs]);

  const uploadFile = async (file: File) => {
    if (!spesaId) {
      addPendingFiles([file]);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Il file ${file.name} supera il limite di 10MB.`);
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const storagePath = `${spesaId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documenti")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: docData, error: insertError } = await supabase
        .from("documenti")
        .insert({
          spesa_id: spesaId,
          nome_file: file.name,
          storage_path: storagePath,
          mime_type: file.type || `application/${ext}`,
          dimensione_bytes: file.size,
          caricato_da: currentUser,
        })
        .select()
        .single();

      if (insertError || !docData) throw insertError;

      updateDocs([...documentsRef.current, docData as Documento]);
      toast.success(`${file.name} caricato con successo.`);
    } catch (err) {
      console.error(err);
      toast.error(`Errore nel caricamento di ${file.name}.`);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    if (spesaId) {
      Array.from(files).forEach(uploadFile);
    } else {
      addPendingFiles(Array.from(files));
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (spesaId) {
      Array.from(files).forEach(uploadFile);
    } else {
      addPendingFiles(Array.from(files));
    }
  };

  const handleDelete = async (doc: Documento) => {
    if (!confirm(`Eliminare ${doc.nome_file}?`)) return;

    try {
      await supabase.storage.from("documenti").remove([doc.storage_path]);
      const { error } = await supabase
        .from("documenti")
        .delete()
        .eq("id", doc.id);
      if (error) throw error;

      updateDocs(documents.filter((d) => d.id !== doc.id));
      toast.success("Documento eliminato.");
    } catch (err) {
      console.error(err);
      toast.error("Errore durante l'eliminazione.");
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.startsWith("image/")) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Documenti allegati</h3>

      {/* Drop zone: sempre attiva; in creazione i file vanno in coda e si caricano al salvataggio */}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : (
          <>
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {spesaId
                ? "Trascina qui i file o clicca per selezionare"
                : "Trascina qui i file o clicca per selezionare (verranno allegati al salvataggio)"}
            </p>
            <label className="mt-2 cursor-pointer">
              <span className="text-sm font-medium text-primary hover:underline">
                Sfoglia file
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
              />
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, immagini, documenti. Max 10MB per file.
            </p>
          </>
        )}
      </div>

      {/* File in coda (creazione, prima del salvataggio) */}
      {pendingFiles.length > 0 && (
        <ul className="space-y-2">
          <p className="text-xs text-muted-foreground">
            In coda per l&apos;allegato al salvataggio:
          </p>
          {pendingFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-dashed p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.size < 1024
                      ? `${file.size} B`
                      : file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removePendingFile(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Document list (già caricati) */}
      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(doc.mime_type)}
                <div>
                  <p className="text-sm font-medium">{doc.nome_file}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.dimensione_bytes)} &middot;{" "}
                    {doc.caricato_da}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(doc)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
