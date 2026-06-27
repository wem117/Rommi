"use client";

import React from "react";
import { LocaleProvider } from "@/context/locale-context"; // Adjust matching your exact filename case
import { AuthProvider } from "@/context/AuthContext"; // Replace with your auth filename

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </LocaleProvider>
  );
}