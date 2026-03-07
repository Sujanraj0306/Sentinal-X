"""
Advisory Orchestrator

Orchestrates the complete pre-litigation advisory pipeline:
upload → preprocess → advisory_classify → RAG_retrieve → advisory_analyze → advisory_report
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import UploadFile

# Import tools
from document_processor import document_processor
from text_preprocessor import text_preprocessor
from tools.advisory_classifier_tool import advisory_classifier
from rag_manager import rag_manager
from tools.advisory_analyzer_tool import advisory_analyzer
from tools.advisory_report_generator import advisory_report_generator

logger = logging.getLogger(__name__)


class AdvisoryOrchestrator:
    """Orchestrates the complete advisory case pipeline."""
    
    def __init__(self):
        """Initialize the advisory orchestrator."""
        logger.info("Advisory Orchestrator initialized")
    
    async def analyze_advisory(
        self,
        client_objective: str,
        background: Optional[str] = None,
        files: Optional[List[UploadFile]] = None,
        case_title: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute complete advisory analysis pipeline.
        
        Args:
            client_objective: Client's stated objective
            background: Background details
            files: Optional uploaded documents
            case_title: Optional case title
            
        Returns:
            Dict with complete advisory analysis and report
        """
        try:
            logger.info("=" * 60)
            logger.info("Starting ADVISORY analysis pipeline")
            logger.info("=" * 60)
            
            pipeline_result = {
                "case_type": "advisory",
                "case_title": case_title or f"ADVISORY_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "started_at": datetime.now().isoformat(),
                "steps": {}
            }
            
            # STEP 1: Process Documents (if any)
            logger.info("STEP 1/6: Processing documents...")
            documents_text = ""
            documents_list = []
            
            if files:
                for file in files:
                    content = await file.read()
                    processed = document_processor.process_file(content, file.filename)
                    if processed.get("text"):
                        documents_text += processed["text"] + "\n\n"
                        documents_list.append(file.filename)
            
            pipeline_result["steps"]["documents"] = {
                "files_processed": len(documents_list),
                "files": documents_list
            }
            
            # STEP 2: Preprocess Text
            logger.info("STEP 2/6: Preprocessing text...")
            combined_text = f"{client_objective}\n\n{background or ''}\n\n{documents_text}".strip()
            preprocess_result = text_preprocessor.preprocess(combined_text, translate=False, clean=True)
            cleaned_text = preprocess_result.get("cleaned_text", combined_text)
            pipeline_result["steps"]["preprocess"] = preprocess_result
            
            # STEP 3: Classify Advisory Domain
            logger.info("STEP 3/6: Classifying advisory domain...")
            classification_result = advisory_classifier.classify_advisory(cleaned_text)
            domain = classification_result["domain"]
            pipeline_result["steps"]["classification"] = classification_result
            logger.info(f"Advisory domain: {domain}")
            
            # STEP 4: RAG Retrieval
            logger.info("STEP 4/6: Retrieving relevant legal knowledge...")
            retrieved_docs = rag_manager.retrieve(domain, cleaned_text, top_k=5)
            pipeline_result["steps"]["rag_retrieval"] = {
                "domain": domain,
                "documents_retrieved": len(retrieved_docs),
                "sources": [doc.get("metadata", {}).get("source", "unknown") for doc in retrieved_docs]
            }
            logger.info(f"Retrieved {len(retrieved_docs)} relevant documents")
            
            # STEP 5: Generate Advisory Analysis
            logger.info("STEP 5/6: Generating advisory analysis...")
            analysis_result = advisory_analyzer.analyze_advisory(
                client_objective=client_objective,
                background=background or "",
                domain=domain,
                retrieved_docs=retrieved_docs
            )
            pipeline_result["steps"]["analysis"] = analysis_result
            
            # STEP 6: Generate Advisory Report
            logger.info("STEP 6/6: Generating advisory report...")
            case_id = pipeline_result["case_title"].replace(" ", "_")
            
            advisory_data = {
                "client_objective": client_objective,
                "background": background or "",
                "domain": domain,
                "documents_reviewed": documents_list,
                "analysis": analysis_result["analysis"]
            }
            
            report_result = advisory_report_generator.generate_report(
                case_id,
                advisory_data,
                save_markdown=True
            )
            pipeline_result["steps"]["report"] = report_result
            
            # Final result
            pipeline_result["completed_at"] = datetime.now().isoformat()
            pipeline_result["status"] = "success"
            pipeline_result["case_id"] = case_id
            pipeline_result["pdf_path"] = report_result.get("pdf_path")
            pipeline_result["summary"] = {
                "domain": domain,
                "confidence": classification_result.get("confidence", 0),
                "documents_processed": len(documents_list),
                "knowledge_sources": len(retrieved_docs)
            }
            
            logger.info("=" * 60)
            logger.info("Advisory pipeline completed successfully!")
            logger.info(f"Case ID: {case_id}")
            logger.info(f"Domain: {domain}")
            logger.info(f"PDF Report: {report_result.get('pdf_path')}")
            logger.info("=" * 60)
            
            return pipeline_result
            
        except Exception as e:
            logger.error(f"Advisory pipeline error: {str(e)}")
            return {
                "status": "error",
                "case_type": "advisory",
                "error": str(e),
                "completed_at": datetime.now().isoformat()
            }


# Global instance
advisory_orchestrator = AdvisoryOrchestrator()
