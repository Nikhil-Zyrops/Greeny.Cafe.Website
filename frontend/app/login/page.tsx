"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError("Please fill in all fields.");
      return;
    }

    try {
      await login(email, password);
      // Retrieve role from localStorage or auth state
      const user = useAuthStore.getState().user;
      if (user) {
        if (user.role === "super_admin") router.push("/super-admin");
        else if (user.role === "admin") router.push("/admin");
        else if (user.role === "staff") router.push("/staff");
        else router.push("/customer");
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12 transition-colors">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center text-4xl mb-2">🌿</div>
          <CardTitle className="text-2xl font-bold tracking-tight text-primary font-display">
            Greeny Cafe POS
          </CardTitle>
          <CardDescription className="text-text-3">
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold text-text-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="email@greeny.cafe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border text-sm p-3 rounded-lg focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-semibold text-text-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-border text-sm p-3 rounded-lg focus-visible:ring-primary"
              />
            </div>
            {formError && (
              <p className="text-xs font-medium text-destructive text-center mt-2">
                {formError}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full p-3 rounded-lg font-bold bg-primary hover:bg-primary/95 text-white transition-all shadow-md"
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col text-center text-xs text-text-3 border-t border-border pt-4">
          <p>Demo Accounts:</p>
          <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px] text-text-2">
            <div>Admin: admin@greeny.cafe</div>
            <div>Manager: manager@greeny.cafe</div>
            <div>Staff: staff1@greeny.cafe</div>
            <div>Password: password</div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
