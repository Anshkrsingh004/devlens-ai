/**
 * "or" separator between the OAuth button and the email form.
 *
 * `aria-hidden` because it is purely decorative — a screen reader announcing
 * a stray "or" between two labelled regions is noise, not information.
 */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-xs uppercase">or</span>
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
