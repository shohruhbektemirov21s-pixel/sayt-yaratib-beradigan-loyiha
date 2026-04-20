import json
import logging
from django.conf import settings
from typing import List, Optional, Dict, Any
import anthropic

logger = logging.getLogger(__name__)

class ClaudeService:
    def __init__(self):
        # We read from settings, assuming settings.py passes the env vars or we get them directly
        import os
        self.api_key = os.environ.get('ANTHROPIC_API_KEY') or getattr(settings, 'ANTHROPIC_API_KEY', None)
        self.model = os.environ.get('ANTHROPIC_MODEL') or getattr(settings, 'ANTHROPIC_MODEL', "claude-3-haiku-20240307")
        if not self.api_key:
            logger.error("Anthropic API key is missing.")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=self.api_key)

    def chat(self, prompt: str, history: List[Dict] = None) -> str:
        if not self.client:
            return "Claude xizmati sozlanmagan."
        
        messages = [{"role": "user", "content": prompt}]
        # optional: append history logic here if needed
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                system="Siz AI Website Builder platformasining yordamchisisiz. Savollarga qisqa va aniq javob bering.",
                messages=messages
            )
            return response.content[0].text
        except Exception as e:
            logger.error(f"Claude Error: {e}")
            return "Kechirasiz, suhbat xizmatida xatolik yuz berdi."

    def _clean_json(self, text: str) -> Dict:
        try:
            text = text.replace('```json', '').replace('```', '').strip()
            start, end = text.find('{'), text.rfind('}')
            if start != -1 and end != -1: 
                text = text[start:end+1]
            return json.loads(text)
        except Exception as e:
            logger.error(f"Claude JSON Error: {e}")
            raise ValueError("AI JSON formati xatosi.")

    def generate_full_site(self, prompt: str, language: str = 'uz') -> Dict:
        if not self.client:
            raise ValueError("Claude API is not configured.")
        
        system_instruction = f"Generate a modern website schema JSON in {language}. You must return ONLY valid JSON matching the system's expected schema format."
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            system=system_instruction,
            messages=[{"role": "user", "content": prompt}]
        )
        return self._clean_json(response.content[0].text)

    def revise_site(self, prompt: str, current_schema: Dict, language: str = 'uz') -> Dict:
        if not self.client:
            raise ValueError("Claude API is not configured.")
            
        system_instruction = f"Update the provided JSON schema based on the user's request. Lang: {language}. Return ONLY the updated JSON schema."
        
        prompt_content = f"Current Schema:\n{json.dumps(current_schema)}\n\nUser Request: {prompt}"
        
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            system=system_instruction,
            messages=[{"role": "user", "content": prompt_content}]
        )
        return self._clean_json(response.content[0].text)

class AIRouterService:
    @staticmethod
    def detect_intent(prompt: str) -> str:
        prompt_lower = prompt.lower().strip()
        gen_keywords = ['sayt', 'yarat', 'qur', 'build', 'create', 'dizayn', 'rang', 'font', 'section', 'tuzat', 'edit']
        
        if any(kw in prompt_lower for kw in gen_keywords):
            return "GENERATE"
        return "CHAT"
