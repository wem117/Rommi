"use client";

import { useRef, useState } from "react";
import { Send, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { useLocale } from "@/context/locale-context";

export function MessageInput({ onSend }: { onSend: (payload: { text?: string; imageFile?: File }) => Promise<void> }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLocale();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() && !file) return;
    try {
      await onSend({ text: text.trim() || undefined, imageFile: file });
      setText("");
      setFile(undefined);
    } catch (err) {
      console.error(err);
      toast.error(t("chat.sendFailed"));
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
      <div className="flex items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-foreground/70 hover:bg-background">
          <ImageIcon className="h-4 w-4" />
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0])} />
        </label>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("chat.writeMessagePlaceholder")} className="w-full rounded-md border border-border px-3 py-2" />
      </div>
      <button type="submit" aria-label={t("chat.sendLabel")} className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-white">
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}

export default MessageInput;
