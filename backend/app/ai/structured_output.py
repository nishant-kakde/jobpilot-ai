import re
import json
import logging
from typing import Any, Dict, Optional, Type
from pydantic import BaseModel, ValidationError

logger = logging.getLogger("jobpilot.ai.structured_output")

class StructuredOutputParser:
    """
    Cleans raw LLM outputs, parses JSON, and optionally validates against Pydantic schemas.
    """

    @staticmethod
    def extract_json(raw_text: str) -> Optional[Dict[str, Any]]:
        """
        Extracts JSON object from markdown blocks, backticks, or raw strings.
        """
        if not raw_text or not raw_text.strip():
            return None

        text = raw_text.strip()

        # Remove markdown code fences if present
        fence_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if fence_match:
            text = fence_match.group(1).strip()

        # Try direct parse
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

        # Try finding outer curly braces
        start_idx = text.find("{")
        end_idx = text.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            substring = text[start_idx : end_idx + 1]
            try:
                parsed = json.loads(substring)
                if isinstance(parsed, dict):
                    return parsed
            except Exception as e:
                logger.debug(f"Regex JSON slice parse failed: {e}")

        return None

    @classmethod
    def parse_and_validate(
        cls,
        raw_text: str,
        schema_class: Optional[Type[BaseModel]] = None,
        fallback_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extracts JSON and optionally validates with Pydantic.
        If extraction or validation fails, returns fallback_data.
        """
        extracted = cls.extract_json(raw_text)
        if not extracted:
            return fallback_data or {}

        if schema_class is not None:
            try:
                validated_model = schema_class.model_validate(extracted)
                return validated_model.model_dump()
            except ValidationError as ve:
                logger.warning(f"Pydantic validation warning: {ve}")
                # Return extracted dictionary while preserving fields
                if fallback_data:
                    merged = {**fallback_data, **extracted}
                    return merged
                return extracted

        return extracted

structured_output_parser = StructuredOutputParser()

