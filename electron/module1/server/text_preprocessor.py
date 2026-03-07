"""
Text Preprocessor for Legal Case Analysis

Handles text normalization, language detection, and translation:
- Language detection using langdetect
- Translation to English using Google Gemini API
- Text cleaning and normalization
"""

import os
import re
import logging
from typing import Dict, Any, Optional
from langdetect import detect, LangDetectException
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API configured successfully")
else:
    logger.warning("GEMINI_API_KEY not found. Translation features will be limited.")


class TextPreprocessor:
    """Handles text preprocessing, cleaning, and translation."""
    
    # Language code to name mapping
    LANGUAGE_NAMES = {
        'en': 'English',
        'hi': 'Hindi',
        'ta': 'Tamil',
        'te': 'Telugu',
        'kn': 'Kannada',
        'ml': 'Malayalam',
        'mr': 'Marathi',
        'gu': 'Gujarati',
        'bn': 'Bengali',
        'pa': 'Punjabi',
        'ur': 'Urdu',
        'or': 'Odia',
        'as': 'Assamese'
    }
    
    def __init__(self, gemini_api_key: Optional[str] = None):
        """
        Initialize the TextPreprocessor.
        
        Args:
            gemini_api_key: Optional Gemini API key
        """
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.has_translation = True
        else:
            self.has_translation = bool(GEMINI_API_KEY)
        
        if self.has_translation:
            try:
                self.model = genai.GenerativeModel('gemini-flash-latest')
                logger.info("Gemini model initialized for translation")
            except Exception as e:
                logger.error(f"Error initializing Gemini model: {str(e)}")
                self.has_translation = False
    
    def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Detect the language of the input text.
        
        Args:
            text: Input text
            
        Returns:
            Dict with language code and name
        """
        try:
            if not text or len(text.strip()) < 10:
                return {
                    "language_code": "unknown",
                    "language_name": "Unknown",
                    "confidence": "low",
                    "text_length": len(text.strip())
                }
            
            lang_code = detect(text)
            lang_name = self.LANGUAGE_NAMES.get(lang_code, lang_code.upper())
            
            logger.info(f"Detected language: {lang_name} ({lang_code})")
            
            return {
                "language_code": lang_code,
                "language_name": lang_name,
                "confidence": "high",
                "text_length": len(text.strip())
            }
            
        except LangDetectException as e:
            logger.warning(f"Language detection failed: {str(e)}")
            return {
                "language_code": "unknown",
                "language_name": "Unknown",
                "confidence": "low",
                "error": str(e),
                "text_length": len(text.strip())
            }
    
    def translate_to_english(self, text: str, source_language: Optional[str] = None) -> Dict[str, Any]:
        """
        Translate text to English using Google Gemini API.
        
        Args:
            text: Text to translate
            source_language: Optional source language code
            
        Returns:
            Dict with translated text and metadata
        """
        if not self.has_translation:
            return {
                "translated_text": text,
                "original_text": text,
                "source_language": source_language or "unknown",
                "target_language": "en",
                "method": "no_translation",
                "error": "Translation not available (API key not configured)"
            }
        
        try:
            # Detect language if not provided
            if not source_language:
                lang_info = self.detect_language(text)
                source_language = lang_info["language_code"]
            
            # If already in English, return as is
            if source_language == "en":
                logger.info("Text is already in English, skipping translation")
                return {
                    "translated_text": text,
                    "original_text": text,
                    "source_language": "en",
                    "target_language": "en",
                    "method": "no_translation_needed"
                }
            
            # Translate using Gemini
            logger.info(f"Translating from {source_language} to English...")
            
            prompt = f"""Translate the following text from {self.LANGUAGE_NAMES.get(source_language, source_language)} to English. 
Maintain the original meaning and context, especially for legal terminology.
Only provide the translation, no explanations.

