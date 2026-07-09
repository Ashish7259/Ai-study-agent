"use client";

import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function Home() {
  const [status, setStatus] = useState(null);

  async function checkBackend() {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setStatus({ status: "error", message: "Could not reach backend. Is Flask running?" });
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: "80px auto", padding: 24 }}>
      <h1>AI Study Agent</h1>
      <p>Phase 0 checkpoint: confirm frontend can talk to backend.</p>
      <button onClick={checkBackend} style={{ padding: "8px 16px", cursor: "pointer" }}>
        Check backend health
      </button>
      {status && (
        <pre style={{ background: "#f4f4f4", padding: 16, marginTop: 16, borderRadius: 8 }}>
          {JSON.stringify(status, null, 2)}
        </pre>
      )}
    </main>
  );
}
