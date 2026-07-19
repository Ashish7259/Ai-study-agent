"use client";

import { useState } from "react";
import Shell from "./components/Shell";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const STAGES = [
  { key: "research", label: "Researcher", icon: "search_check" },
  { key: "summarize", label: "Summarizer", icon: "description" },
  { key: "quiz", label: "Quiz", icon: "quiz" },
];

const EXAMPLE_TOPICS = ["Round Robin scheduling", "Priority scheduling starvation", "What is process aging?"];

// Small markdown-ish renderer for the summary (## headings, - bullets, **bold**)
function renderSummary(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc list-inside space-y-1 my-2 text-on-surface">
          {listBuffer.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: boldify(item) }} />
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  function boldify(str) {
    return str.replace(/\*\*(.+?)\*\*/g, '<strong class="text-primary-fixed">$1</strong>');
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h4 key={i} className="text-primary-fixed font-bold mt-5 mb-2">
          {trimmed.replace(/^##\s*/, "")}
        </h4>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listBuffer.push(trimmed.replace(/^[-*]\s*/, ""));
    } else if (trimmed) {
      flushList();
      blocks.push(
        <p
          key={i}
          className="text-body-md text-on-surface leading-relaxed"
          dangerouslySetInnerHTML={{ __html: boldify(trimmed) }}
        />
      );
    }
  });
  flushList();
  return blocks;
}

