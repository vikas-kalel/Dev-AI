import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authService } from "../../services/authService.js";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!email || !token) {
      setStatus("error");
      setErrorMessage("Verification link is missing email or token.");
      return;
    }

    authService
      .verifyEmail(email, token)
      .then(() => {
        setStatus("success");
      })
      .catch((err: any) => {
        setStatus("error");
        setErrorMessage(
          err.message || "Email verification failed or token expired.",
        );
      });
  }, [email, token]);

  return (
    <div className="text-center py-4 select-none">
      {status === "verifying" && (
        <div>
          <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-900 flex items-center justify-center mx-auto mb-3 animate-spin">
            <span className="material-symbols-outlined text-[20px]">
              refresh
            </span>
          </div>
          <h3 className="text-sm font-semibold text-zinc-950">
            Verifying your email...
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Please wait while we confirm your account.
          </p>
        </div>
      )}

      {status === "success" && (
        <div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[24px]">
              check_circle
            </span>
          </div>
          <h3 className="text-base font-bold text-zinc-950">Email verified!</h3>
          <p className="text-xs text-zinc-600 mt-2 mb-6">
            Your email has been confirmed. You can now access your projects in
            DevAI.
          </p>
          <Link
            to="/login"
            className="inline-block py-2.5 px-6 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all shadow-xs"
          >
            Continue to Sign in &rarr;
          </Link>
        </div>
      )}

      {status === "error" && (
        <div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[24px]">error</span>
          </div>
          <h3 className="text-base font-bold text-zinc-950">
            Verification failed
          </h3>
          <p className="text-xs text-rose-700 mt-2 mb-6">{errorMessage}</p>
          <Link
            to="/login"
            className="inline-block py-2.5 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl text-xs font-medium transition-all"
          >
            Back to Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
