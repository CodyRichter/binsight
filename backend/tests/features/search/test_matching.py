from app.features.search.matching import (
    EXACT,
    PREFIX,
    TYPO,
    marks,
    match_vocabulary,
    word_score,
    words,
)
from app.features.search.schemas import Mark


def test_a_swapped_pair_of_letters_is_one_typo() -> None:
    assert word_score("cabel", "cable") == TYPO


def test_a_word_is_found_from_its_first_letters() -> None:
    assert word_score("hdm", "hdmi") == PREFIX
    assert word_score("hdmi", "hdmi") == EXACT


def test_a_typo_while_still_typing_is_allowed() -> None:
    assert word_score("chager", "charger") == TYPO
    assert word_score("chrag", "charger") == TYPO


def test_short_words_must_be_typed_exactly() -> None:
    assert word_score("hmd", "hdmi") == 0
    assert word_score("usv", "usb") == 0


def test_digits_are_never_a_typo() -> None:
    assert word_score("2014", "2015") == 0


def test_longer_words_allow_two_typos() -> None:
    assert word_score("screwdirvr", "screwdriver") == TYPO
    assert word_score("hammre", "hammer") == TYPO
    assert word_score("hxmmrx", "hammer") == 0


def test_words_are_folded_and_keep_their_place_in_the_name() -> None:
    found = words("Café USB-C")
    assert [word.text for word in found] == ["cafe", "usb", "c"]
    assert (found[1].start, found[1].end) == (5, 8)


def test_marks_cover_the_typed_start_of_a_word_or_all_of_a_typo() -> None:
    name = words("HDMI cable")
    found = match_vocabulary(["hd", "cabel"], {word.text for word in name})
    assert marks(["hd", "cabel"], found, name) == [Mark(start=0, end=2), Mark(start=5, end=10)]
