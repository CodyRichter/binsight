import re
import unicodedata
from dataclasses import dataclass

from app.features.search.schemas import Mark

WORD = re.compile(r"[^\W_]+")
EXACT, PREFIX, TYPO = 3, 2, 1


@dataclass(frozen=True)
class Word:
    """One word of a name, folded for matching, with where it sits in the name as written."""

    text: str
    start: int
    end: int


def fold(text: str) -> str:
    """Lower case without accents, so "Café" and "cafe" are the same word."""
    if text.isascii():
        return text.lower()
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(char for char in decomposed if not unicodedata.combining(char)).casefold()


def words(text: str) -> list[Word]:
    """The words in a name or a query, split on anything that is not a letter or digit."""
    if text.isascii():
        # Lower-casing ASCII keeps every character in place, so the whole name folds at once.
        return [
            Word(found.group(), found.start(), found.end()) for found in WORD.finditer(text.lower())
        ]
    return [Word(fold(found.group()), found.start(), found.end()) for found in WORD.finditer(text)]


def _allowed_typos(query_word: str) -> int:
    # Digits are exact: "Shelf 2" is not "Shelf 3".
    if not query_word.isalpha() or len(query_word) < 4:
        return 0
    return 1 if len(query_word) < 8 else 2


def _within(first: str, second: str, limit: int) -> bool:
    """Whether two words are at most `limit` edits apart, counting a swap of neighbours as one."""
    if abs(len(first) - len(second)) > limit:
        return False
    before: list[int] | None = None
    previous = list(range(len(second) + 1))
    for row, first_char in enumerate(first, 1):
        current = [row] + [0] * len(second)
        for column, second_char in enumerate(second, 1):
            current[column] = min(
                previous[column] + 1,
                current[column - 1] + 1,
                previous[column - 1] + (first_char != second_char),
            )
            swapped = column > 1 and (first_char, first[row - 2]) == (
                second[column - 2],
                second_char,
            )
            if before is not None and swapped:
                current[column] = min(current[column], before[column - 2] + 1)
        if min(current) > limit:
            return False
        before, previous = previous, current
    return previous[-1] <= limit


def word_score(query_word: str, word: str) -> int:
    """How well a typed word matches a word in the home: exactly, as its start, or with a typo."""
    if word == query_word:
        return EXACT
    if word.startswith(query_word):
        return PREFIX
    limit = _allowed_typos(query_word)
    if not limit:
        return 0
    typed = word[: len(query_word)]
    if _within(query_word, word, limit) or (typed != word and _within(query_word, typed, limit)):
        return TYPO
    return 0


def match_vocabulary(query_words: list[str], vocabulary: set[str]) -> list[dict[str, int]]:
    """For each typed word, every word in the home it matches and how well, worked out once."""
    return [
        {word: score for word in vocabulary if (score := word_score(query_word, word))}
        for query_word in query_words
    ]


def best_score(found: dict[str, int], target: list[Word]) -> int:
    """The best match one typed word has among a name's words, or 0 for none."""
    return max((found.get(word.text, 0) for word in target), default=0)


def _merged(spans: list[Mark]) -> list[Mark]:
    merged: list[Mark] = []
    for span in sorted(spans, key=lambda mark: mark.start):
        if merged and span.start <= merged[-1].end:
            merged[-1] = Mark(start=merged[-1].start, end=max(merged[-1].end, span.end))
        else:
            merged.append(span)
    return merged


def marks(query_words: list[str], found: list[dict[str, int]], target: list[Word]) -> list[Mark]:
    """The parts of a name the typed words matched: the typed start of a word, or all of it."""
    spans = []
    for query_word, matched in zip(query_words, found, strict=True):
        for word in target:
            score = matched.get(word.text, 0)
            if score == PREFIX:
                spans.append(
                    Mark(start=word.start, end=min(word.start + len(query_word), word.end))
                )
            elif score:
                spans.append(Mark(start=word.start, end=word.end))
    return _merged(spans)
