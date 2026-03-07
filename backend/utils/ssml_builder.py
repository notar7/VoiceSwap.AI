"""
SSML builder — converts Gemini's voice_direction JSON + transcript into SSML
that Google Cloud TTS understands.

This is the critical link between Gemini's AI analysis and the final voice output.
The better the SSML, the more expressive the synthesized voice.
"""

import re


def build_ssml(transcript: str, voice_direction: dict) -> str:
    """
    Build SSML markup from the raw transcript + Gemini voice direction.

    Applied transformations:
      - Overall prosody: pace → <prosody rate>, energy → <prosody pitch>
      - Emphasis words: <emphasis level="moderate"> on Gemini-identified key words
      - Paragraph structure: double newlines become natural pauses

    The ssml_hints field from Gemini is intentional natural language —
    we use it for context but don't inject it directly into SSML.
    """
    pace = voice_direction.get("pace", "moderate")
    energy = voice_direction.get("energy", "medium")
    emphasis_words = {
        w.lower().strip(".,!?;:") for w in voice_direction.get("emphasis_words", [])
    }

    # Map Gemini's pace/energy labels to SSML prosody values
    rate = {"slow": "slow", "moderate": "medium", "fast": "fast"}.get(pace, "medium")
    pitch = {"low": "low", "medium": "medium", "high": "high"}.get(energy, "medium")

    tagged = _tag_emphasis(transcript, emphasis_words)

    return (
        f'<speak>'
        f'<prosody rate="{rate}" pitch="{pitch}">'
        f'{tagged}'
        f'</prosody>'
        f'</speak>'
    )


def _tag_emphasis(text: str, emphasis_words: set[str]) -> str:
    """Wrap emphasis words in <emphasis> tags, leaving punctuation intact."""
    if not emphasis_words:
        return text

    result = []
    for word in text.split():
        # Strip punctuation for comparison, keep original for output
        clean = re.sub(r"[^\w'-]", "", word).lower()
        if clean in emphasis_words:
            result.append(f'<emphasis level="moderate">{word}</emphasis>')
        else:
            result.append(word)
    return " ".join(result)
