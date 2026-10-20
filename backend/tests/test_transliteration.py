import pytest
from app.schemas import SegmentItem, WordItem
from app.transliteration import (
    clean_indic_optitrans,
    detect_script,
    split_affixes,
    transliterate_core_word,
    transliterate_segments_and_words,
    transliterate_text,
    transliterate_token,
)


def test_hindi_transliteration():
    """Verify Hindi Devanagari transliterates to English alphabet with accurate phonetic spelling."""
    assert transliterate_text("नमस्ते") == "Namaste"
    res = transliterate_text("नमो नमो शंकरा")
    assert "namo namo" in res.lower()
    assert "shankara" in res.lower()


def test_kannada_transliteration():
    """Verify Kannada script transliterates to English alphabet preserving pronunciation."""
    assert transliterate_text("ನಿನ್ನ ಪ್ರೀತಿ") == "Ninna Preethi"


def test_japanese_transliteration():
    """Verify Japanese Kana/Kanji transliterates to Roman English alphabet."""
    assert transliterate_text("こんにちは") == "Konnichiwa"


def test_english_lyrics_unchanged():
    """Verify songs in English are returned unchanged."""
    english_line = "In the silence of the night, echoes of memories won't whisper."
    assert transliterate_text(english_line) == english_line


def test_punctuation_and_spacing_preservation():
    """Verify punctuation marks, quotes, and whitespace are strictly preserved."""
    assert transliterate_text(' "नमस्ते!" ') == ' "Namaste!" '
    assert transliterate_text("नमस्ते, दोस्तो?") == "Namaste, dosto?"


def test_word_timestamp_integrity_preserved():
    """
    Critical Requirement 7:
    Verify word timestamps (start, end, probability) are preserved exactly,
    while word text is transliterated into English alphabet and original_word is recorded.
    """
    raw_words = [
        WordItem(word="नमस्ते", start=1.2, end=1.8, probability=0.92),
        WordItem(word="शंकरा", start=1.9, end=2.5, probability=0.88),
    ]
    segment = SegmentItem(
        start=1.2,
        end=2.5,
        text="नमस्ते शंकरा",
        words=raw_words,
    )

    processed_segments, was_transliterated = transliterate_segments_and_words([segment], detected_language="hi")

    assert was_transliterated is True
    assert len(processed_segments) == 1
    out_seg = processed_segments[0]

    # Segment text is in English alphabet
    assert all(ord(c) < 128 for c in out_seg.text)
    assert out_seg.original_text == "नमस्ते शंकरा"

    # Words have Romanized words and exact original timestamps
    assert len(out_seg.words) == 2
    w1 = out_seg.words[0]
    assert w1.word.lower() == "namaste"
    assert w1.original_word == "नमस्ते"
    assert w1.start == 1.2
    assert w1.end == 1.8
    assert w1.probability == 0.92

    w2 = out_seg.words[1]
    assert "shankara" in w2.word.lower()
    assert w2.original_word == "शंकरा"
    assert w2.start == 1.9
    assert w2.end == 2.5
    assert w2.probability == 0.88


def test_mixed_script_lyrics():
    """Verify sentences mixing Hindi Devanagari and English words transliterate correctly."""
    mixed = "नमस्ते World! नमो शंकरा!"
    res = transliterate_text(mixed)
    assert all(ord(c) < 128 for c in res)
    assert "Namaste" in res
    assert "World!" in res
    assert "shankara" in res.lower()


def test_exact_user_spec_transliteration():
    """
    Verify exact test cases requested by the user:
    नमस्ते -> Namaste
    ನಿನ್ನ ಪ್ರೀತಿ -> Ninna Preethi
    こんにちは -> Konnichiwa
    both for segment-level text and for individual word-level tokens.
    """
    seg_hindi = SegmentItem(
        start=0.0,
        end=1.5,
        text="नमस्ते",
        words=[WordItem(word="नमस्ते", start=0.0, end=1.5)],
    )
    seg_kannada = SegmentItem(
        start=1.5,
        end=3.5,
        text="ನಿನ್ನ ಪ್ರೀತಿ",
        words=[
            WordItem(word="ನಿನ್ನ", start=1.5, end=2.5),
            WordItem(word="ಪ್ರೀತಿ", start=2.5, end=3.5),
        ],
    )
    seg_japanese = SegmentItem(
        start=3.5,
        end=5.0,
        text="こんにちは",
        words=[WordItem(word="こんにちは", start=3.5, end=5.0)],
    )

    processed, was_trans = transliterate_segments_and_words([seg_hindi, seg_kannada, seg_japanese])
    assert was_trans is True

    # Hindi
    assert processed[0].text == "Namaste"
    assert processed[0].words[0].word == "Namaste"

    # Kannada
    assert processed[1].text == "Ninna Preethi"
    assert [w.word for w in processed[1].words] == ["Ninna", "Preethi"]

    # Japanese
    assert processed[2].text == "Konnichiwa"
    assert processed[2].words[0].word == "Konnichiwa"

