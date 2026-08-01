"use client";

import type { ReactNode } from "react";

import { PasswordRecoveryRedirect } from "@/components/auth/password-recovery-redirect";
import { AuthProvider } from "@/context/auth-context";
import { LocaleProvider } from "@/context/locale-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        {/* Mounted app-wide: a recovery link can land on ANY route, because
            GoTrue falls back to SITE_URL when redirect_to isn't allow-listed. */}
        <PasswordRecoveryRedirect />
        {children}
      </AuthProvider>
    </LocaleProvider>
  );
}
