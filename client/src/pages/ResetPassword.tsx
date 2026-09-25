import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";

export default function ResetPassword() {
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") || "", []);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const reset = trpc.auth.resetPassword.useMutation();
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) return;
    reset.mutate({ token, password }, { onSuccess: () => setTimeout(() => { window.location.href = "/"; }, 1200) });
  };
  return <main className="auth-page reset-page"><section className="auth-brand-panel"><div className="brand-row auth-brand-row"><div className="brand-mark"><span className="brand-mark-inner" /></div><span className="brand-name">TalentFlow</span><span className="brand-beta">ATS</span></div><div className="auth-brand-copy"><span className="eyebrow"><span className="eyebrow-line" />Account security</span><h2>Back to better hiring, securely.</h2><p>Use a unique password you do not reuse on other services.</p></div></section><section className="auth-card"><div className="auth-card-heading"><span className="eyebrow"><span className="eyebrow-line" />Password reset</span><h1>Choose a new password</h1><p>Your reset link is one-time and expires automatically.</p></div>{!token ? <div className="auth-error">This reset link is missing or invalid.</div> : <form className="auth-form" onSubmit={submit}><label className="form-field"><span><LockKeyhole size={13} /> New password</span><input type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={event => setPassword(event.target.value)} /></label><label className="form-field"><span><LockKeyhole size={13} /> Confirm password</span><input type="password" required minLength={8} autoComplete="new-password" placeholder="Repeat your password" value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>{confirmation && password !== confirmation && <div className="auth-error">Passwords do not match.</div>}{reset.error && <div className="auth-error">{reset.error.message}</div>}{reset.isSuccess ? <div className="auth-success"><CheckCircle2 size={15} /> Password updated. Returning to sign in…</div> : <button className="button button-primary auth-submit" disabled={reset.isPending || password !== confirmation}>{reset.isPending ? "Updating…" : "Update password"}<ArrowRight size={15} /></button>}</form>}<p className="auth-legal">If you did not request this reset, you can safely close this page.</p></section></main>;
}