function PipelineRail({ stage, toolCalls }) {
  const stageIndex = STAGES.findIndex((s) => s.key === stage);
  const currentIndex = stage === "done" ? STAGES.length : stage === "idle" ? -1 : stageIndex;

  const usedDocs = toolCalls?.some((t) => t.tool === "search_documents");
  const usedWeb = toolCalls?.some((t) => t.tool === "search_web");
  const progressPct = currentIndex <= 0 ? 0 : (currentIndex / STAGES.length) * 100;

  return (
    <section className="relative flex items-center justify-between mb-section-gap px-8">
      <div className="absolute h-0.5 left-12 right-12 bg-slate-600 top-1/2 -translate-y-1/2 z-0" />
      <div
        className="absolute h-0.5 left-12 bg-primary-fixed top-1/2 -translate-y-1/2 z-0 pipeline-line"
        style={{ width: `calc(${progressPct}% - ${progressPct > 0 ? 24 : 0}px)` }}
      />
      {STAGES.map((s, i) => {
        const isDone = i < currentIndex || stage === "done";
        const isActive = i === currentIndex && stage !== "done";
        return (
          <div key={s.key} className="relative z-10 flex flex-col items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all ${
                isDone
                  ? "bg-primary-fixed text-on-primary-fixed border-surface shadow-xl"
                  : isActive
                  ? "bg-surface border-primary-fixed text-primary-fixed shadow-xl pulse-lime"
                  : "bg-surface border-slate-600 text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined">{s.icon}</span>
            </div>
            <div className="text-center">
              <span
                className={`font-label-caps text-label-caps block uppercase ${
                  isDone || isActive ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {s.label}
              </span>
              <span
                className={`text-technical-sm ${
                  isActive ? "text-primary-fixed-dim" : "text-on-surface-variant"
                }`}
              >
                {isDone ? "Completed" : isActive ? "Working…" : "Pending"}
              </span>
              {s.key === "research" && isDone && (usedDocs || usedWeb) && (
                <span className="text-technical-sm text-primary-fixed-dim block mt-0.5">
                  {usedDocs ? "📄 docs " : ""}
                  {usedWeb ? "🌐 web" : ""}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function CollapsibleCard({ title, icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-panel rounded-2xl overflow-hidden transition-all duration-300">
      <button
        className="w-full flex items-center justify-between px-card-padding py-4 hover:bg-slate-800 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
            {title}
          </span>
        </div>
        <span
          className={`material-symbols-outlined transition-transform ${open ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>
      {open && <div className="px-card-padding pb-6">{children}</div>}
    </div>
  );
}

function QuizSection({ quiz, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [reported, setReported] = useState(false);

  const answeredCount = Object.keys(answers).length;

  function selectAnswer(qIndex, option) {
    if (answers[qIndex] !== undefined) return;
    const next = { ...answers, [qIndex]: option };
    setAnswers(next);

    if (Object.keys(next).length === quiz.length && !reported) {
      const finalScore = Object.keys(next).filter((i) => next[i] === quiz[i].correct_answer).length;
      setReported(true);
      onComplete?.(finalScore, quiz.length);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-card-padding">
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-primary">psychology</span>
        <h3 className="font-headline-md text-headline-md text-primary">Knowledge Check</h3>
        {answeredCount > 0 && (
          <span className="ml-auto font-label-caps text-label-caps text-primary-fixed-dim">
            {Object.keys(answers).filter((i) => answers[i] === quiz[i].correct_answer).length}/{answeredCount} correct
          </span>
        )}
      </div>

      {quiz.map((q, qi) => {
        const selected = answers[qi];
        return (
          <div key={qi} className={qi > 0 ? "mt-8 pt-8 border-t border-slate-700" : ""}>
            <span className="text-technical-sm text-on-surface-variant mb-2 block uppercase tracking-widest">
              Question {qi + 1} of {quiz.length}
            </span>
            <p className="text-body-lg font-medium mb-4">{q.question}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.options.map((opt, oi) => {
                const isCorrect = opt === q.correct_answer;
                const isSelected = opt === selected;
                const showResult = selected !== undefined;
                let classes =
                  "group p-4 rounded-xl border transition-all text-left flex items-center gap-4";
                if (showResult && isCorrect) {
                  classes += " border-primary-fixed bg-lime-glow";
                } else if (showResult && isSelected && !isCorrect) {
                  classes += " border-secondary bg-secondary/10";
                } else {
                  classes += " border-slate-600 bg-slate-800 hover:border-primary-fixed";
                }
                return (
                  <button
                    key={oi}
                    className={classes}
                    disabled={showResult}
                    onClick={() => selectAnswer(qi, opt)}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        showResult && isCorrect
                          ? "border-primary-fixed"
                          : showResult && isSelected
                          ? "border-secondary"
                          : "border-slate-500 group-hover:border-primary-fixed"
                      }`}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full transition-transform ${
                          isSelected || (showResult && isCorrect) ? "scale-100" : "scale-0"
                        } ${showResult && isCorrect ? "bg-primary-fixed" : "bg-secondary"}`}
                      />
                    </div>
                    <span className={showResult && isCorrect ? "text-primary" : ""}>{opt}</span>
                    {showResult && isCorrect && (
                      <span
                        className="material-symbols-outlined ml-auto text-primary text-sm"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selected !== undefined && (
              <div className="mt-3 p-4 bg-slate-800 rounded-lg border-l-4 border-primary-fixed">
                <p className="text-technical-sm font-bold text-primary-fixed mb-1 uppercase tracking-tighter">
                  Explanation
                </p>
                <p className="italic text-on-surface-variant text-body-md">{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [stage, setStage] = useState("idle");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTopic, setActiveTopic] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { state: "uploading"|"success"|"error", message }

  function resetSession() {
    setTopic("");
    setStage("idle");
    setError(null);
    setResult(null);
    setActiveTopic("");
    setSessionSaved(false);
    setUploadStatus(null);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploadStatus({ state: "uploading", message: `Ingesting ${file.name}…` });

    const formData = new FormData();
    formData.append("file", file);
    if (topic.trim()) formData.append("topic", topic.trim());

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUploadStatus({
        state: "success",
        message: `Ingested "${data.filename}" - ${data.chunks_stored} chunks added to your knowledge base.`,
      });
    } catch (err) {
      setUploadStatus({ state: "error", message: err.message || "Upload failed. Is the backend running?" });
    }
  }

  async function completeSession(score, totalQuestions) {
    try {
      await fetch(`${BACKEND_URL}/complete-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: activeTopic, score, total_questions: totalQuestions }),
      });
      setSessionSaved(true);
    } catch {
      // Non-critical - quiz still worked, just skip saving to history silently
    }
  }

  async function runPipeline(chosenTopic) {
    const useTopic = chosenTopic || topic;
    if (!useTopic.trim()) return;

    setError(null);
    setResult(null);
    setSessionSaved(false);
    setActiveTopic(useTopic);
    setStage("research");

    try {
      const researchRes = await fetch(`${BACKEND_URL}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: useTopic }),
      });
      const researchData = await researchRes.json();
      if (researchData.error) throw new Error(researchData.error);

      setResult((r) => ({ ...r, research_notes: researchData.research_notes, tool_calls: researchData.tool_calls }));
      setStage("summarize");

      const summaryRes = await fetch(`${BACKEND_URL}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: useTopic, research_notes: researchData.research_notes }),
      });
      const summaryData = await summaryRes.json();
      if (summaryData.error) throw new Error(summaryData.error);

      setResult((r) => ({ ...r, summary: summaryData.summary }));
      setStage("quiz");

      const quizRes = await fetch(`${BACKEND_URL}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: useTopic, summary: summaryData.summary }),
      });
      const quizData = await quizRes.json();
      if (quizData.error) throw new Error(quizData.error);

      setResult((r) => ({ ...r, quiz: quizData.quiz }));
      setStage("done");
    } catch (err) {
      setError(err.message || "Something went wrong. Is the Flask backend running?");
      setStage("idle");
    }
  }

  const isRunning = stage !== "idle" && stage !== "done";

  return (
    <Shell activePage="session" activeTopic={stage !== "idle" ? activeTopic : null} onNewSession={resetSession}>
      {/* Hero */}
      <section className="mt-16 mb-section-gap text-center">
        <h1 className="font-headline-lg text-headline-lg mb-6">
          Give it a topic.
          <br />
          Watch three agents work.
        </h1>
        <form
          className="relative group max-w-xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            runPipeline();
          }}
        >
          <label
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl border border-slate-600 bg-slate-800 flex items-center justify-center cursor-pointer hover:border-primary-fixed hover:text-primary-fixed transition-colors z-10"
            title="Upload your own notes (.txt or .pdf) into the knowledge base"
          >
            <span className="text-on-surface-variant text-2xl leading-none select-none" aria-hidden="true">+</span>
            <input
              type="file"
              accept=".txt,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
          <input
            className="w-full glass-panel h-16 pl-16 pr-14 rounded-2xl focus:ring-2 focus:ring-primary-fixed-dim focus:border-transparent outline-none transition-all text-lg"
            placeholder="e.g. Round Robin scheduling"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isRunning}
          />
          <button
            type="submit"
            disabled={isRunning || !topic.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary-fixed text-on-primary-fixed rounded-xl flex items-center justify-center hover:scale-95 transition-transform disabled:opacity-40"
          >
            <span className="material-symbols-outlined">
              {isRunning ? "hourglass_top" : "auto_awesome"}
            </span>
          </button>
        </form>

        {uploadStatus && (
          <p
            className={`mt-3 text-technical-sm max-w-xl mx-auto ${
              uploadStatus.state === "error"
                ? "text-secondary"
                : uploadStatus.state === "success"
                ? "text-primary-fixed-dim"
                : "text-on-surface-variant"
            }`}
          >
            {uploadStatus.state === "uploading" && "⏳ "}
            {uploadStatus.state === "success" && "✅ "}
            {uploadStatus.state === "error" && "⚠️ "}
            {uploadStatus.message}
          </p>
        )}

        <div className="mt-component-gap flex flex-wrap justify-center gap-2">
          <span className="text-technical-sm text-on-surface-variant uppercase tracking-widest block w-full mb-2">
            Example topics
          </span>
          {EXAMPLE_TOPICS.map((ex) => (
            <button
              key={ex}
              disabled={isRunning}
              onClick={() => {
                setTopic(ex);
                runPipeline(ex);
              }}
              className="px-4 py-1.5 rounded-full border border-slate-600 bg-slate-800 text-body-md hover:bg-slate-700 hover:border-primary-fixed transition-all disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="mb-component-gap p-4 rounded-xl border border-secondary bg-secondary/10 text-secondary text-body-md">
          Error: {error}
        </div>
      )}

      {stage !== "idle" && <PipelineRail stage={stage} toolCalls={result?.tool_calls} />}

      <div className="space-y-component-gap">
        {result?.research_notes && (
          <CollapsibleCard title="Researcher Raw Output" icon="terminal">
            <div className="font-code-block text-code-block text-on-surface-variant bg-slate-900/50 rounded-xl p-4 whitespace-pre-wrap">
              {result.research_notes}
            </div>
            {result.tool_calls?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {result.tool_calls.map((t, i) => (
                  <span
                    key={i}
                    className="text-technical-sm bg-slate-700 border border-slate-600 text-on-surface-variant px-3 py-1 rounded-full"
                  >
                    {t.tool}: "{t.input.query}"
                  </span>
                ))}
              </div>
            )}
          </CollapsibleCard>
        )}

        {result?.summary && (
          <div className="glass-panel rounded-2xl p-card-padding">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary">article</span>
              <h3 className="font-headline-md text-headline-md text-primary">Study Notes</h3>
            </div>
            <div className="prose prose-invert max-w-none">{renderSummary(result.summary)}</div>
          </div>
        )}

        {result?.quiz && (
          <>
            <QuizSection quiz={result.quiz} onComplete={completeSession} />
            {sessionSaved && (
              <p className="text-technical-sm text-on-surface-variant">
                Saved to your{" "}
                <a href="/history" className="text-primary-fixed-dim underline">
                  study history
                </a>{" "}
                and added to{" "}
                <a href="/flashcards" className="text-primary-fixed-dim underline">
                  flashcards
                </a>
                .
              </p>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
