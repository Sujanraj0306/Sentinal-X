"""
Knowledge Base Loader

Loads advisory knowledge documents into ChromaDB collections.
Run this script to populate the RAG system with legal knowledge.
"""

import os
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rag_manager import rag_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_knowledge_base():
    """Load all knowledge base documents into RAG collections."""
    
    knowledge_dir = Path(__file__).parent / "data" / "advisory_knowledge"
    
    if not knowledge_dir.exists():
        logger.error(f"Knowledge directory not found: {knowledge_dir}")
        return
    
    # Mapping of files to domains
    file_domain_map = {
        "property_laws.txt": "Property",
        "business_compliance.txt": "Business",
        "immigration_rules.txt": "Immigration",
        "contract_templates.txt": "Contract",
        "employment_law.txt": "Employment",
        "family_law.txt": "Family",
        "tax_regulations.txt": "Tax"
    }
    
    logger.info("Starting knowledge base ingestion...")
    
    for filename, domain in file_domain_map.items():
        filepath = knowledge_dir / filename
        
        if not filepath.exists():
            logger.warning(f"File not found: {filepath}, skipping...")
            continue
        
        try:
            logger.info(f"Loading {filename} into {domain} collection...")
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            metadata = {
                "source": filename,
                "domain": domain,
                "type": "legal_knowledge"
            }
            
            success = rag_manager.ingest_document(domain, content, metadata)
            
            if success:
                logger.info(f"✓ Successfully loaded {filename}")
            else:
                logger.error(f"✗ Failed to load {filename}")
                
        except Exception as e:
            logger.error(f"Error loading {filename}: {str(e)}")
    
    # Print statistics
    logger.info("\n" + "=" * 60)
    logger.info("Knowledge Base Statistics:")
    logger.info("=" * 60)
    
    stats = rag_manager.get_collection_stats()
    for domain, stat in stats.items():
        if "error" in stat:
            logger.info(f"{domain}: Error - {stat['error']}")
        else:
            logger.info(f"{domain}: {stat['document_count']} chunks")
    
    logger.info("=" * 60)
    logger.info("Knowledge base ingestion complete!")


if __name__ == "__main__":
    load_knowledge_base()
