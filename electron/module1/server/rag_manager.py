"""
RAG (Retrieval-Augmented Generation) Manager

Manages ChromaDB collections for advisory legal knowledge.
Provides document ingestion and retrieval capabilities.
"""

import logging
import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class RAGManager:
    """Manages RAG collections for advisory legal knowledge."""
    
    def __init__(self, persist_directory: str = "./chroma_advisory_db"):
        """
        Initialize RAG Manager.
        
        Args:
            persist_directory: Directory to persist ChromaDB data
        """
        logger.info("Initializing RAG Manager...")
        
        self.persist_directory = persist_directory
        
        # Initialize ChromaDB client
        self.client = chromadb.Client(Settings(
            persist_directory=persist_directory,
            anonymized_telemetry=False
        ))
        
        # Initialize sentence transformer for embeddings
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        
        # Define collection names for each advisory domain
        self.collection_names = {
            "Property": "property_laws",
            "Immigration": "immigration_rules",
            "Business": "business_compliance",
            "Contract": "contract_templates",
            "Employment": "employment_law",
            "Family": "family_law",
            "Tax": "tax_regulations"
        }
        
        # Initialize collections
        self.collections = {}
        for domain, collection_name in self.collection_names.items():
            try:
                self.collections[domain] = self.client.get_or_create_collection(
                    name=collection_name,
                    metadata={"domain": domain}
                )
                logger.info(f"Collection '{collection_name}' ready")
            except Exception as e:
                logger.error(f"Error creating collection {collection_name}: {e}")
        
        logger.info(f"RAG Manager initialized with {len(self.collections)} collections")
    
    def ingest_document(self, domain: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Ingest a document into the appropriate collection.
        
        Args:
            domain: Advisory domain (Property, Immigration, etc.)
            text: Document text content
            metadata: Optional metadata for the document
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if domain not in self.collections:
                logger.error(f"Unknown domain: {domain}")
                return False
            
            collection = self.collections[domain]
            
            # Split text into chunks (simple splitting by paragraphs)
            chunks = self._split_text(text)
            
            # Generate embeddings
            embeddings = self.model.encode(chunks).tolist()
            
            # Prepare IDs
            doc_id_base = metadata.get("source", "doc") if metadata else "doc"
            ids = [f"{doc_id_base}_{i}" for i in range(len(chunks))]
            
            # Prepare metadata for each chunk
            metadatas = [
                {**(metadata or {}), "chunk_index": i}
                for i in range(len(chunks))
            ]
            
            # Add to collection
            collection.add(
                embeddings=embeddings,
                documents=chunks,
                ids=ids,
                metadatas=metadatas
            )
            
            logger.info(f"Ingested {len(chunks)} chunks into {domain} collection")
            return True
            
        except Exception as e:
            logger.error(f"Error ingesting document: {str(e)}")
            return False
    
    def retrieve(self, domain: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents for a query.
        
        Args:
            domain: Advisory domain
            query: Query text
            top_k: Number of top results to return
            
        Returns:
            List of relevant document chunks with metadata
        """
        try:
            if domain not in self.collections:
                logger.warning(f"Unknown domain: {domain}, using all collections")
                # Search across all collections
                all_results = []
                for coll_domain, collection in self.collections.items():
                    results = self._search_collection(collection, query, top_k)
                    all_results.extend(results)
                # Sort by distance and return top_k
                all_results.sort(key=lambda x: x.get("distance", float('inf')))
                return all_results[:top_k]
            
            collection = self.collections[domain]
            return self._search_collection(collection, query, top_k)
            
        except Exception as e:
            logger.error(f"Error retrieving documents: {str(e)}")
            return []
    
    def _search_collection(self, collection, query: str, top_k: int) -> List[Dict[str, Any]]:
        """Search a single collection."""
        # Generate query embedding
        query_embedding = self.model.encode(query).tolist()
        
        # Query collection
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        
        # Format results
        formatted_results = []
        if results and results['documents']:
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    "text": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                    "distance": results['distances'][0][i] if results['distances'] else None
                })
        
        return formatted_results
    
    def _split_text(self, text: str, chunk_size: int = 500) -> List[str]:
        """
        Split text into chunks.
        
        Args:
            text: Text to split
            chunk_size: Approximate size of each chunk in characters
            
        Returns:
            List of text chunks
        """
        # Split by paragraphs first
        paragraphs = text.split('\n\n')
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            if len(current_chunk) + len(para) < chunk_size:
                current_chunk += para + "\n\n"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks if chunks else [text]
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about all collections."""
        stats = {}
        for domain, collection in self.collections.items():
            try:
                count = collection.count()
                stats[domain] = {"document_count": count}
            except Exception as e:
                stats[domain] = {"error": str(e)}
        return stats


# Global instance
rag_manager = RAGManager()
