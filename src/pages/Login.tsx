import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { signIn } = useAuth();

  useEffect(() => {
    signIn();
  }, [signIn]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050505", color: "#e8eaf0" }}>
      <p>Redirecting to secure login...</p>
    </div>
  );
}
