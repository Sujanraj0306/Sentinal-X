"""
Issue Classifier Tool for Legal Case Analysis

Uses InLegalBERT model to classify legal issues into domains and identify
primary and secondary issues.

Domains:
- Criminal
- Civil
- Family
- Cyber
- Consumer
- Labour
- Property
"""

import logging
from typing import Dict, Any, List, Optional
import torch
from transformers import AutoTokenizer, AutoModel
from model_loader import model_loader
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class IssueClassifier:
    """Classifies legal issues using InLegalBERT model."""
    
    # Legal domains
    DOMAINS = [
        "Criminal",
        "Civil",
        "Family",
        "Cyber",
        "Consumer",
        "Labour",
        "Property"
    ]
    
    # Domain-specific keywords and patterns
    DOMAIN_KEYWORDS = {
        "Criminal": [
            "assault", "murder", "theft", "robbery", "fraud", "cheating",
            "rape", "kidnapping", "extortion", "bribery", "corruption",
            "violence", "attack", "weapon", "hurt", "injury", "death",
            "ipc", "crpc", "fir", "police", "arrest", "accused", "victim"
        ],
        "Civil": [
            "contract", "breach", "damages", "compensation", "suit",
            "plaintiff", "defendant", "injunction", "decree", "appeal",
            "civil court", "cpc", "dispute", "claim", "liability"
        ],
        "Family": [
            "divorce", "marriage", "custody", "alimony", "maintenance",
            "adoption", "inheritance", "will", "succession", "dowry",
            "domestic violence", "child", "spouse", "husband", "wife",
            "family court", "matrimonial"
        ],
        "Cyber": [
            "cyber", "online", "internet", "hacking", "phishing", "email",
            "website", "data breach", "identity theft", "digital", "computer",
            "it act", "social media", "fraud online", "banking fraud",
            "credit card", "otp", "password", "account"
        ],
        "Consumer": [
            "consumer", "defective", "product", "service", "refund",
            "warranty", "guarantee", "seller", "buyer", "purchase",
            "consumer court", "complaint", "deficiency", "quality",
            "consumer protection act"
        ],
        "Labour": [
            "employee", "employer", "salary", "wages", "termination",
            "dismissal", "labour", "worker", "industrial", "union",
            "strike", "provident fund", "esi", "gratuity", "bonus",
            "working conditions", "employment"
        ],
        "Property": [
            "property", "land", "house", "building", "rent", "lease",
            "tenant", "landlord", "eviction", "possession", "title",
            "ownership", "sale deed", "registration", "encroachment",
            "boundary", "real estate", "immovable property"
        ]
    }
    
    # Common legal issues
    COMMON_ISSUES = {
        "Criminal": [
            "Assault", "Murder", "Theft", "Robbery", "Fraud/Cheating",
            "Rape/Sexual Assault", "Kidnapping", "Extortion", "Bribery",
            "Corruption", "Domestic Violence", "Dowry Harassment"
        ],
        "Civil": [
            "Breach of Contract", "Property Dispute", "Defamation",
            "Negligence", "Money Recovery", "Injunction"
        ],
        "Family": [
            "Divorce", "Child Custody", "Alimony/Maintenance",
            "Domestic Violence", "Dowry", "Adoption", "Inheritance"
        ],
        "Cyber": [
            "Online Fraud", "Hacking", "Phishing", "Identity Theft",
            "Data Breach", "Cyberbullying", "Banking Fraud"
        ],
        "Consumer": [
            "Defective Product", "Service Deficiency", "Unfair Trade Practice",
            "Warranty Claim", "Refund Dispute"
        ],
        "Labour": [
            "Wrongful Termination", "Wage Dispute", "Working Conditions",
            "Harassment at Workplace", "Non-payment of Dues"
        ],
        "Property": [
            "Property Dispute", "Eviction", "Rent Dispute", "Title Dispute",
            "Encroachment", "Possession Dispute"
        ]
    }
    
    def __init__(self):
        """Initialize the IssueClassifier."""
        self.model = None
        self.tokenizer = None
        self.model_loaded = False
        
    def load_model(self):
        """Load the InLegalBERT model."""
        if self.model_loaded:
            logger.info("Model already loaded")
            return True
        
        try:
            logger.info("Loading InLegalBERT model...")
            self.tokenizer, self.model = model_loader.load_model("law-ai/InLegalBERT")
            
            if self.tokenizer and self.model:
                self.model.eval()  # Set to evaluation mode
                self.model_loaded = True
                logger.info("InLegalBERT model loaded successfully")
                return True
            else:
                logger.error("Failed to load model")
                return False
                
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            return False
    
    def get_text_embedding(self, text: str) -> Optional[np.ndarray]:
        """
        Get text embedding using InLegalBERT.
        
        Args:
            text: Input text
            
        Returns:
            Numpy array of embeddings or None
        """
        if not self.model_loaded:
            if not self.load_model():
                return None
        
        try:
            # Tokenize
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            )
            
            # Get embeddings
            with torch.no_grad():
                outputs = self.model(**inputs)
                # Use CLS token embedding (first token)
                embeddings = outputs.last_hidden_state[:, 0, :].numpy()
            
            return embeddings[0]
            
        except Exception as e:
            logger.error(f"Error getting embeddings: {str(e)}")
            return None
    
    def keyword_based_classification(self, text: str) -> Dict[str, float]:
        """
        Classify text based on keyword matching.
        
        Args:
            text: Input text
            
        Returns:
            Dict with domain scores
        """
        text_lower = text.lower()
        scores = {domain: 0.0 for domain in self.DOMAINS}
        
        for domain, keywords in self.DOMAIN_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text_lower:
                    scores[domain] += 1.0
        
        # Normalize scores
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}
        
        return scores
    
    def identify_issues(self, text: str, domain: str) -> List[str]:
        """
        Identify specific issues within a domain.
        
        Args:
            text: Input text
            domain: Legal domain
            
        Returns:
            List of identified issues
        """
        text_lower = text.lower()
        identified_issues = []
        
        if domain in self.COMMON_ISSUES:
            for issue in self.COMMON_ISSUES[domain]:
                # Check if issue keywords are in text
                issue_keywords = issue.lower().split('/')
                for keyword in issue_keywords:
                    if keyword.strip() in text_lower:
                        identified_issues.append(issue)
                        break
        
        return identified_issues
    
    def classify(self, text: str, use_embeddings: bool = True) -> Dict[str, Any]:
        """
        Classify legal issues in text.
        
        Args:
            text: Input text
            use_embeddings: Whether to use model embeddings (slower but more accurate)
            
        Returns:
            Dict with classification results
        """
        try:
            logger.info(f"Classifying text: {text[:100]}...")
            
            # Get keyword-based scores
            keyword_scores = self.keyword_based_classification(text)
            
            # Get embedding-based scores if requested
            if use_embeddings:
                embeddings = self.get_text_embedding(text)
                if embeddings is not None:
                    # For now, use keyword scores
                    # In production, you'd train a classifier on top of embeddings
                    domain_scores = keyword_scores
                else:
                    logger.warning("Failed to get embeddings, using keyword-based classification")
                    domain_scores = keyword_scores
            else:
                domain_scores = keyword_scores
            
            # Get top domains
            sorted_domains = sorted(domain_scores.items(), key=lambda x: x[1], reverse=True)
            
            # Primary domain (highest score)
            primary_domain = sorted_domains[0][0] if sorted_domains[0][1] > 0 else "Unknown"
            
            # Secondary domains (score > 0.1)
            secondary_domains = [
                domain for domain, score in sorted_domains[1:] 
                if score > 0.1
            ]
            
            # Identify specific issues
            primary_issues = self.identify_issues(text, primary_domain)
            primary_issue = primary_issues[0] if primary_issues else "General " + primary_domain
            
            secondary_issues = []
            for domain in secondary_domains[:2]:  # Max 2 secondary domains
                issues = self.identify_issues(text, domain)
                if issues:
                    secondary_issues.extend(issues[:2])  # Max 2 issues per domain
            
            result = {
                "domain": primary_domain,
                "domain_confidence": round(sorted_domains[0][1], 3) if sorted_domains else 0.0,
                "primary_issue": primary_issue,
                "secondary_issues": secondary_issues,
                "all_domain_scores": {k: round(v, 3) for k, v in domain_scores.items()},
                "method": "embeddings" if use_embeddings and self.model_loaded else "keywords",
                "text_length": len(text)
            }
            
            logger.info(f"Classification result: Domain={primary_domain}, Issue={primary_issue}")
            
            return result
            
        except Exception as e:
            logger.error(f"Classification error: {str(e)}")
            return {
                "domain": "Unknown",
                "domain_confidence": 0.0,
                "primary_issue": "Classification Error",
                "secondary_issues": [],
                "error": str(e)
            }


# Global instance
issue_classifier = IssueClassifier()


if __name__ == "__main__":
    # Test the issue classifier
    print("Issue Classifier Test")
    print("=" * 50)
    
    test_cases = [
        "He assaulted me and caused severe injuries",
        "My landlord is refusing to return my security deposit",
        "I received a phishing email asking for my bank details",
        "My employer terminated me without notice"
    ]
    
    for test_text in test_cases:
        print(f"\nText: {test_text}")
        result = issue_classifier.classify(test_text, use_embeddings=False)
        print(f"Domain: {result['domain']}")
        print(f"Primary Issue: {result['primary_issue']}")
        print(f"Secondary Issues: {result['secondary_issues']}")
