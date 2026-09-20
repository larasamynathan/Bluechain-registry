import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Crown,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  ShieldCheck,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — BlueChain Registry" },
      {
        name: "description",
        content:
          "Sign in or create an account to manage blue carbon restoration projects and MRV data.",
      },
      { property: "og:title", content: "Sign In — BlueChain Registry" },
      {
        property: "og:description",
        content:
          "Sign in or create an account to manage blue carbon restoration projects and MRV data.",
      },
    ],
  }),
  component: AuthPage,
});

type RoleKey = "field_submitter" | "verifier" | "admin";

const ROLES: {
  key: RoleKey;
  label: string;
  icon: LucideIcon;
  subtitle: string;
  note?: string;
}[] = [
  {
    key: "field_submitter",
    label: "Field Submitter",
    icon: Leaf,
    subtitle: "Submit restoration project evidence from the field",
  },
  {
    key: "verifier",
    label: "Verifier",
    icon: ShieldCheck,
    subtitle: "Review and approve evidence submissions",
  },
  {
    key: "admin",
    label: "Admin",
    icon: Crown,
    subtitle: "Manage the registry and issue carbon credits",
    note: "Admin accounts require approval",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("signin");

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [role, setRole] = useState<RoleKey | null>(null);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const selectedRole = ROLES.find((r) => r.key === role) ?? null;

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function rejectIfPendingAdmin(userId: string) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const list = (roles ?? []).map((r) => r.role as string);
    if (list.includes("pending_admin") && !list.includes("admin")) {
      await supabase.auth.signOut();
      toast.error(
        "Your admin account is awaiting approval by an existing admin. You cannot sign in yet.",
      );
      return true;
    }
    return false;
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (data.user && (await rejectIfPendingAdmin(data.user.id))) {
      setLoading(false);
      return;
    }
    setLoading(false);
    navigate({ to: "/dashboard", replace: true });
  }


  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    if (signUpPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        data: { full_name: name, organization: org, requested_role: role },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (role === "admin") {
      await supabase.auth.signOut();
      setLoading(false);
      setTab("signin");
      toast.success(
        "Admin request submitted. You can sign in once an existing admin approves your account.",
      );
      return;
    }
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: signUpEmail,
        password: signUpPassword,
      });
      if (signInError) {
        setLoading(false);
        toast.error(signInError.message);
        return;
      }
    }
    // Never let an account through without a role assigned.
    const { data: userData } = await supabase.auth.getUser();
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user?.id ?? "");
    if (!roleRows || roleRows.length === 0) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error(
        "Your account was created but no role could be assigned. Please contact an administrator before signing in.",
      );
      setTab("signin");
      return;
    }
    setLoading(false);
    toast.success(`Account created as ${selectedRole?.label}.`);
    navigate({ to: "/dashboard", replace: true });
  }



  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background/40">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background/30 px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-3xl animate-rise-in">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-glow">
            <Waves className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold text-shimmer">
            BlueChain Registry
          </span>
        </Link>

        <Card className="glass-strong shadow-depth">
          <CardHeader>
            <CardTitle>Account access</CardTitle>
            <CardDescription>
              Transparent, verifiable blue carbon restoration tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5 max-w-md">
                <form className="space-y-4" onSubmit={handleSignIn}>
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                {!selectedRole ? (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h2 className="font-display text-xl font-semibold">
                        Choose your role to get started
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Step 1 of 2 — this determines what you can do in the registry.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {ROLES.map((r) => (
                        <div key={r.key} className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setRole(r.key)}
                            className={cn(
                              "group flex h-full w-full flex-col items-start gap-3 rounded-xl border-2 border-border bg-card p-5 text-left transition-all",
                              "hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            )}
                          >
                            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors group-hover:bg-primary/25">
                              <r.icon className="size-5" />
                            </span>
                            <span className="font-display text-base font-semibold">{r.label}</span>
                            <span className="text-sm text-muted-foreground">{r.subtitle}</span>
                          </button>
                          {r.note ? (
                            <p className="px-1 text-xs font-medium text-warning">{r.note}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setTab("signin")}
                      >
                        Sign in instead
                      </button>
                    </p>
                  </div>
                ) : (
                  <div className="max-w-md space-y-5">
                    <div className="flex items-start gap-3 rounded-xl border-2 border-primary bg-primary/10 p-4">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
                        <selectedRole.icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold">{selectedRole.label}</p>
                        <p className="text-xs text-muted-foreground">{selectedRole.subtitle}</p>
                        {selectedRole.note ? (
                          <p className="mt-1 text-xs font-medium text-warning">
                            {selectedRole.note}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <form className="space-y-4" onSubmit={handleSignUp}>
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full name</Label>
                        <Input
                          id="signup-name"
                          required
                          autoComplete="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-org">Organization</Label>
                        <Input
                          id="signup-org"
                          autoComplete="organization"
                          value={org}
                          onChange={(e) => setOrg(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          required
                          autoComplete="email"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={8}
                            autoComplete="new-password"
                            className="pr-10"
                            value={signUpPassword}
                            onChange={(e) => setSignUpPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm">Confirm password</Label>
                        <Input
                          id="signup-confirm"
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={8}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        Sign up as {selectedRole.label}
                      </Button>
                    </form>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => setRole(null)}
                      >
                        <ArrowLeft className="size-3.5" />
                        Change role
                      </button>
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setTab("signin")}
                      >
                        Sign in instead
                      </button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Just browsing?{" "}
          <Link to="/registry" className="text-primary hover:underline">
            View the public registry
          </Link>
        </p>
      </div>
    </div>
  );
}
