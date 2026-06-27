"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/context/auth-context";
import { LocaleProvider } from "@/context/locale-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>{children}</AuthProvider>
    </LocaleProvider>
  );
}
