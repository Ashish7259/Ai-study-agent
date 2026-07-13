"use client";

import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const STAGES = [
  { key: "research", label: "Researcher" },
  { key: "summarize", label: "Summarizer" },
  { key: "quiz", label: "Quiz" },
];

const EXAMPLE_TOPICS = ["Round Robin scheduling", "Priority scheduling starvation", "What is process aging?"];

// Very small markdown-ish renderer for the summary (## headings, - bullets, **bold**)
// so we don't need a full markdown library for a small portfolio project.
function renderSummary(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {listBuffer.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: boldify(item) }} />
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  function boldify(str) {
    return str.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(<h2 key={i}>{trimmed.replace(/^##\s*/, "")}</h2>);
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listBuffer.push(trimmed.replace(/^[-*]\s*/, ""));
    } else if (trimmed) {
      flushList();
      blocks.push(<p key={i} dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />);
    }
  });
  flushList();
  return blocks;
}

function PipelineRail({ stage, toolCalls }) {
  const stageIndex = STAGES.findIndex((s) => s.key === stage);
  // stage can be: "idle" | "research" | "summarize" | "quiz" | "done"
  const currentIndex = stage === "done" ? STAGES.length : stage === "idle" ? -1 : stageIndex;

  const usedDocs = toolCalls?.some((t) => t.tool === "search_documents");
  const usedWeb = toolCalls?.some((t) => t.tool === "search_web");

  return (
    <div className="rail">
      {STAGES.map((s, i) => {
        const isDone = i < currentIndex || stage === "done";
        const isActive = i === currentIndex && stage !== "done";
        return (
          <div key={s.key} style={{ display: "contents" }}>
            <div className="rail-node">
              <div className={`node-dot ${isActive ? "active" : ""} ${isDone ? "done" : ""}`} />
              <span className={`node-label ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                {s.label}
              </span>
              <span className="node-badge">
                {s.key === "research" && isDone && usedDocs ? "📄 docs " : ""}
                {s.key === "research" && isDone && usedWeb ? "🌐 web" : ""}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`rail-connector ${i < currentIndex || stage === "done" ? "filled" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CollapsibleCard({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <div className="card-header" onClick={() => setOpen(!open)}>
        <p className="card-title">{title}</p>
        <span className="card-toggle">{open ? "hide" : "show"}</span>
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
}

function QuizSection({ quiz }) {
  const [answers, setAnswers] = useState({}); // { questionIndex: selectedOption }

  const score = Object.keys(answers).filter(
    (i) => answers[i] === quiz[i].correct_answer
  ).length;
  const answeredCount = Object.keys(answers).length;

  function selectAnswer(qIndex, option) {
    if (answers[qIndex] !== undefined) return; // already answered
    setAnswers({ ...answers, [qIndex]: option });
  }

  return (
    <div>
      {answeredCount > 0 && (
        <p className="quiz-score">
          Score: {score}/{answeredCount} answered
        </p>
      )}
      {quiz.map((q, qi) => {
        const selected = answers[qi];
        return (
          <div className="quiz-card" key={qi}>
            <p className="quiz-meta">Question {qi + 1} of {quiz.length}</p>
            <p className="quiz-question">{q.question}</p>
            {q.options.map((opt, oi) => {
              let cls = "option-btn";
              if (selected !== undefined) {
                if (opt === q.correct_answer) cls += " correct";
                else if (opt === selected) cls += " incorrect";
              }
              return (
                <button
                  key={oi}
                  className={cls}
                  disabled={selected !== undefined}
                  onClick={() => selectAnswer(qi, opt)}
                >
                  {opt}
                </button>
              );
            })}
            {selected !== undefined && (
              <div className="quiz-explanation">{q.explanation}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [stage, setStage] = useState("idle"); // idle | research | summarize | quiz | done
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { research_notes, tool_calls, summary, quiz }

  async function runPipeline(chosenTopic) {
    const useTopic = chosenTopic || topic;
    if (!useTopic.trim()) return;

    setError(null);
    setResult(null);
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
    <main className="page">
      <div className="container">
        <p className="eyebrow">Study Agent</p>
        <h1 className="title font-display">Give it a topic.<br />Watch three agents work.</h1>
        <p className="subtitle">
          A Researcher agent gathers information from your notes and the web,
          a Summarizer turns it into study notes, and a Quiz agent tests you
          on it — with memory, so it never repeats a question.
        </p>

        <form
          className="topic-form"
          onSubmit={(e) => {
            e.preventDefault();
            runPipeline();
          }}
        >
          <input
            className="topic-input"
            placeholder="e.g. Round Robin scheduling"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isRunning}
          />
          <button className="run-btn" type="submit" disabled={isRunning || !topic.trim()}>
            {isRunning ? "Working…" : "Run"}
          </button>
        </form>

        <div className="examples">
          {EXAMPLE_TOPICS.map((ex) => (
            <button
              key={ex}
              className="example-chip"
              disabled={isRunning}
              onClick={() => {
                setTopic(ex);
                runPipeline(ex);
              }}
            >
              {ex}
            </button>
          ))}
        </div>

        {error && <div className="error-banner">Error: {error}</div>}

        {stage !== "idle" && <PipelineRail stage={stage} toolCalls={result?.tool_calls} />}

        {result?.research_notes && (
          <CollapsibleCard title="Research notes (raw)">
            <div className="raw-notes">{result.research_notes}</div>
            {result.tool_calls?.length > 0 && (
              <div className="tool-log">
                {result.tool_calls.map((t, i) => (
                  <span className="tool-chip" key={i}>{t.tool}: "{t.input.query}"</span>
                ))}
              </div>
            )}
          </CollapsibleCard>
        )}

        {result?.summary && (
          <CollapsibleCard title="Study notes" defaultOpen>
            {renderSummary(result.summary)}
          </CollapsibleCard>
        )}

        {result?.quiz && (
          <>
            <p className="card-title" style={{ margin: "32px 0 16px" }}>Quiz</p>
            <QuizSection quiz={result.quiz} />
          </>
        )}
      </div>
    </main>
  );
}
