"""
Evidence Extractor Tool for Legal Case Analysis

Extracts evidence from legal text including:
- Witnesses (people mentioned)
- Documents (evidence documents)
- Dates and times
- Locations
- Monetary amounts
- Other entities
"""

import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import spacy

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EvidenceExtractor:
    """Extracts evidence from legal text using spaCy NER and regex."""
    
    # Witness keywords
    WITNESS_KEYWORDS = [
        "witness", "witnesses", "saw", "observed", "testified",
        "deposed", "stated", "declared", "affirmed", "confirmed",
        "complainant", "informant", "victim", "accused"
    ]
    
    # Document keywords
    DOCUMENT_KEYWORDS = [
        "document", "documents", "evidence", "proof", "certificate",
        "receipt", "invoice", "contract", "agreement", "deed",
        "statement", "affidavit", "report", "record", "file",
        "email", "letter", "message", "sms", "whatsapp",
        "photograph", "photo", "video", "cctv", "recording"
    ]
    
    def __init__(self):
        """Initialize the EvidenceExtractor."""
        self.nlp = None
        self.load_model()
    
    def load_model(self):
        """Load spaCy model."""
        try:
            logger.info("Loading spaCy model...")
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading spaCy model: {str(e)}")
            logger.info("Please run: python -m spacy download en_core_web_sm")
    
    def extract_witnesses(self, text: str, doc: Optional[spacy.tokens.Doc] = None) -> List[Dict[str, Any]]:
        """
        Extract witnesses from text.
        
        Args:
            text: Input text
            doc: Optional pre-processed spaCy doc
            
        Returns:
            List of witnesses with context
        """
        witnesses = []
        
        if doc is None and self.nlp:
            doc = self.nlp(text)
        
        if doc is None:
            return witnesses
        
        # Extract persons mentioned with witness keywords
        text_lower = text.lower()
        
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                # Get context around the person
                start_idx = max(0, ent.start_char - 50)
                end_idx = min(len(text), ent.end_char + 50)
                context = text[start_idx:end_idx].strip()
                
                # Check if mentioned with witness keywords
                is_witness = False
                witness_type = "person"
                
                for keyword in self.WITNESS_KEYWORDS:
                    if keyword in context.lower():
                        is_witness = True
                        witness_type = keyword
                        break
                
                witnesses.append({
                    "name": ent.text,
                    "type": witness_type,
                    "is_witness": is_witness,
                    "context": context,
                    "position": {"start": ent.start_char, "end": ent.end_char}
                })
        
        logger.info(f"Extracted {len(witnesses)} potential witnesses")
        return witnesses
    
    def extract_documents(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract documents/evidence mentioned in text.
        
        Args:
            text: Input text
            
        Returns:
            List of documents
        """
        documents = []
        text_lower = text.lower()
        
        # Pattern for document references
        patterns = [
            r'(?:document|evidence|exhibit)\s+(?:no\.?|number)?\s*([A-Z0-9\-/]+)',
            r'(?:receipt|invoice|bill)\s+(?:no\.?|number)?\s*([A-Z0-9\-/]+)',
            r'(?:email|letter)\s+dated\s+([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4})',
            r'(CCTV\s+footage|video\s+recording|photograph)',
            r'(WhatsApp\s+chat|SMS|text\s+message)',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Get context
                start_idx = max(0, match.start() - 50)
                end_idx = min(len(text), match.end() + 50)
                context = text[start_idx:end_idx].strip()
                
                documents.append({
                    "reference": match.group(0),
                    "type": "document",
                    "context": context,
                    "position": {"start": match.start(), "end": match.end()}
                })
        
        # Also check for general document keywords
        for keyword in self.DOCUMENT_KEYWORDS:
            pattern = rf'\b{keyword}s?\b'
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Get context
                start_idx = max(0, match.start() - 50)
                end_idx = min(len(text), match.end() + 50)
                context = text[start_idx:end_idx].strip()
                
                # Avoid duplicates
                if not any(d["reference"] == match.group(0) for d in documents):
                    documents.append({
                        "reference": match.group(0),
                        "type": keyword,
                        "context": context,
                        "position": {"start": match.start(), "end": match.end()}
                    })
        
        logger.info(f"Extracted {len(documents)} document references")
        return documents
    
    def extract_dates(self, text: str, doc: Optional[spacy.tokens.Doc] = None) -> List[Dict[str, Any]]:
        """
        Extract dates from text.
        
        Args:
            text: Input text
            doc: Optional pre-processed spaCy doc
            
        Returns:
            List of dates
        """
        dates = []
        
        if doc is None and self.nlp:
            doc = self.nlp(text)
        
        # Extract DATE entities from spaCy
        if doc:
            for ent in doc.ents:
                if ent.label_ == "DATE":
                    # Get context
                    start_idx = max(0, ent.start_char - 50)
                    end_idx = min(len(text), ent.end_char + 50)
                    context = text[start_idx:end_idx].strip()
                    
                    dates.append({
                        "date": ent.text,
                        "type": "date",
                        "context": context,
                        "position": {"start": ent.start_char, "end": ent.end_char}
                    })
        
        # Also use regex for common date formats
        date_patterns = [
            r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # DD/MM/YYYY or DD-MM-YYYY
            r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',    # YYYY/MM/DD
            r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b',  # Month DD, YYYY
        ]
        
        for pattern in date_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Avoid duplicates
                if not any(d["date"] == match.group(0) for d in dates):
                    # Get context
                    start_idx = max(0, match.start() - 50)
                    end_idx = min(len(text), match.end() + 50)
                    context = text[start_idx:end_idx].strip()
                    
                    dates.append({
                        "date": match.group(0),
                        "type": "date",
                        "context": context,
                        "position": {"start": match.start(), "end": match.end()}
                    })
        
        logger.info(f"Extracted {len(dates)} dates")
        return dates
    
    def extract_locations(self, text: str, doc: Optional[spacy.tokens.Doc] = None) -> List[Dict[str, Any]]:
        """
        Extract locations from text.
        
        Args:
            text: Input text
            doc: Optional pre-processed spaCy doc
            
        Returns:
            List of locations
        """
        locations = []
        
        if doc is None and self.nlp:
            doc = self.nlp(text)
        
        if doc:
            for ent in doc.ents:
                if ent.label_ in ["GPE", "LOC", "FAC"]:  # Geo-political entity, Location, Facility
                    # Get context
                    start_idx = max(0, ent.start_char - 50)
                    end_idx = min(len(text), ent.end_char + 50)
                    context = text[start_idx:end_idx].strip()
                    
                    locations.append({
                        "location": ent.text,
                        "type": ent.label_.lower(),
                        "context": context,
                        "position": {"start": ent.start_char, "end": ent.end_char}
                    })
        
        logger.info(f"Extracted {len(locations)} locations")
        return locations
    
    def extract_money(self, text: str, doc: Optional[spacy.tokens.Doc] = None) -> List[Dict[str, Any]]:
        """
        Extract monetary amounts from text.
        
        Args:
            text: Input text
            doc: Optional pre-processed spaCy doc
            
        Returns:
            List of monetary amounts
        """
        amounts = []
        
        if doc is None and self.nlp:
            doc = self.nlp(text)
        
        # Extract MONEY entities from spaCy
        if doc:
            for ent in doc.ents:
                if ent.label_ == "MONEY":
                    # Get context
                    start_idx = max(0, ent.start_char - 50)
                    end_idx = min(len(text), ent.end_char + 50)
                    context = text[start_idx:end_idx].strip()
                    
                    amounts.append({
                        "amount": ent.text,
                        "type": "money",
                        "context": context,
                        "position": {"start": ent.start_char, "end": ent.end_char}
                    })
        
        # Also use regex for Indian currency
        money_patterns = [
            r'Rs\.?\s*\d+(?:,\d+)*(?:\.\d+)?',  # Rs. 1,000 or Rs 1000
            r'INR\s*\d+(?:,\d+)*(?:\.\d+)?',    # INR 1000
            r'₹\s*\d+(?:,\d+)*(?:\.\d+)?',      # ₹1000
        ]
        
        for pattern in money_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                # Avoid duplicates
                if not any(a["amount"] == match.group(0) for a in amounts):
                    # Get context
                    start_idx = max(0, match.start() - 50)
                    end_idx = min(len(text), match.end() + 50)
                    context = text[start_idx:end_idx].strip()
                    
                    amounts.append({
                        "amount": match.group(0),
                        "type": "money",
                        "context": context,
                        "position": {"start": match.start(), "end": match.end()}
                    })
        
        logger.info(f"Extracted {len(amounts)} monetary amounts")
        return amounts
    
    def extract_evidence(self, text: str) -> Dict[str, Any]:
        """
        Extract all evidence from text.
        
        Args:
            text: Input text
            
        Returns:
            Dict with all extracted evidence
        """
        try:
            logger.info(f"Extracting evidence from text ({len(text)} chars)")
            
            # Process text with spaCy once
            doc = None
            if self.nlp:
                doc = self.nlp(text)
            
            # Extract all types of evidence
            witnesses = self.extract_witnesses(text, doc)
            documents = self.extract_documents(text)
            dates = self.extract_dates(text, doc)
            locations = self.extract_locations(text, doc)
            money = self.extract_money(text, doc)
            
            result = {
                "witnesses": witnesses,
                "documents": documents,
                "dates": dates,
                "locations": locations,
                "money": money,
                "summary": {
                    "total_witnesses": len(witnesses),
                    "confirmed_witnesses": len([w for w in witnesses if w["is_witness"]]),
                    "total_documents": len(documents),
                    "total_dates": len(dates),
                    "total_locations": len(locations),
                    "total_money": len(money),
                    "text_length": len(text)
                }
            }
            
            logger.info(f"Evidence extraction complete: {result['summary']}")
            
            return result
            
        except Exception as e:
            logger.error(f"Evidence extraction error: {str(e)}")
            return {
                "witnesses": [],
                "documents": [],
                "dates": [],
                "locations": [],
                "money": [],
                "error": str(e)
            }


# Global instance
evidence_extractor = EvidenceExtractor()


if __name__ == "__main__":
    # Test the evidence extractor
    print("Evidence Extractor Test")
    print("=" * 50)
    
    test_text = """
    Witness Ramesh saw the incident on 25th January 2024 at MG Road, Bangalore.
    The accused stole Rs. 50,000 from the victim. CCTV footage is available as evidence.
    Another witness, Priya Kumar, testified that she saw the accused near the crime scene.
    """
    
    result = evidence_extractor.extract_evidence(test_text)
    
    print(f"\nWitnesses: {len(result['witnesses'])}")
    for w in result['witnesses']:
        print(f"  - {w['name']} ({w['type']})")
    
    print(f"\nDocuments: {len(result['documents'])}")
    for d in result['documents'][:3]:
        print(f"  - {d['reference']}")
    
    print(f"\nDates: {len(result['dates'])}")
    for d in result['dates']:
        print(f"  - {d['date']}")
    
    print(f"\nLocations: {len(result['locations'])}")
    for l in result['locations']:
        print(f"  - {l['location']}")
    
    print(f"\nMoney: {len(result['money'])}")
    for m in result['money']:
        print(f"  - {m['amount']}")
