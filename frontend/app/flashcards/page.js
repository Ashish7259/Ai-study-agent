"use client";

import { useEffect, useState } from "react";
import Shell from "../components/Shell";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

function TopicPicker({ onSelect }) {
  const [topics, setTopics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTopics() {
      try {
        const res = await fetch(`${BACKEND_URL}/flashcards/topics`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setTopics(data.topics);
      } catch (err) {
        setError(err.message || "Could not load topics. Is the backend running?");
      }
    }
    loadTopics();
  }, []);

  return (
    <>
      <section className="mt-16 mb-section-gap">
        <h1 className="font-headline-lg text-headline-lg mb-3">Flashcards</h1>
        <p className="text-body-lg text-on-surface-variant max-w-xl">
          Every question your Quiz agent has asked, reshaped into flip-cards -
          pick a topic to start reviewing.
        </p>
      </section>

      {error && (
        <div className="mb-component-gap p-4 rounded-xl border border-secondary bg-secondary/10 text-secondary text-body-md">
          Error: {error}
        </div>
      )}

      {topics === null && !error && <p className="text-on-surface-variant">Loading…</p>}

      {topics?.length === 0 && (
        <p className="text-on-surface-variant">
          No flashcards yet - run a topic on the{" "}
          <a href="/" className="text-primary-fixed-dim underline">
            home page
          </a>{" "}
          and finish a quiz to generate some.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {topics?.map((t) => (
          <button
            key={t.topic}
            onClick={() => onSelect(t.topic)}
            className="glass-panel rounded-xl p-5 text-left hover:border-primary-fixed transition-all flex items-center justify-between group"
          >
            <div>
              <p className="font-headline-md text-headline-md text-on-surface mb-1">{t.topic}</p>
              <p className="text-technical-sm text-on-surface-variant">{t.count} cards</p>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary-fixed transition-colors">
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function FlashcardDeck({ topic, onBack }) {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    async function loadCards() {
      try {
        const res = await fetch(`${BACKEND_URL}/flashcards?topic=${encodeURIComponent(topic)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setCards(data.cards);
      } catch (err) {
        setError(err.message || "Could not load flashcards.");
      }
    }
    loadCards();
  }, [topic]);

  function next() {
    setFlipped(false);
    setIndex((i) => Math.min(i + 1, (cards?.length || 1) - 1));
  }

  function prev() {
    setFlipped(false);
    setIndex((i) => Math.max(i - 1, 0));
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-secondary bg-secondary/10 text-secondary text-body-md">
        Error: {error}
      </div>
    );
  }

  if (cards === null) {
    return <p className="text-on-surface-variant">Loading…</p>;
  }

  const card = cards[index];

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary-fixed-dim transition-colors mb-8"
      >
        <span className="material-symbols-outlined">arrow_back</span>
        <span className="font-label-caps text-label-caps uppercase">Back to topics</span>
      </button>

      <div className="flex items-center justify-between mb-4">
        <p className="font-headline-md text-headline-md text-primary">{topic}</p>
        <span className="text-technical-sm text-on-surface-variant">
          Card {index + 1} of {cards.length}
        </span>
      </div>

      <button
        onClick={() => setFlipped(!flipped)}
        className="w-full glass-panel rounded-2xl p-10 min-h-[220px] flex flex-col items-center justify-center text-center hover:border-primary-fixed transition-all"
      >
        {!flipped ? (
          <>
            <span className="text-technical-sm text-on-surface-variant uppercase tracking-widest mb-4">
              Question
            </span>
            <p className="text-body-lg font-medium">{card.front}</p>
            <span className="text-technical-sm text-on-surface-variant mt-6">Tap to reveal answer</span>
          </>
        ) : (
          <>
            <span className="text-technical-sm text-primary-fixed-dim uppercase tracking-widest mb-4">
              Answer
            </span>
            <p className="text-body-lg font-medium text-primary mb-4">{card.back}</p>
            {card.explanation && (
              <p className="italic text-on-surface-variant text-body-md max-w-md">{card.explanation}</p>
            )}
          </>
        )}
      </button>

      <div className="flex justify-between mt-6">
        <button
          onClick={prev}
          disabled={index === 0}
          className="px-5 py-2.5 rounded-xl border border-slate-600 bg-slate-800 hover:border-primary-fixed transition-all disabled:opacity-30"
        >
          ← Previous
        </button>
        <button
          onClick={next}
          disabled={index === cards.length - 1}
          className="px-5 py-2.5 rounded-xl bg-primary-fixed text-on-primary-fixed font-bold hover:scale-[0.98] transition-transform disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function Flashcards() {
  const [selectedTopic, setSelectedTopic] = useState(null);

  return (
    <Shell activePage="flashcards">
      {selectedTopic ? (
        <FlashcardDeck topic={selectedTopic} onBack={() => setSelectedTopic(null)} />
      ) : (
        <TopicPicker onSelect={setSelectedTopic} />
      )}
    </Shell>
  );
}
