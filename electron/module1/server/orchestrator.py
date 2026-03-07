"""
MCP Orchestrator for Legal Case Analysis

Orchestrates the complete pipeline of tools:
upload → preprocess → classify → map → evidence → analysis → report
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import UploadFile

# Import all tools
from document_processor import document_processor
from text_preprocessor import text_preprocessor
from tools.issue_classifier_tool import issue_classifier
from tools.section_mapper_tool import section_mapper
from tools.evidence_extractor_tool import evidence_extractor
from tools.legal_analyzer_tool import legal_analyzer
from tools.report_generator_tool import report_generator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CaseOrchestrator:
    """Orchestrates the complete case analysis pipeline."""
    
    def __init__(self):
        """Initialize the orchestrator."""
        logger.info("Case Orchestrator initialized")
    
    async def analyze_case(
        self,
        statement_text: Optional[str] = None,
        statement_file: Optional[UploadFile] = None,
        fir_text: Optional[str] = None,
        fir_file: Optional[UploadFile] = None,
        other_files: Optional[List[UploadFile]] = None,
        case_title: Optional[str] = None,
        translate: bool = False,
        clean: bool = True,
        use_embeddings: bool = False
    ) -> Dict[str, Any]:
        """
        Execute complete case analysis pipeline.
        
        Args:
            statement_text: Statement text
            statement_file: Statement file
            fir_text: FIR text
            fir_file: FIR file
            other_files: Additional documents
            case_title: Case title
            translate: Whether to translate text
            clean: Whether to clean text
            use_embeddings: Whether to use embeddings for classification
            
        Returns:
            Dict with complete analysis results and report
        """
        try:
            logger.info("=" * 60)
            logger.info("Starting case analysis pipeline")
            logger.info("=" * 60)
            
            pipeline_result = {
                "case_title": case_title or f"CASE_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "started_at": datetime.now().isoformat(),
                "steps": {}
            }
            
            # STEP 1: Upload & Process Documents
            logger.info("STEP 1/7: Uploading and processing documents...")
            upload_result = await self._step_upload(
                statement_text, statement_file,
                fir_text, fir_file,
                other_files
            )
            pipeline_result["steps"]["upload"] = upload_result
            
            # Combine all text
            all_text = self._combine_text(upload_result)
            logger.info(f"Combined text length: {len(all_text)} characters")
            
            # STEP 2: Preprocess Text
            logger.info("STEP 2/7: Preprocessing text...")
            preprocess_result = self._step_preprocess(all_text, translate, clean)
            pipeline_result["steps"]["preprocess"] = preprocess_result
            cleaned_text = preprocess_result.get("cleaned_text", all_text)
            
            # STEP 3: Classify Issues
            logger.info("STEP 3/7: Classifying legal issues...")
            classification_result = self._step_classify(cleaned_text, use_embeddings)
            pipeline_result["steps"]["classification"] = classification_result
            
            # STEP 4: Map Sections
            logger.info("STEP 4/7: Mapping legal sections...")
            sections_result = self._step_map_sections(classification_result)
            pipeline_result["steps"]["sections"] = sections_result
            
            # STEP 5: Extract Evidence
            logger.info("STEP 5/7: Extracting evidence...")
            evidence_result = self._step_extract_evidence(cleaned_text)
            pipeline_result["steps"]["evidence"] = evidence_result
            
            # STEP 6: Legal Analysis
            logger.info("STEP 6/7: Generating legal analysis...")
            analysis_result = self._step_analyze(
                cleaned_text,
                sections_result["all_sections"],
                classification_result["domain"],
                evidence_result
            )
            pipeline_result["steps"]["analysis"] = analysis_result
            
            # STEP 7: Generate Report
            logger.info("STEP 7/7: Generating PDF report...")
            case_id = pipeline_result["case_title"].replace(" ", "_")
            report_result = self._step_generate_report(
                case_id,
                cleaned_text,
                classification_result,
                sections_result["all_sections"],
                evidence_result,
                analysis_result["analysis"]
            )
            pipeline_result["steps"]["report"] = report_result
            
            # Final result
            pipeline_result["completed_at"] = datetime.now().isoformat()
            pipeline_result["status"] = "success"
            pipeline_result["case_id"] = case_id
            pipeline_result["pdf_path"] = report_result.get("pdf_path")
            pipeline_result["summary"] = {
                "domain": classification_result["domain"],
                "primary_issue": classification_result["primary_issue"],
                "sections_count": len(sections_result["all_sections"]),
                "witnesses_count": evidence_result.get("summary", {}).get("confirmed_witnesses", 0),
                "documents_count": evidence_result.get("summary", {}).get("total_documents", 0)
            }
            
            logger.info("=" * 60)
            logger.info("Pipeline completed successfully!")
            logger.info(f"Case ID: {case_id}")
            logger.info(f"PDF Report: {report_result.get('pdf_path')}")
            logger.info("=" * 60)
            
            return pipeline_result
            
        except Exception as e:
            logger.error(f"Pipeline error: {str(e)}")
            return {
                "status": "error",
                "error": str(e),
                "completed_at": datetime.now().isoformat()
            }
    
    async def _step_upload(
        self,
        statement_text: Optional[str],
        statement_file: Optional[UploadFile],
        fir_text: Optional[str],
        fir_file: Optional[UploadFile],
        other_files: Optional[List[UploadFile]]
    ) -> Dict[str, Any]:
        """Step 1: Upload and process documents."""
        result = {
            "statement": {},
            "fir": {},
            "other_documents": []
        }
        
        # Process statement
        if statement_text:
            result["statement"] = {"text": statement_text, "source": "text_input"}
        elif statement_file:
            content = await statement_file.read()
            processed = document_processor.process_file(content, statement_file.filename)
            result["statement"] = processed
        
        # Process FIR
        if fir_text:
            result["fir"] = {"text": fir_text, "source": "text_input"}
        elif fir_file:
            content = await fir_file.read()
            processed = document_processor.process_file(content, fir_file.filename)
            result["fir"] = processed
        
        # Process other files
        if other_files:
            for file in other_files:
                content = await file.read()
                processed = document_processor.process_file(content, file.filename)
                result["other_documents"].append(processed)
        
        return result
    
    def _combine_text(self, upload_result: Dict[str, Any]) -> str:
        """Combine all text from upload result."""
        texts = []
        
        if upload_result.get("statement", {}).get("text"):
            texts.append(upload_result["statement"]["text"])
        
        if upload_result.get("fir", {}).get("text"):
            texts.append(upload_result["fir"]["text"])
        
        for doc in upload_result.get("other_documents", []):
            if doc.get("text"):
                texts.append(doc["text"])
        
        return "\n\n".join(filter(None, texts))
    
    def _step_preprocess(self, text: str, translate: bool, clean: bool) -> Dict[str, Any]:
        """Step 2: Preprocess text."""
        return text_preprocessor.preprocess(text, translate, clean)
    
    def _step_classify(self, text: str, use_embeddings: bool) -> Dict[str, Any]:
        """Step 3: Classify legal issues."""
        return issue_classifier.classify_text(text, use_embeddings)
    
    def _step_map_sections(self, classification: Dict[str, Any]) -> Dict[str, Any]:
        """Step 4: Map legal sections."""
        return section_mapper.map_sections(
            domain=classification["domain"],
            primary_issue=classification["primary_issue"],
            secondary_issues=classification.get("secondary_issues")
        )
    
    def _step_extract_evidence(self, text: str) -> Dict[str, Any]:
        """Step 5: Extract evidence."""
        return evidence_extractor.extract_evidence(text)
    
    def _step_analyze(
        self,
        facts: str,
        sections: List[Dict[str, Any]],
        domain: str,
        evidence: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Step 6: Generate legal analysis."""
        return legal_analyzer.analyze_case(facts, sections, domain, evidence)
    
    def _step_generate_report(
        self,
        case_id: str,
        facts: str,
        classification: Dict[str, Any],
        sections: List[Dict[str, Any]],
        evidence: Dict[str, Any],
        analysis: str
    ) -> Dict[str, Any]:
        """Step 7: Generate PDF report."""
        case_data = {
            "facts": facts,
            "domain": classification["domain"],
            "primary_issue": classification["primary_issue"],
            "secondary_issues": classification.get("secondary_issues"),
            "sections": sections,
            "evidence": evidence,
            "analysis": analysis
        }
        
        return report_generator.generate_report(case_id, case_data, save_markdown=True)


# Global instance
case_orchestrator = CaseOrchestrator()
