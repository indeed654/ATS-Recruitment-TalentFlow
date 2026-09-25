import { startGoogleLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const [mode, setMode] = useState<"staff" | "candidate">("staff");
  return mode === "staff" ? <StaffLogin onCandidate={() => setMode("candidate")} /> : <CandidateLogin onStaff={() => setMode("staff")} />;
}

function StaffLogin({ onCandidate }: { onCandidate: () => void }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = trpc.auth.staffLogin.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); navigate("/"); } });
  const reset = trpc.auth.requestPasswordReset.useMutation();
  return <AuthShell eyebrow="TalentFlow ATS" title="Welcome back" description="Sign in with your work email to continue to your hiring workspace.">
    <form className="auth-form" onSubmit={event => { event.preventDefault(); login.mutate({ email, password }); }}>
      <label className="form-field"><span><Mail size={13} /> Work email</span><input type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="form-field"><span><LockKeyhole size={13} /> Password</span><input type="password" required minLength={8} autoComplete="current-password" placeholder="Your password" value={password} onChange={event => setPassword(event.target.value)} /></label>
      <div className="auth-form-row"><button type="button" className="auth-link" onClick={() => { if (email) reset.mutate({ email }); }}>Forgot password?</button><span>{reset.isSuccess ? "If the account exists, reset instructions were prepared." : ""}</span></div>
      {login.error && <div className="auth-error">Unable to sign in with those credentials.</div>}
      <button className="button button-primary auth-submit" disabled={login.isPending}>{login.isPending ? "Signing in…" : "Sign in"}<ArrowRight size={15} /></button>
    </form>
    <div className="auth-divider"><span>or</span></div>
    <button className="button button-secondary auth-submit" onClick={onCandidate}><Sparkles size={15} /> Candidate sign in with Google</button>
    <p className="auth-footnote"><ShieldCheck size={14} /> Staff access is restricted by role and work email.</p>
  </AuthShell>;
}

function CandidateLogin({ onStaff }: { onStaff: () => void }) {
  return <AuthShell eyebrow="Candidate portal" title="Your next opportunity starts here" description="Use your Google account to manage your profile, applications, and interviews.">
    <div className="candidate-login-card"><div className="candidate-login-icon"><BriefcaseBusiness size={20} /></div><div><strong>Candidate access</strong><p>Google login is restricted to candidate accounts. Internal staff must use work email.</p></div></div>
    <button className="button button-primary auth-submit google-button" onClick={startGoogleLogin}>Continue with Google <ArrowRight size={15} /></button>
    <button className="auth-switch" onClick={onStaff}>Back to staff sign in</button>
  </AuthShell>;
}

function AuthShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="auth-page"><div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" /><section className="auth-brand-panel"><div className="brand-row auth-brand-row"><div className="brand-mark"><span className="brand-mark-inner" /></div><span className="brand-name">TalentFlow</span><span className="brand-beta">ATS</span></div><div className="auth-brand-copy"><span className="eyebrow"><span className="eyebrow-line" />Calm hiring operations</span><h2>Make every candidate conversation count.</h2><p>One clear workspace for your team to move from first application to great hire.</p><div className="auth-proof"><CheckCircle2 size={16} /> Role-aware access, secure sessions, and a focused recruiting workflow.</div></div></section><section className="auth-card"><div className="auth-card-heading"><span className="eyebrow"><span className="eyebrow-line" />{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{children}<p className="auth-legal">By continuing, you agree to use TalentFlow for authorized recruiting activity.</p></section></main>;
}
