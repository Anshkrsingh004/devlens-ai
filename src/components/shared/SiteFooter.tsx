import { Container } from "@/components/shared/Container";
import { siteConfig } from "@/config/site";

/**
 * Global site footer.
 *
 * Deliberately minimal. It exists now so AppShell has a complete three-part
 * structure and pages do not shift when footer content is added later.
 */
export function SiteFooter() {
  return (
    <footer className="border-t py-6">
      <Container>
        <p className="text-muted-foreground text-center text-sm text-balance">
          {siteConfig.name} — {siteConfig.tagline}
        </p>
      </Container>
    </footer>
  );
}
