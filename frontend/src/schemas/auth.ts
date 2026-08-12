import { z } from "zod";

/**
 * NEW vs. CRA version: the Phase 1 login page did its own manual
 * `required` checks via MUI's `required` prop with no real validation
 * message logic. React Hook Form + Zod replaces that with a typed
 * schema — validation rules and error messages live in one place, and
 * `loginSchema` doubles as the compile-time type for the form via
 * `z.infer`.
 */
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
