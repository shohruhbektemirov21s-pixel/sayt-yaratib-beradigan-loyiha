import google.generativeai as genai
import json
import logging
from django.conf import settings
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# Pydantic Schemas for AI Response Validation
class PageBlueprint(BaseModel):
    name: str
    slug: str
    sections: List[str]

class WebsiteBlueprint(BaseModel):
    siteName: str
    businessType: str
    targetAudience: str
    brandTone: str
    pages: List[PageBlueprint]
    designDNA: Dict[str, str]

class SectionContent(BaseModel):
    id: str
    type: str
    variant: str
    content: Dict[str, Any]
    settings: Optional[Dict[str, Any]] = {}

class PageSchema(BaseModel):
    title: str
    slug: str
    seo: Dict[str, str]
    sections: List[SectionContent]

class FullWebsiteSchema(BaseModel):
    siteName: str
    brandColors: Dict[str, str]
    pages: List[PageSchema]

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)

    def generate_blueprint(self, prompt: str, language: str = 'en') -> Dict:
        """Step 1 AI Generation: Analyze intent and create a structure."""
        
        # Basic safety check (Gemini has built-in safety, but we add a layer)
        unsafe_keywords = ['18+', 'nsfw', 'porn', 'adult', 'sex', 'illegal', 'violence']
        if any(word in prompt.lower() for word in unsafe_keywords):
            raise ValueError("Unsafe content detected. Please provide a safe business prompt.")

        system_prompt = f"""
        You are a senior website architect. Analyze the user prompt and generate a website blueprint.
        The user language is {language}. All content should be in {language}.
        Output MUST be a valid JSON matching this structure:
        {{
            "siteName": "Name of the site",
            "businessType": "type of business",
            "targetAudience": "who is this for",
            "brandTone": "professional, playful, etc",
            "pages": [
                {{"name": "Home", "slug": "home", "sections": ["hero", "features", "contact"]}}
            ],
            "designDNA": {{
                "visualStyle": "minimal-editorial",
                "colorMode": "light",
                "typographyMood": "modern"
            }}
        }}
        """
        
        response = self.model.generate_content(f"{system_prompt}\n\nUser prompt: {prompt}")
        try:
            # Clean JSON from response (sometimes Gemini adds ```json ... ```)
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            
            data = json.loads(text)
            # Validate with Pydantic
            WebsiteBlueprint(**data)
            return data
        except Exception as e:
            logger.error(f"Blueprint generation failed: {e}")
            raise ValueError("Failed to generate a valid website blueprint.")

    def generate_page_content(self, blueprint: Dict, page_name: str, language: str = 'en') -> Dict:
        """Step 2 AI Generation: Generate detailed content for a specific page."""
        # This would be a more complex prompt with section-specific instructions
        system_prompt = f"""
        Generate full JSON content for the '{page_name}' page based on this blueprint: {json.dumps(blueprint)}.
        The language must be {language}.
        Include realistic marketing copy.
        Section types allowed: hero, features, services, products, about, testimonial, contact, footer.
        Output MUST be a valid JSON.
        """
        
        response = self.model.generate_content(system_prompt)
        try:
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Page content generation failed: {e}")
            return {{}} # Fallback
