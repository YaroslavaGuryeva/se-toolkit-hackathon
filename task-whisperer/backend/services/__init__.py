"""
Services package.
"""
from services.llm_service import call_qwen, call_qwen_async, parse_json_response
from services.recommendation import get_recommendation
from services.user_profile_service import get_or_create_profile, compute_user_profile, update_profile_manually
