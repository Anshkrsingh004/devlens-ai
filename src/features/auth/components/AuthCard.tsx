import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footerPrompt: string;
  footerLinkLabel: string;
  footerLinkHref: string;
}

/**
 * Shared shell for the sign-in and sign-up forms.
 *
 * Exists so both pages share one layout, heading hierarchy and footer
 * treatment — and so a future password-reset screen inherits them for free
 * rather than reinventing a third variant.
 */
export function AuthCard({
  title,
  description,
  children,
  footerPrompt,
  footerLinkLabel,
  footerLinkHref,
}: AuthCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-muted-foreground text-sm text-pretty">
          {description}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {children}

        <p className="text-muted-foreground text-center text-sm">
          {footerPrompt}{" "}
          <Link
            href={footerLinkHref}
            className="text-foreground font-medium underline underline-offset-4"
          >
            {footerLinkLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