Text to translate:
{text}"""
            
            response = self.model.generate_content(prompt)
            translated_text = response.text.strip()
            
            logger.info(f"Translation completed. Original: {len(text)} chars, Translated: {len(translated_text)} chars")
            
            return {
                "translated_text": translated_text,
                "original_text": text,
                "source_language": source_language,
                "target_language": "en",
                "method": "gemini_api",
                "original_length": len(text),
                "translated_length": len(translated_text)
            }
            
        except Exception as e:
            logger.error(f"Translation error: {str(e)}")
            return {
                "translated_text": text,
                "original_text": text,
                "source_language": source_language or "unknown",
                "target_language": "en",
                "method": "error",
                "error": str(e)
            }
    
    def clean_text(self, text: str) -> Dict[str, Any]:
        """
        Clean and normalize text.
        
        Args:
            text: Text to clean
            
        Returns:
            Dict with cleaned text and metadata
        """
        try:
            original_text = text
            original_length = len(text)
            
            # Remove extra whitespace
            text = re.sub(r'\s+', ' ', text)
            
            # Remove special characters but keep legal punctuation
            # Keep: periods, commas, semicolons, colons, hyphens, parentheses, quotes
            text = re.sub(r'[^\w\s.,;:()\-"\'/]', '', text)
            
            # Normalize quotes
            text = text.replace('"', '"').replace('"', '"')
            text = text.replace(''', "'").replace(''', "'")
            
            # Remove multiple periods
            text = re.sub(r'\.{2,}', '.', text)
            
            # Remove leading/trailing whitespace
            text = text.strip()
            
            # Normalize line breaks
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            cleaned_length = len(text)
            reduction_percent = ((original_length - cleaned_length) / original_length * 100) if original_length > 0 else 0
            
            logger.info(f"Text cleaned. Original: {original_length} chars, Cleaned: {cleaned_length} chars ({reduction_percent:.1f}% reduction)")
            
            return {
                "cleaned_text": text,
                "original_text": original_text,
                "original_length": original_length,
                "cleaned_length": cleaned_length,
                "reduction_percent": round(reduction_percent, 2),
                "operations": [
                    "whitespace_normalization",
                    "special_char_removal",
                    "quote_normalization",
                    "line_break_normalization"
                ]
            }
            
        except Exception as e:
            logger.error(f"Text cleaning error: {str(e)}")
            return {
                "cleaned_text": text,
                "original_text": text,
                "error": str(e)
            }
    
    def preprocess(self, text: str, translate: bool = True, clean: bool = True) -> Dict[str, Any]:
        """
        Full preprocessing pipeline: detect language, translate, and clean.
        
        Args:
            text: Input text
            translate: Whether to translate to English
            clean: Whether to clean the text
            
        Returns:
            Dict with all preprocessing results
        """
        result = {
            "original_text": text,
            "processed_text": text,
            "steps": []
        }
        
        # Step 1: Language detection
        lang_info = self.detect_language(text)
        result["language_detection"] = lang_info
        result["steps"].append("language_detection")
        
        # Step 2: Translation (if needed and requested)
        if translate and lang_info["language_code"] != "en":
            translation_result = self.translate_to_english(text, lang_info["language_code"])
            result["translation"] = translation_result
            result["processed_text"] = translation_result["translated_text"]
            result["steps"].append("translation")
        else:
            result["translation"] = {"method": "skipped", "reason": "already_english" if lang_info["language_code"] == "en" else "not_requested"}
        
        # Step 3: Text cleaning (if requested)
        if clean:
            cleaning_result = self.clean_text(result["processed_text"])
            result["cleaning"] = cleaning_result
            result["processed_text"] = cleaning_result["cleaned_text"]
            result["steps"].append("cleaning")
        else:
            result["cleaning"] = {"method": "skipped"}
        
        result["final_length"] = len(result["processed_text"])
        
        return result


# Global instance
text_preprocessor = TextPreprocessor()


if __name__ == "__main__":
    # Test the text preprocessor
    print("Text Preprocessor Test")
    print("=" * 50)
    
    # Test with English text
    test_text = "This is a legal document with some    extra   spaces."
    result = text_preprocessor.preprocess(test_text)
    print(f"Original: {result['original_text']}")
    print(f"Processed: {result['processed_text']}")
    print(f"Steps: {result['steps']}")
