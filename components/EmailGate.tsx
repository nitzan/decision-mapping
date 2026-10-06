"use client";

import React, { useEffect, useState } from "react";

const KEY = "cbs-tools:email";

export default function EmailGate({ file, name }: { file: string; name: string }) {
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [note, setNote] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) setState("done");
    } catch {
      /* private mode */
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setState("error");
      setNote("Enter a full email address, like name@example.com.");
      return;
    }
    setState("sending");
    setNote("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: first.trim(), worksheet: name, company: trap }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 400) {
        setState("error");
        setNote(data.error || "Check the email address and try again.");
        return;
      }
      try {
        localStorage.setItem(KEY, email.trim());
      } catch {}
      setState("done");
      setNote(res.ok ? "Check your inbox to confirm your subscription." : "We couldn't add you to the newsletter just now, but the worksheet is yours.");
    } catch {
      setState("done");
      setNote("We couldn't add you to the newsletter just now, but the worksheet is yours.");
    }
  }

  if (state === "done") {
    return (
      <div className="gate gate-done">
        <a className="btn gate-btn" href={file} target="_blank" rel="noreferrer">
          Download the PDF
        </a>
        {note && <p className="gate-note">{note}</p>}
      </div>
    );
  }

  return (
    <form className="gate" onSubmit={submit} noValidate>
      <p className="gate-lead">Enter your email to download. You&apos;ll also get the Critical Business School newsletter; unsubscribe anytime.</p>
      <label className="gate-field">
        <span>First name (optional)</span>
        <input className="field" id="gate-name" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} />
      </label>
      <label className="gate-field">
        <span>Email</span>
        <input className="field" id="gate-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={state === "error"} />
      </label>
      <input className="gate-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={trap} onChange={(e) => setTrap(e.target.value)} name="company" />
      <button className="btn gate-btn" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Get the worksheet"}
      </button>
      {state === "error" && <p className="gate-note gate-error">{note}</p>}
    </form>
  );
}
