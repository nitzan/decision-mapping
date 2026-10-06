// Adds a worksheet downloader to the Critical Business School newsletter (Ghost members),
// labelled with the worksheet they asked for. Ghost sends its own confirmation email.
const GHOST = "https://www.criticalbusinessschool.com";

export async function POST(req: Request) {
  let body: { email?: string; name?: string; worksheet?: string; company?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  const email = (body.email || "").trim().toLowerCase();
  if (body.company) return Response.json({ ok: true }); // honeypot: pretend success for bots
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a full email address, like name@example.com." }, { status: 400 });
  }
  const worksheet = (body.worksheet || "").slice(0, 80);
  const headers = { "Content-Type": "application/json", Origin: GHOST, Referer: `${GHOST}/` };
  try {
    const tok = await fetch(`${GHOST}/members/api/integrity-token/`, { headers, cache: "no-store" });
    const integrityToken = tok.ok ? (await tok.text()).trim() : undefined;
    const res = await fetch(`${GHOST}/members/api/send-magic-link/`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        email,
        name: (body.name || "").slice(0, 80) || undefined,
        emailType: "signup",
        labels: ["Source: Tools", worksheet ? `Download: ${worksheet}` : undefined].filter(Boolean),
        integrityToken,
        urlHistory: [{ path: "/tools/worksheets", time: Date.now(), referrerSource: "tools.criticalbusinessschool.com" }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("ghost signup failed", res.status, text.slice(0, 300));
      return Response.json({ error: "Signup failed." }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("ghost signup error", err);
    return Response.json({ error: "Signup failed." }, { status: 502 });
  }
}
