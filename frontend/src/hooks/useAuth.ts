import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/authService.js";
import { useUIStore } from "../stores/useUIStore.js";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.getMe(),
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      showToast(`Welcome back, ${data.user.name}!`, "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to log in.", "error");
    },
  });
}

export function useSignup() {
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => authService.signup(name, email, password),
    onSuccess: () => {
      showToast(
        "Account created successfully! Please verify your email.",
        "success",
      );
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to create account.", "error");
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const { showToast } = useUIStore();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      qc.clear();
      showToast("Logged out successfully.", "info");
    },
  });
}
