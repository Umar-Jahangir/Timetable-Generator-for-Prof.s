import React, { useState } from "react";
import { Box, TextField, Typography, Button, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ConsolePanel from "../../components/common/ConsolePanel";
import { palette } from "../../theme/theme";
import { useAuth } from "../../hooks/useAuth";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin" : "/faculty");
    } catch (err: any) {
      setError(err?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
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

        <Box component="form" onSubmit={handleSubmit} noValidate>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="caption" sx={{ color: palette.textDim }}>
            Email
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="professor@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2, mt: 0.5 }}
            required
          />

          <Typography variant="caption" sx={{ color: palette.textDim }}>
            Password
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3, mt: 0.5 }}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ py: 1 }}
          >
            {loading ? "Signing in..." : "[ Login ]"}
          </Button>

          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", mt: 2, color: palette.textDim, cursor: "pointer" }}
          >
            [ Forgot Password ]
          </Typography>

          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", mt: 1.5, color: palette.accentDim }}
          >
            demo: use an email containing "admin" for the Admin console
          </Typography>
        </Box>
      </ConsolePanel>
    </Box>
  );
};

export default Login;
