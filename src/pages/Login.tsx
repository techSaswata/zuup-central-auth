import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { signIn } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#050505", color: "#e8eaf0", gap: "20px" }}>
      <p>Secure login powered by Zuup Auth.</p>
      <Button onClick={() => signIn()} className="zuup-gradient" size="lg">
        Sign In with Zuup
      </Button>
    </div>
  );
}
