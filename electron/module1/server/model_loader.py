"""
Model Loader for Legal AI Models

This module handles downloading and loading legal AI models from HuggingFace.
Models are stored locally in ./models/ directory for offline usage.
"""

import os
from pathlib import Path
from typing import List, Dict, Optional
from transformers import AutoTokenizer, AutoModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define the models directory
MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# Legal AI models to download
# Note: Using verified legal BERT models from HuggingFace
LEGAL_MODELS = [
    "nlpaueb/legal-bert-base-uncased",  # Legal-BERT trained on legal documents
    "law-ai/InLegalBERT",  # Indian Legal BERT
    "zlucia/custom-legalbert"  # Custom Legal BERT variant
]


class ModelLoader:
    """Handles downloading and loading legal AI models."""
    
    def __init__(self, models_dir: Optional[Path] = None):
        """
        Initialize the ModelLoader.
        
        Args:
            models_dir: Directory to store models. Defaults to ./models/
        """
        self.models_dir = models_dir or MODELS_DIR
        self.models_dir.mkdir(exist_ok=True)
        self.downloaded_models: List[str] = []
        
    def get_model_path(self, model_name: str) -> Path:
        """
        Get the local path for a model.
        
        Args:
            model_name: HuggingFace model identifier (e.g., 'law-ai/LegalBERT')
            
        Returns:
            Path object for the model directory
        """
        # Convert model name to safe directory name
        safe_name = model_name.replace("/", "_")
        return self.models_dir / safe_name
    
    def is_model_downloaded(self, model_name: str) -> bool:
        """
        Check if a model is already downloaded.
        
        Args:
            model_name: HuggingFace model identifier
            
        Returns:
            True if model exists locally, False otherwise
        """
        model_path = self.get_model_path(model_name)
        return model_path.exists() and any(model_path.iterdir())
    
    def download_model(self, model_name: str) -> Dict[str, any]:
        """
        Download a single model from HuggingFace.
        
        Args:
            model_name: HuggingFace model identifier
            
        Returns:
            Dictionary with download status and information
        """
        try:
            model_path = self.get_model_path(model_name)
            
            # Check if already downloaded
            if self.is_model_downloaded(model_name):
                logger.info(f"Model {model_name} already exists at {model_path}")
                return {
                    "model": model_name,
                    "status": "already_exists",
                    "path": str(model_path),
                    "message": "Model already downloaded"
                }
            
            logger.info(f"Downloading model: {model_name}")
            
            # Download tokenizer
            logger.info(f"Downloading tokenizer for {model_name}...")
            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir=str(model_path)
            )
            
            # Download model
            logger.info(f"Downloading model weights for {model_name}...")
            model = AutoModel.from_pretrained(
                model_name,
                cache_dir=str(model_path)
            )
            
            logger.info(f"Successfully downloaded {model_name}")
            self.downloaded_models.append(model_name)
            
            return {
                "model": model_name,
                "status": "success",
                "path": str(model_path),
                "message": "Model downloaded successfully",
                "tokenizer_vocab_size": len(tokenizer) if tokenizer else None,
                "model_config": str(model.config) if model else None
            }
            
        except Exception as e:
            logger.error(f"Error downloading {model_name}: {str(e)}")
            return {
                "model": model_name,
                "status": "error",
                "path": str(model_path),
                "message": f"Error: {str(e)}"
            }
    
    def download_all_models(self) -> List[Dict[str, any]]:
        """
        Download all legal AI models.
        
        Returns:
            List of dictionaries with download status for each model
        """
        results = []
        logger.info(f"Starting download of {len(LEGAL_MODELS)} legal AI models...")
        
        for model_name in LEGAL_MODELS:
            result = self.download_model(model_name)
            results.append(result)
        
        logger.info("Model download process completed")
        return results
    
    def list_downloaded_models(self) -> List[Dict[str, str]]:
        """
        List all downloaded models.
        
        Returns:
            List of dictionaries with model information
        """
        models = []
        
        for model_name in LEGAL_MODELS:
            model_path = self.get_model_path(model_name)
            if self.is_model_downloaded(model_name):
                # Get directory size
                total_size = sum(
                    f.stat().st_size 
                    for f in model_path.rglob('*') 
                    if f.is_file()
                )
                size_mb = total_size / (1024 * 1024)
                
                models.append({
                    "model": model_name,
                    "path": str(model_path),
                    "size_mb": round(size_mb, 2),
                    "status": "downloaded"
                })
        
        return models
    
    def load_model(self, model_name: str):
        """
        Load a downloaded model for inference.
        
        Args:
            model_name: HuggingFace model identifier
            
        Returns:
            Tuple of (tokenizer, model) or (None, None) if not found
        """
        if not self.is_model_downloaded(model_name):
            logger.error(f"Model {model_name} not found. Please download it first.")
            return None, None
        
        try:
            logger.info(f"Loading model {model_name} from HuggingFace cache")
            
            # Load directly from HuggingFace identifier - it will use the cache
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModel.from_pretrained(model_name)
            
            logger.info(f"Successfully loaded {model_name}")
            return tokenizer, model
            
        except Exception as e:
            logger.error(f"Error loading {model_name}: {str(e)}")
            return None, None


# Global instance
model_loader = ModelLoader()


if __name__ == "__main__":
    # Test the model loader
    print("Legal AI Model Loader")
    print("=" * 50)
    
    # List current models
    print("\nCurrently downloaded models:")
    downloaded = model_loader.list_downloaded_models()
    if downloaded:
        for model in downloaded:
            print(f"  - {model['model']} ({model['size_mb']} MB)")
    else:
        print("  No models downloaded yet")
    
    # Download all models
    print("\nDownloading legal AI models...")
    results = model_loader.download_all_models()
    
    print("\nDownload Results:")
    for result in results:
        print(f"  - {result['model']}: {result['status']}")
