import logging
import re
import unicodedata
from typing import List, Optional, Tuple
from anyascii import anyascii

logger = logging.getLogger(__name__)

# Optional imports for high-quality phonetic transliteration
try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate as indic_transliterate
    INDIC_TRANSLITERATION_AVAILABLE = True
except ImportError:
    INDIC_TRANSLITERATION_AVAILABLE = False
    logger.warning("indic-transliteration not available; falling back to anyascii.")

try:
    import pykakasi
    _kakasi_instance = pykakasi.kakasi()
    PYKAKASI_AVAILABLE = True
except ImportError:
    PYKAKASI_AVAILABLE = False
    _kakasi_instance = None
    logger.warning("pykakasi not available; falling back to anyascii for Japanese.")

# Common language names
LANGUAGE_NAME_MAP = {
    "en": "English",
    "hi": "Hindi",
    "kn": "Kannada",
    "te": "Telugu",
    "ta": "Tamil",
    "ml": "Malayalam",
    "bn": "Bengali",
    "pa": "Punjabi",
    "gu": "Gujarati",
    "mr": "Marathi",
    "sa": "Sanskrit",
    "ne": "Nepali",
    "ja": "Japanese",
    "ko": "Korean",
    "zh": "Chinese",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "ar": "Arabic",
    "ur": "Urdu",
}


def get_language_display_name(lang_code: Optional[str]) -> Optional[str]:
    if not lang_code:
        return None
    code = lang_code.strip().lower()
    return LANGUAGE_NAME_MAP.get(code, code.upper())


def split_affixes(token: str) -> Tuple[str, str, str]:
    """
    Splits leading and trailing punctuation, symbols, and whitespace from core text
    using Unicode character category inspections.
    """
    if not token:
        return "", "", ""

    # Categories: P = Punctuation, Z = Separator/Space, S = Symbol
    start = 0
    while start < len(token) and unicodedata.category(token[start]).startswith(("P", "Z", "S")):
        start += 1

    end = len(token)
    while end > start and unicodedata.category(token[end - 1]).startswith(("P", "Z", "S")):
        end -= 1

    return token[:start], token[start:end], token[end:]


def detect_script(text: str) -> str:
    """Detects Unicode script range present in the text."""
    for ch in text:
        cp = ord(ch)
        if 0x0900 <= cp <= 0x097F:
            return "devanagari"
        elif 0x0C80 <= cp <= 0x0CFF:
            return "kannada"
        elif 0x0C00 <= cp <= 0x0C7F:
            return "telugu"
        elif 0x0B80 <= cp <= 0x0BFF:
            return "tamil"
        elif 0x0D00 <= cp <= 0x0D7F:
            return "malayalam"
        elif 0x0980 <= cp <= 0x09FF:
            return "bengali"
        elif 0x0A00 <= cp <= 0x0A7F:
            return "gurmukhi"
        elif 0x0A80 <= cp <= 0x0AFF:
            return "gujarati"
        elif (0x3040 <= cp <= 0x309F) or (0x30A0 <= cp <= 0x30FF) or (0x4E00 <= cp <= 0x9FFF):
            return "japanese"
    return "other"


def clean_indic_optitrans(raw: str) -> str:
    """
    Refines raw Optitrans/ITRANS Romanization to natural English alphabet lyric spelling.
    Preserves exact pronunciation while using user-friendly English letters.
    E.g.: 'shaMkarA' -> 'shankara', 'namaste' -> 'namaste', 'prIti' -> 'preethi'
    """
    replacements = [
        ("shh", "sh"),
        ("Sh", "sh"),
        ("kSh", "ksh"),
        ("j~n", "gya"),
        ("~n", "n"),
        ("~N", "n"),
        ("N", "n"),
        ("T", "t"),
        ("Th", "th"),
        ("D", "d"),
        ("Dh", "dh"),
        ("R", "ri"),
        ("ee", "ee"),
        ("I", "ee"),
        ("oo", "oo"),
        ("U", "oo"),
        ("aa", "aa"),
        ("A", "aa"),
        ("E", "e"),
        ("O", "o"),
        ("L", "l"),
        ("M", "n"),
        ("H", "h"),
    ]
    w = raw
    for k, v in replacements:
        w = w.replace(k, v)

    # Simplify final 'aa' after consonants in song titles (e.g. shankarA -> shankara)
    w = re.sub(r"([b-df-hj-np-tv-z])aa\b", r"\1a", w, flags=re.IGNORECASE)

    # South Indian / Kannada transliteration customary spelling: 'priti' / 'preeti' -> 'preethi'
    if "preeti" in w.lower():
        w = re.sub(r"preeti", "Preethi", w, flags=re.IGNORECASE)

    return w


