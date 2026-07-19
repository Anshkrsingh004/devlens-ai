import type { ReactNode } from "react";

import { AppChrome } from "@/app/_components/AppChrome";
import { Container } from "@/components/shared/Container";

/**
 * Layout for unauthenticated auth pages: a centred card inside the normal
 * site chrome, so signing in does not feel like leaving the product.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome>
      <Container className="flex min-h-[70vh] items-center justify-center py-12">
        {children}
      </Container>
    </AppChrome>
  );
}
