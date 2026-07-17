"use client";

import { useEffect, useState } from "react";
import Shell from "../components/Shell";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ScoreBadge({ score, total }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  let colorClasses = "border-secondary text-secondary";
  if (pct >= 80) colorClasses = "border-primary-fixed text-primary-fixed-dim";
  else if (pct >= 50) colorClasses = "border-yellow-500 text-yellow-400";

  return (
    <span className={`font-technical-sm text-technical-sm px-3 py-1 rounded-full border ${colorClasses}`}>
      {score}/{total} ({pct}%)
    </span>
  );
}

export default function History() {
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`${BACKEND_URL}/history`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setSessions(data.sessions);
      } catch (err) {
        setError(err.message || "Could not load history. Is the backend running?");
      }
    }
    loadHistory();
  }, []);

  return (
    <Shell activePage="history">
      <section className="mt-16 mb-section-gap">
        <h1 className="font-headline-lg text-headline-lg mb-3">Study history</h1>
        <p className="text-body-lg text-on-surface-variant max-w-xl">
          Every topic you've studied, with your quiz score and the notes the
          Summarizer agent generated - proof the system remembers across sessions.
        </p>
      </section>

      {error && (
        <div className="mb-component-gap p-4 rounded-xl border border-secondary bg-secondary/10 text-secondary text-body-md">
          Error: {error}
        </div>
      )}

      {sessions === null && !error && (
        <p className="text-on-surface-variant">Loading…</p>
      )}

      {sessions?.length === 0 && (
        <p className="text-on-surface-variant">
          No sessions yet - run a topic on the{" "}
          <a href="/" className="text-primary-fixed-dim underline">
            home page
          </a>{" "}
          and finish the quiz to see it here.
        </p>
      )}

      <div className="space-y-component-gap">
        {sessions?.map((s, i) => {
          const isOpen = expandedIndex === i;
          return (
            <div key={i} className="glass-panel rounded-2xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-card-padding py-4 hover:bg-slate-800 transition-colors text-left"
                onClick={() => setExpandedIndex(isOpen ? null : i)}
              >
                <div>
                  <p className="font-headline-md text-headline-md text-on-surface mb-1">{s.topic}</p>
                  <p className="text-technical-sm text-on-surface-variant">{formatDate(s.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ScoreBadge score={s.score} total={s.total_questions} />
                  <span
                    className={`material-symbols-outlined text-on-surface-variant transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </div>
              </button>
              {isOpen && (
                <div className="px-card-padding pb-6">
                  {s.summary ? (
                    <div className="font-code-block text-code-block text-on-surface-variant whitespace-pre-wrap bg-slate-900/50 rounded-xl p-4">
                      {s.summary}
                    </div>
                  ) : (
                    <p className="text-on-surface-variant">No saved notes for this topic.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
