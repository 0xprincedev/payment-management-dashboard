"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import {
  CssVarsProvider,
  useColorScheme,
} from "../../node_modules/@mui/material/styles/ThemeProviderWithVars";
import theme from "@/theme";

export function useAppColorScheme() {
  return useColorScheme();
}

export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppRouterCacheProvider>
      <CssVarsProvider
        theme={theme as unknown as { colorSchemes: Record<string, unknown> }}
        defaultMode="light"
        disableTransitionOnChange
      >
        <CssBaseline />
        {children}
      </CssVarsProvider>
    </AppRouterCacheProvider>
  );
}
