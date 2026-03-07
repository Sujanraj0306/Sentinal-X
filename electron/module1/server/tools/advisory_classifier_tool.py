"""
Advisory Domain Classifier Tool

Classifies pre-litigation advisory cases into specific legal domains.
Uses semantic similarity with predefined domain descriptions.
"""

import logging
from typing import Dict, Any, List
from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)


class AdvisoryClassifier:
    """Classifier for pre-litigation advisory cases."""
    
    def __init__(self):
        """Initialize the advisory classifier."""
        logger.info("Initializing Advisory Classifier...")
        
        # Load sentence transformer model
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        
        # Define advisory domains with descriptions
        self.domains = {
            "Property": [
                "property purchase sale land building real estate",
                "property title deed registration ownership",
                "property dispute boundary encroachment",
                "property tax assessment valuation",
                "rental lease agreement landlord tenant"
            ],
            "Immigration": [
                "visa application work permit residence",
                "citizenship naturalization permanent residence PR",
                "immigration status deportation asylum",
                "travel documents passport verification",
                "immigration compliance sponsorship"
            ],
            "Business": [
                "business registration incorporation company formation",
                "business license permit compliance",
                "partnership agreement shareholder rights",
                "business tax GST compliance",
                "business closure dissolution winding up"
            ],
            "Contract": [
                "contract drafting review vetting",
                "contract terms conditions obligations",
                "contract breach violation remedy",
                "contract negotiation amendment",
                "contract termination cancellation"
            ],
            "Employment": [
                "employment contract offer letter",
                "employment termination resignation severance",
                "employment discrimination harassment",
                "employment benefits salary compensation",
                "employment dispute grievance"
            ],
            "Family": [
                "marriage registration divorce separation",
                "child custody guardianship adoption",
                "inheritance will succession estate",
                "family property division settlement",
                "domestic violence protection order"
            ],
            "Tax": [
                "tax filing return assessment",
                "tax compliance GST income tax",
                "tax dispute notice appeal",
                "tax planning optimization",
                "tax penalty interest waiver"
            ]
        }
        
        # Pre-compute embeddings for domain descriptions
        self.domain_embeddings = {}
        for domain, descriptions in self.domains.items():
            combined_desc = " ".join(descriptions)
            embedding = self.model.encode(combined_desc)
            self.domain_embeddings[domain] = embedding
        
        logger.info(f"Advisory Classifier initialized with {len(self.domains)} domains")
    
    def classify_advisory(self, text: str) -> Dict[str, Any]:
        """
        Classify advisory case into a domain.
        
        Args:
            text: Client objective and background details
            
        Returns:
            Dict with domain, confidence, and all predictions
        """
        try:
            logger.info("Classifying advisory case...")
            
            # Encode the input text
            text_embedding = self.model.encode(text)
            
            # Calculate similarity with each domain
            similarities = {}
            for domain, domain_embedding in self.domain_embeddings.items():
                similarity = self._cosine_similarity(text_embedding, domain_embedding)
                similarities[domain] = float(similarity)
            
            # Sort by similarity
            sorted_domains = sorted(similarities.items(), key=lambda x: x[1], reverse=True)
            
            # Get top domain
            primary_domain = sorted_domains[0][0]
            confidence = sorted_domains[0][1]
            
            # Get secondary domains (if confidence > 0.5)
            secondary_domains = [
                domain for domain, score in sorted_domains[1:4]
                if score > 0.5
            ]
            
            result = {
                "domain": primary_domain,
                "confidence": confidence,
                "secondary_domains": secondary_domains,
                "all_predictions": [
                    {"domain": domain, "confidence": score}
                    for domain, score in sorted_domains
                ]
            }
            
            logger.info(f"Advisory classified as: {primary_domain} (confidence: {confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Advisory classification error: {str(e)}")
            return {
                "domain": "General",
                "confidence": 0.0,
                "secondary_domains": [],
                "all_predictions": [],
                "error": str(e)
            }
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors."""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        return dot_product / (norm1 * norm2)


# Global instance
advisory_classifier = AdvisoryClassifier()
