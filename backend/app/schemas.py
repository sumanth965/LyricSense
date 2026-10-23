from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class WordItem(BaseModel):
    word: str
    start: Optional[float] = None
    end: Optional[float] = None
    probability: Optional[float] = None
    original_word: Optional[str] = None


class SegmentItem(BaseModel):
    start: float
    end: float
    text: str
    original_text: Optional[str] = None
    words: List[WordItem] = Field(default_factory=list)


class TranscriptionResponse(BaseModel):
    status: Literal["completed", "failed"]
    filename: str
    language: Optional[str] = None
    detected_language_name: Optional[str] = None
    duration: Optional[float] = None
    transcript: str
    original_transcript: Optional[str] = None
    transliterated: bool = False
    segments: List[SegmentItem]
    alignment_status: Literal["completed", "partial", "failed", "unsupported", "unavailable"]
    aligned_words_count: Optional[int] = None
    total_words_count: Optional[int] = None
    vocal_separation_used: bool = False
    separation_status: Optional[Literal["completed", "failed", "unavailable", "skipped"]] = "skipped"
    engine_used: Literal["groq", "local_whisper"] = "local_whisper"
    fallback_used: bool = False
    fallback_reason: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    model_size: str
    device: str
    compute_type: str
    model_loaded: bool
    ffmpeg_available: bool
    alignment_available: bool
    vocal_separation_available: bool = False
    groq_available: bool = False
    cloud_transcription_enabled: bool = True
    groq_model: str = "whisper-large-v3"
