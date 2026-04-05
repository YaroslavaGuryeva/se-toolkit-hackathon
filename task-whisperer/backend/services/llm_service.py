"""
LLM service for interacting with Qwen via OpenAI-compatible API.
"""
import os
import json
import logging
from typing import Optional
from openai import OpenAI, AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen-plus")


def _build_client() -> OpenAI:
    """Build a synchronous OpenAI-compatible client."""
    return OpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
    )


def _build_async_client() -> AsyncOpenAI:
    """Build an asynchronous OpenAI-compatible client."""
    return AsyncOpenAI(
        api_key=OPENAI_API_KEY,
        base_url=OPENAI_BASE_URL,
    )


def call_qwen(prompt: str, temperature: float = 0.3) -> str:
    """
    Call Qwen LLM with a prompt and return the response text.
    
    Args:
        prompt: The prompt to send to the model.
        temperature: Controls randomness (0.0-1.0). Lower = more deterministic.
    
    Returns:
        The generated text response.
    
    Raises:
        Exception: If the API call fails.
    """
    try:
        client = _build_client()
        response = client.chat.completions.create(
            model=QWEN_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Task Whisperer, an AI assistant that helps users prioritize their tasks. "
                        "You always respond with valid JSON when requested. Never add markdown formatting "
                        "or extra text around JSON responses."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=2048,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Qwen API call failed: {str(e)}")
        raise


async def call_qwen_async(prompt: str, temperature: float = 0.3) -> str:
    """
    Async version of call_qwen.
    """
    try:
        client = _build_async_client()
        response = await client.chat.completions.create(
            model=QWEN_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Task Whisperer, an AI assistant that helps users prioritize their tasks. "
                        "You always respond with valid JSON when requested. Never add markdown formatting "
                        "or extra text around JSON responses."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=2048,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Qwen API call failed: {str(e)}")
        raise


def parse_json_response(response: str) -> dict:
    """
    Parse a JSON response from Qwen, handling common formatting issues.
    
    Args:
        response: Raw text response from Qwen.
    
    Returns:
        Parsed JSON as a dictionary.
    
    Raises:
        ValueError: If the response cannot be parsed as JSON.
    """
    # Strip markdown code blocks if present
    cleaned = response.strip()
    if cleaned.startswith("```"):
        # Remove opening ```json or ```
        first_newline = cleaned.find("\n")
        if first_newline != -1:
            cleaned = cleaned[first_newline:].strip()
        # Remove closing ```
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from response: {response[:500]}")
        raise ValueError(f"Invalid JSON response from Qwen: {str(e)}")
