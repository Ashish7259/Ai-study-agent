"""
Small retrieval eval: a handful of questions with a keyword we expect to
see in the top retrieved chunk. This isn't rigorous, but it gives you a
concrete number to put in your README/resume, and it's a common lightweight
pattern for demoing RAG quality.

Usage:
    python eval_retrieval.py

Edit TEST_CASES to match whatever documents you've actually ingested.
"""

from rag import retrieve

# Each test case: a question, and a keyword that should appear in a
# genuinely relevant chunk. Tailor these to your own ingested content.
TEST_CASES = [
    {"query": "What is Round Robin scheduling?", "expected_keyword": "Round Robin"},
    {"query": "What causes starvation in priority scheduling?", "expected_keyword": "starvation"},
    {"query": "How does aging fix a scheduling problem?", "expected_keyword": "aging"},
    {"query": "What is the goal of a process scheduler?", "expected_keyword": "CPU utilization"},
    {"query": "What is multilevel queue scheduling?", "expected_keyword": "Multilevel queue"},
]


def run_eval():
    correct = 0
    for case in TEST_CASES:
        results = retrieve(case["query"], match_count=3)
        top_chunks_text = " ".join(r["content"] for r in results)
        hit = case["expected_keyword"].lower() in top_chunks_text.lower()
        correct += int(hit)
        status = "PASS" if hit else "FAIL"
        print(f"[{status}] {case['query']}")

    accuracy = correct / len(TEST_CASES) * 100
    print(f"\nRetrieval accuracy: {correct}/{len(TEST_CASES)} ({accuracy:.0f}%)")


if __name__ == "__main__":
    run_eval()
