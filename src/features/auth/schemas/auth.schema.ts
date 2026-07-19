import { z } from "zod";

/**
 * Authentication input schemas.
 *
 * Shared between the forms and the server so both validate against literally
 * the same rules. Validation drift between client and server is a classic bug
 * class — a password the form accepts but the API rejects, or worse, the
 * reverse.
 *
 * These mirror the constraints configured in server/auth/auth.ts.
 */

const email = z
  .email("Enter a valid email address")
  .max(255, "Email is too long")
  // Stored lowercase so "Ansh@x.com" and "ansh@x.com" cannot become two
  // separate accounts.
  .transform((value) => value.trim().toLowerCase());

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const name = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name must be 60 characters or fewer");

export const signUpSchema = z.object({
  name,
  email,
  password,
});

export const signInSchema = z.object({
  email,
  // Deliberately not the full `password` rules. Applying them here would
  // reject a legitimate existing password if the policy ever tightens, and
  // would leak the policy to anyone probing the sign-in form.
  password: z.string().min(1, "Enter your password"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
