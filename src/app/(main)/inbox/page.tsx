"use client";

import { useState } from "react";

import { ConversationList } from "@/components/chat/ConversationList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useLocale } from "@/context/locale-context";

export default function InboxPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const { t } = useLocale();

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold">{t("chat.inboxTitle")}</h1>
      <p className="mt-2 text-foreground/65">{t("chat.inboxSubtitle")}</p>

      <div className="mt-6 flex h-[70vh] flex-col gap-4 rounded-2xl bg-white shadow-soft md:flex-row">
        <ConversationList onSelect={(id) => setSelected(id)} />
        <div className="flex-1 p-4">
          {selected ? (
            <ChatWindow conversationId={selected} />
          ) : (
            <div className="flex h-full items-center justify-center text-foreground/60">
              {t("chat.selectConversationPrompt")}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
