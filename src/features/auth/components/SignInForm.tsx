"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signIn } from "../lib/auth-client";
import { signInSchema, type SignInInput } from "../schemas/auth.schema";
import { AuthDivider } from "./AuthDivider";
import { GoogleButton } from "./GoogleButton";

export function SignInForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: "/dashboard",
    });

    if (error) {
      // One generic message for every credential failure. Saying "no account
      // with that email" would let anyone enumerate which addresses are
      // registered.
      setError("root", {
        message: "Incorrect email or password.",
      });
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <GoogleButton label="Sign in with Google" />

      <AuthDivider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errors.root ? (
          <div
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {errors.root.message}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email ? (
            <p
              id="email-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password ? (
            <p
              id="password-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
