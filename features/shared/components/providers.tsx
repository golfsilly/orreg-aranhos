"use client";

import { QueryClient } from "@tanstack/query-core";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";

function Notifications() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      richColors
      closeButton
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Separate query clients prevent sharing patient data between SSR requests.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            gcTime: 0,
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={client}>
        {children}
        <Notifications />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
