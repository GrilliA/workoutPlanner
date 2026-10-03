import { Redirect } from "wouter";
import { useAuth } from "@auth";
import { BrandLogo } from "@components/brandLogo";
import "@auth/authpage.css";

export default function RootPage() {
  const { status } = useAuth();

  if (status === "authenticated") {
    return <Redirect to="/dashboard" replace />;
  }

  if (status === "anonymous" || status === "error") {
    return <Redirect to="/login" replace />;
  }

  return (
    <main aria-busy="true" aria-live="polite" className="auth-page">
      <div className="auth-brand">
        <BrandLogo size="md" layout="stack" />
      </div>
    </main>
  );
}