def transliterate_core_word(core: str, default_script: Optional[str] = None) -> str:
    """Transliterates a single core word stripped of surrounding punctuation."""
    if not core:
        return core

    # If already pure ASCII (English alphabet, numbers), leave as is
    if all(ord(c) < 128 for c in core):
        return core

    script = detect_script(core)
    if script == "other" and default_script:
        script = default_script

    if INDIC_TRANSLITERATION_AVAILABLE and script in (
        "devanagari",
        "kannada",
        "telugu",
        "tamil",
        "malayalam",
        "bengali",
        "gurmukhi",
        "gujarati",
    ):
        sanscript_map = {
            "devanagari": sanscript.DEVANAGARI,
            "kannada": sanscript.KANNADA,
            "telugu": sanscript.TELUGU,
            "tamil": sanscript.TAMIL,
            "malayalam": sanscript.MALAYALAM,
            "bengali": sanscript.BENGALI,
            "gurmukhi": sanscript.GURMUKHI,
            "gujarati": sanscript.GUJARATI,
        }
        source_script = sanscript_map.get(script, sanscript.DEVANAGARI)
        raw = indic_transliterate(core, source_script, sanscript.OPTITRANS)
        cleaned = clean_indic_optitrans(raw)
        # Guarantee 100% pure English alphabet characters (clean residual accents)
        if any(ord(c) >= 128 for c in cleaned):
            cleaned = anyascii(cleaned)
        # Match case appropriately
        if core[0].isupper() or len(cleaned) <= 1:
            return cleaned.capitalize()
        return cleaned

    elif PYKAKASI_AVAILABLE and script == "japanese":
        res = _kakasi_instance.convert(core)
        out = "".join([item.get("hepburn", "") for item in res])
        # Handle Japanese conversational wa/ha particles
        out = re.sub(r"\bkonnichiha\b", "konnichiwa", out, flags=re.IGNORECASE)
        out = re.sub(r"\bkonbanha\b", "konbanwa", out, flags=re.IGNORECASE)
        return out

    # Universal fallback for any other writing system (Cyrillic, Korean, Arabic, Chinese, etc.)
    return anyascii(core)


def transliterate_token(token: str, default_script: Optional[str] = None) -> str:
    """Transliterates a single token while strictly preserving leading and trailing punctuation."""
    if not token:
        return token

    # Check if purely ASCII
    if all(ord(c) < 128 for c in token):
        return token

    leading, core, trailing = split_affixes(token)
    if not core:
        return token

    transliterated_core = transliterate_core_word(core, default_script=default_script)
    res = leading + transliterated_core + trailing
    if any(ord(c) >= 128 for c in res):
        res = anyascii(res)
    return res


def transliterate_text(text: str, default_script: Optional[str] = None) -> str:
    """
    Transliterates a full string (sentence or lyric line) into English/Roman alphabet.
    Preserves whitespace, punctuation, and capitalization.
    """
    if not text:
        return text

    # If completely ASCII, return unchanged
    if all(ord(c) < 128 for c in text):
        return text

    # Split by spaces preserving exact spacing tokens
    parts = re.split(r"(\s+)", text)
    result = []
    for part in parts:
        if not part:
            continue
        if part.isspace():
            result.append(part)
        else:
            result.append(transliterate_token(part, default_script=default_script))
    
    out = "".join(result)
    
    # Capitalize the first alphabetic letter of lyric line if lowercase
    for idx, char in enumerate(out):
        if char.isalpha():
            if char.islower():
                out = out[:idx] + char.upper() + out[idx + 1 :]
            break
    # Guarantee 100% pure English alphabet characters
    if any(ord(c) >= 128 for c in out):
        out = anyascii(out)
    return out


def transliterate_segments_and_words(
    segments: list,
    detected_language: Optional[str] = None,
) -> Tuple[list, bool]:
    """
    Applies Roman/English transliteration across all segments and their respective words.
    Preserves:
      - 1:1 word-level timestamps (start, end, probability)
      - original word order
      - punctuation and spacing
    Stores original text in `original_text` and `original_word` fields for transparency.
    Returns:
      (transliterated_segments, was_transliterated)
    """
    if not segments:
        return segments, False

    # Map language code to default script hint if available
    lang_to_script = {
        "hi": "devanagari",
        "mr": "devanagari",
        "sa": "devanagari",
        "ne": "devanagari",
        "kn": "kannada",
        "te": "telugu",
        "ta": "tamil",
        "ml": "malayalam",
        "bn": "bengali",
        "pa": "gurmukhi",
        "gu": "gujarati",
        "ja": "japanese",
    }
    default_script = lang_to_script.get((detected_language or "").lower())

    has_transliterated = False

    for seg in segments:
        # Check if segment contains non-ASCII characters
        seg_has_non_ascii = not all(ord(c) < 128 for c in seg.text)
        if seg_has_non_ascii:
            has_transliterated = True

        # Save original text
        if getattr(seg, "original_text", None) is None:
            seg.original_text = seg.text

        # 1. Transliterate word-level timestamps
        if hasattr(seg, "words") and seg.words:
            capitalize_next = True
            for idx, w in enumerate(seg.words):
                if not all(ord(c) < 128 for c in w.word):
                    has_transliterated = True
                    if getattr(w, "original_word", None) is None:
                        w.original_word = w.word
                    w.word = transliterate_token(w.word, default_script=default_script)
                else:
                    if getattr(w, "original_word", None) is None:
                        w.original_word = w.word

                # Capitalize first word of segment or after terminal punctuation (. ? !)
                if capitalize_next and w.word:
                    for c_idx, ch in enumerate(w.word):
                        if ch.isalpha():
                            if ch.islower():
                                w.word = w.word[:c_idx] + ch.upper() + w.word[c_idx + 1 :]
                            capitalize_next = False
                            break
                # Check if this word ends with terminal punctuation
                if w.word and w.word.rstrip().endswith((".", "!", "?")):
                    capitalize_next = True

            # If words are present, construct segment text from transliterated words if seg text needed transliteration
            if seg_has_non_ascii:
                # Transliterate full segment text directly to preserve punctuation and casing
                seg.text = transliterate_text(seg.original_text, default_script=default_script)
        else:
            if seg_has_non_ascii:
                seg.text = transliterate_text(seg.original_text, default_script=default_script)

    return segments, has_transliterated
