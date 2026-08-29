import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@auth";
import { BrandLogo } from "@components/brandLogo";
import "@auth/authpage.css";

export default function RootPage() {
  const { status } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (status === "authenticated") {
      setLocation("/dashboard", { replace: true });
      return;
    }

    if (status === "anonymous" || status === "error") {
      setLocation("/login", { replace: true });
    }
  }, [status, setLocation]);

  return (
    <main aria-busy="true" aria-live="polite" className="auth-page">
      <div className="auth-brand">
        <BrandLogo size="md" layout="stack" />
      </div>
    </main>
  );
}
