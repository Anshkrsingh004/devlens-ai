"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { signIn } from "../lib/auth-client";

/**
 * Google OAuth sign-in.
 *
 * Shared by both auth pages — Google does not distinguish sign-up from
 * sign-in, so one component serves both.
 *
 * The loading state is never cleared on success: the browser navigates away
 * to Google, and re-enabling the button would only let an impatient user fire
 * a second redirect during that window.
 */
export function GoogleButton({ label = "Continue with Google" }) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleClick() {
    setIsRedirecting(true);

    const { error } = await signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });

    if (error) {
      setIsRedirecting(false);
      toast.error("Could not start Google sign-in", {
        description: error.message ?? "Please try again.",
      });
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={isRedirecting}
    >
      {/* Inline SVG rather than a remote image: Google's brand assets are
          served from a CDN, and an external request here would be a
          third-party dependency on the auth path. */}
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.71v2.98A11.5 11.5 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.55 14.67a6.9 6.9 0 0 1 0-4.41V7.28H1.71a11.5 11.5 0 0 0 0 10.37l3.84-2.98z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.2 15.1 0 12 0 7.52 0 3.64 2.57 1.71 6.31l3.84 2.98C6.46 6.57 9 4.75 12 4.75z"
        />
      </svg>
      {isRedirecting ? "Redirecting…" : label}
    </Button>
  );
}
