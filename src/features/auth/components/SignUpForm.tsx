"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signUp } from "../lib/auth-client";
import { signUpSchema, type SignUpInput } from "../schemas/auth.schema";
import { AuthDivider } from "./AuthDivider";
import { GoogleButton } from "./GoogleButton";

export function SignUpForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpInput) {
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: "/dashboard",
    });

    if (error) {
      // Attach a duplicate-email failure to the field it concerns, rather
      // than a detached toast the user has to map back to an input.
      if (error.status === 422 || /exist/i.test(error.message ?? "")) {
        setError("email", {
          message: "An account with this email already exists.",
        });
        return;
      }

      toast.error("Could not create your account", {
        description: error.message ?? "Please try again.",
      });
      return;
    }

    // `refresh` re-runs the server components so the layout picks up the new
    // session; without it the dashboard can render its signed-out state.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <GoogleButton label="Sign up with Google" />

      <AuthDivider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          {errors.name ? (
            <p
              id="name-error"
              role="alert"
              className="text-destructive text-sm"
            >
              {errors.name.message}
            </p>
          ) : null}
        </div>

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
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "password-error" : "password-hint"
            }
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
          ) : (
            <p id="password-hint" className="text-muted-foreground text-sm">
              At least 8 characters, with a letter and a number.
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
