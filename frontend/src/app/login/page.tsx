"use client";

import React from "react";
import { Box, TextField, Typography, Button, Alert } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import ConsolePanel from "../../components/common/ConsolePanel";
import { palette } from "../../theme/theme";
import { useAuth } from "../../hooks/useAuth";
import { loginSchema, LoginFormValues } from "../../schemas/auth";

/**
 * CHANGED FROM CRA in three ways:
 *
 * 1. Form handling: manual `useState` + `onSubmit` validation is
 *    replaced by React Hook Form's `useForm` + Zod's `loginSchema`
 *    (via `zodResolver`). Field-level errors now come from RHF's
 *    `formState.errors`, typed from the schema — no more hand-written
 *    `required` checks.
 * 2. Navigation: react-router's `useNavigate()` is replaced by
 *    next/navigation's `useRouter()` — same idea (`navigate(path)` ->
 *    `router.push(path)`), different import.
 * 3. This page must stay a Client Component: forms need interactivity
 *    (onChange, onSubmit, local state), so "use client" is required.
 */
export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const user = await login(values.email, values.password);
      router.push(user.role === "admin" ? "/admin" : "/faculty");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Check your credentials.";
      setServerError(message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: palette.bg,
        px: 2,
      }}
    >
      <ConsolePanel sx={{ width: 420, maxWidth: "100%" }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ color: palette.text, fontWeight: 700 }}>
            SmartSched AI
          </Typography>
          <Typography variant="caption" sx={{ color: palette.textDim, letterSpacing: 0.5 }}>
            Intelligent Academic Timetable Management System
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {serverError}
            </Alert>
          )}

          <Typography variant="caption" sx={{ color: palette.textDim }}>
            Email
          </Typography>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                placeholder="professor@college.edu"
                sx={{ mb: errors.email ? 0.5 : 2, mt: 0.5 }}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />
          {errors.email && <Box sx={{ height: 8 }} />}

          <Typography variant="caption" sx={{ color: palette.textDim }}>
            Password
          </Typography>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                type="password"
                sx={{ mb: errors.password ? 0.5 : 3, mt: 0.5 }}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )}
          />
          {errors.password && <Box sx={{ height: 16 }} />}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={isLoggingIn}
            sx={{ py: 1 }}
          >
            {isLoggingIn ? "Signing in..." : "[ Login ]"}
          </Button>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 2,
              color: palette.textDim,
              cursor: "pointer",
            }}
          >
            [ Forgot Password ]
          </Typography>

          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", mt: 1.5, color: palette.accentDim }}
          >
            demo: admin@college.edu / Admin@123 · jsmith@college.edu / Faculty@123
          </Typography>
        </Box>
      </ConsolePanel>
    </Box>
  );
}
