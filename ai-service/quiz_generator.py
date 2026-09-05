"""
Quiz generation core.

Two modes:
  1. RULE-BASED (default, no API key needed): extracts candidate keywords
     from the pasted course text and builds fill-in-the-blank MCQs with
     distractors drawn from other keywords in the same text. Fully offline,
     deterministic-ish, and defensible in a viva since every step is
     explainable (no "black box" LLM call to point at).
  2. LLM-ASSISTED (if GEMINI_API_KEY is set): sends the topic/text to Gemini
     and asks for structured JSON MCQs, for richer conceptual questions that
     go beyond fill-in-the-blank.

The API layer (main.py) picks the mode automatically based on whether a key
is configured, but the rule-based path always exists as a working fallback.
"""

import os
import re
import random
from collections import Counter

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "if", "then", "than", "so",
    "is", "are", "was", "were", "be", "been", "being", "am",
    "of", "in", "on", "at", "by", "for", "with", "about", "against",
    "to", "from", "up", "down", "over", "under", "again", "further",
    "this", "that", "these", "those", "it", "its", "as", "into", "through",
    "there", "here", "when", "where", "why", "how", "all", "any", "both",
    "each", "few", "more", "most", "other", "some", "such", "no", "nor",
    "not", "only", "own", "same", "too", "very", "can", "will", "just",
    "should", "now", "also", "which", "their", "his", "her", "they",
    "you", "your", "we", "our", "i", "he", "she", "them", "have", "has",
    "had", "do", "does", "did", "what", "who", "whom",
}


def _split_sentences(text):
    raw = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s.strip() for s in raw if len(s.strip()) >= 25]


def _extract_keyword(sentence):
    """Pick the most 'informative' word in a sentence: longest non-stopword
    alphabetic token, preferring capitalized (likely a proper noun / key term)."""
    words = re.findall(r"[A-Za-z][A-Za-z\-]{2,}", sentence)
    candidates = [w for w in words if w.lower() not in STOPWORDS]
    if not candidates:
        return None
    candidates.sort(key=lambda w: (w[0].isupper(), len(w)), reverse=True)
    return candidates[0]


def _extract_vocab(sentence, max_words=4):
    """Pull several informative words from a sentence (not just one), so the
    overall distractor pool doesn't collapse to a handful of words on short
    input text. Longer/capitalized words are preferred but several distinct
    words per sentence are kept."""
    words = re.findall(r"[A-Za-z][A-Za-z\-]{2,}", sentence)
    seen = set()
    candidates = []
    for w in words:
        lw = w.lower()
        if lw in STOPWORDS or lw in seen or len(w) < 4:
            continue
        seen.add(lw)
        candidates.append(w)
    candidates.sort(key=lambda w: (w[0].isupper(), len(w)), reverse=True)
    return candidates[:max_words]


def _difficulty_for_keyword(word):
    if len(word) <= 5:
        return "easy"
    if len(word) <= 9:
        return "medium"
    return "hard"


def generate_rule_based(topic_or_text, num_questions=5, difficulty="medium"):
    sentences = _split_sentences(topic_or_text)

    if len(sentences) < 2:
        raise ValueError(
            "Not enough substantive text to generate questions from. "
            "Paste at least a few full sentences of course notes (a single topic "
            "name isn't enough for the rule-based generator)."
        )

    # Build (sentence, keyword) pairs, skipping sentences with no good keyword
    pairs = []
    vocab_pool = set()  # broader pool drawn from every sentence, used for distractors
    for s in sentences:
        kw = _extract_keyword(s)
        if kw:
            pairs.append((s, kw))
        vocab_pool.update(_extract_vocab(s))

    if not pairs:
        raise ValueError("Could not extract meaningful keywords from the given text.")

    all_keywords = list(vocab_pool | {kw for _, kw in pairs})

    # Track how many times each word has been used as a distractor so far,
    # so repeated questions on short text spread across the whole vocabulary
    # instead of all converging on the same top-3 after a shuffle.
    usage_count = {w: 0 for w in all_keywords}

    def pick_distractors(exclude_word, count=3):
        candidates = [w for w in all_keywords if w.lower() != exclude_word.lower()]
        random.shuffle(candidates)  # tie-break randomly among equally-used words
        candidates.sort(key=lambda w: usage_count[w])  # least-used first
        chosen = candidates[:count]
        for w in chosen:
            usage_count[w] += 1
        return chosen

    random.shuffle(pairs)
    questions = []
    i = 0
    while len(questions) < num_questions and pairs:
        sentence, keyword = pairs[i % len(pairs)]
        i += 1


        # Build the question by masking the keyword
        pattern = re.compile(re.escape(keyword))
        masked = pattern.sub("_____", sentence, count=1)
        if "_____" not in masked:
            continue

        distractors = pick_distractors(keyword, count=3)
        # pad with generic distractors if the source text is too short on vocabulary
        filler = ["None of these", "Not applicable", "Cannot be determined"]
        while len(distractors) < 3:
            distractors.append(filler.pop(0))

        options = distractors + [keyword]
        random.shuffle(options)
        correct_index = options.index(keyword)

        questions.append(
            {
                "questionText": f"Fill in the blank: {masked}",
                "options": options,
                "correctIndex": correct_index,
                "difficulty": _difficulty_for_keyword(keyword) if difficulty == "auto" else difficulty,
            }
        )

        if i > len(pairs) * 3:  # safety: avoid infinite loop on tiny input
            break

    if not questions:
        raise ValueError("Failed to generate any valid questions from the given text.")

    return questions


def generate_with_gemini(topic_or_text, num_questions, difficulty, api_key):
    """Optional path: calls Gemini for richer conceptual MCQs.
    Only used if GEMINI_API_KEY is configured in the ai-service .env.
    """
    import requests
    import json

    prompt = f"""Generate {num_questions} multiple-choice quiz questions ({difficulty} difficulty)
based on this course material:

\"\"\"{topic_or_text}\"\"\"

Return ONLY a JSON array, no markdown fences, no commentary. Each item:
{{"questionText": str, "options": [4 strings], "correctIndex": int (0-3), "difficulty": "{difficulty}"}}
"""
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={api_key}"
    )
    resp = requests.post(
        url,
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=30,
    )
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    text = text.strip().strip("`")
    if text.startswith("json"):
        text = text[4:].strip()
    questions = json.loads(text)
    return questions


def generate_quiz(topic_or_text, num_questions=5, difficulty="medium"):
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            return generate_with_gemini(topic_or_text, num_questions, difficulty, api_key)
        except Exception:
            # fall through to rule-based on any API failure so the feature
            # never fully breaks just because the LLM call failed
            pass
    return generate_rule_based(topic_or_text, num_questions, difficulty)