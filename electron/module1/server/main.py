"""
AI-Based Legal Case Classification & Analysis System
FastAPI Server - Main Entry Point

This server provides the backend API for the legal case analysis system.
It follows the MCP (Model Context Protocol) architecture with modular tools.
"""

import logging
import uuid
import time
from contextvars import ContextVar
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Dict, List, Any, Optional
from model_loader import model_loader
from document_processor import document_processor
from text_preprocessor import text_preprocessor
from tools.issue_classifier_tool import issue_classifier
from tools.section_mapper_tool import section_mapper
from tools.evidence_extractor_tool import evidence_extractor
from tools.legal_analyzer_tool import legal_analyzer
from tools.report_generator_tool import report_generator
from orchestrator import case_orchestrator
from advisory_orchestrator import advisory_orchestrator

# Configure logging
request_id_context: ContextVar[str] = ContextVar("request_id", default="system")

class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = request_id_context.get()
        return True

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s"
)
logger = logging.getLogger(__name__)
logger.addFilter(RequestIdFilter())

# Initialize FastAPI app
app = FastAPI(
    title="Legal Case Analysis API",
    description="AI-powered legal case classification and analysis system",
    version="1.0.0"
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid.uuid4())
    logger.error(f"Global exception occurred (Error ID: {error_id}): {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error_id": error_id,
            "message": str(exc)
        }
    )

# Middleware for Request ID and Timing
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request_id_token = request_id_context.set(request_id)
    
    start_time = time.time()
    logger.info(f"Request started: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        response.headers["X-Request-ID"] = request_id
        logger.info(f"Request completed: {response.status_code} (took {process_time:.4f}s)")
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Request failed: {str(e)} (took {process_time:.4f}s)")
        raise e
    finally:
        request_id_context.reset(request_id_token)

# Configure CORS for Electron client
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models
class PreprocessRequest(BaseModel):
    """Request model for text preprocessing."""
    text: str
    translate: bool = True
    clean: bool = True


class ClassifyRequest(BaseModel):
    """Request model for issue classification."""
    text: str
    use_embeddings: bool = False


class MapSectionsRequest(BaseModel):
    """Request model for section mapping."""
    domain: str
    primary_issue: str
    secondary_issues: Optional[List[str]] = None


class ExtractEvidenceRequest(BaseModel):
    """Request model for evidence extraction."""
    text: str


class LegalAnalysisRequest(BaseModel):
    """Request model for legal analysis."""
    facts: str
    sections: List[Dict[str, Any]]
    domain: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None


class GenerateReportRequest(BaseModel):
    """Request model for report generation."""
    case_id: str
    case_data: Dict[str, Any]
    save_markdown: bool = True


# Orchestrated case analysis endpoint
@app.post("/analyze-case")
async def analyze_case(
    statement_text: Optional[str] = Form(None),
    statement_file: Optional[UploadFile] = File(None),
    fir_text: Optional[str] = Form(None),
    fir_file: Optional[UploadFile] = File(None),
    other_files: Optional[List[UploadFile]] = File(None),
    case_title: Optional[str] = Form(None),
    translate: bool = Form(False),
    clean: bool = Form(True),
    use_embeddings: bool = Form(False)
) -> Dict[str, Any]:
    """
    Complete case analysis pipeline in a single call.
    
    Orchestrates all tools automatically:
    1. Upload & process documents
    2. Preprocess text
    3. Classify legal issues
    4. Map legal sections
    5. Extract evidence
    6. Generate legal analysis
    7. Create PDF report
    
    Args:
        statement_text: Statement text (optional if file provided)
        statement_file: Statement file (optional if text provided)
        fir_text: FIR text (optional)
        fir_file: FIR file (optional)
        other_files: Additional documents (optional)
        case_title: Case title (optional)
        translate: Whether to translate text
        clean: Whether to clean text
        use_embeddings: Whether to use embeddings for classification
        
    Returns:
        Dict with complete analysis results and PDF report path
    """
    result = await case_orchestrator.analyze_case(
        statement_text=statement_text,
        statement_file=statement_file,
        fir_text=fir_text,
        fir_file=fir_file,
        other_files=other_files,
        case_title=case_title,
        translate=translate,
        clean=clean,
        use_embeddings=use_embeddings
    )
    
    return result


# Advisory case analysis endpoint (TYPE-B)
@app.post("/analyze-advisory")
async def analyze_advisory(
    client_objective: str = Form(...),
    background: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    case_title: Optional[str] = Form(None)
) -> Dict[str, Any]:
    """
    Pre-litigation advisory analysis pipeline.
    
    For cases where no FIR/litigation exists and client seeks preventive legal guidance.
    
    Pipeline:
    1. Process uploaded documents
    2. Preprocess text
    3. Classify advisory domain (Property, Immigration, Business, etc.)
    4. Retrieve relevant legal knowledge (RAG)
    5. Generate advisory analysis with Gemini
    6. Create advisory PDF report
    
    Args:
        client_objective: Client's stated objective (required)
        background: Background details (optional)
        files: Supporting documents (optional)
        case_title: Case title (optional)
        
    Returns:
        Dict with complete advisory analysis and PDF report path
    """
    result = await advisory_orchestrator.analyze_advisory(
        client_objective=client_objective,
        background=background,
        files=files,
        case_title=case_title
    )
    
    return result


# Health check endpoint
@app.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint to verify server is running.
    
    Returns:
        Dict with status "ok"
    """
    return {"status": "ok"}


# Root endpoint
@app.get("/")
async def root() -> Dict[str, str]:
    """
    Root endpoint with API information.
    
    Returns:
        Dict with welcome message and API info
    """
    return {
        "message": "Legal Case Analysis API",
        "version": "1.0.0",
        "docs": "/docs"
    }


# Model download endpoint
@app.post("/download-models")
async def download_models() -> Dict[str, Any]:
    """
    Download all legal AI models from HuggingFace.
    
    Downloads the following models:
    - law-ai/LegalBERT
    - law-ai/InLegalBERT
    - law-ai/CaseLawBERT
    
    Returns:
        Dict with download results for each model
    """
    results = model_loader.download_all_models()
    
    # Count successes and failures
    successful = sum(1 for r in results if r["status"] in ["success", "already_exists"])
    failed = sum(1 for r in results if r["status"] == "error")
    
    return {
        "message": "Model download process completed",
        "total_models": len(results),
        "successful": successful,
        "failed": failed,
        "results": results
    }


# List downloaded models endpoint
@app.get("/models")
async def list_models() -> Dict[str, Any]:
    """
    List all downloaded legal AI models.
    
    Returns:
        Dict with list of downloaded models and their information
    """
    models = model_loader.list_downloaded_models()
    
    return {
        "message": "Downloaded models",
        "count": len(models),
        "models": models
    }


# File upload and OCR endpoint
@app.post("/upload")
async def upload_files(
    statement_text: Optional[str] = Form(None),
    statement_file: Optional[UploadFile] = File(None),
    fir_text: Optional[str] = Form(None),
    fir_file: Optional[UploadFile] = File(None),
    other_files: Optional[List[UploadFile]] = File(None)
) -> Dict[str, Any]:
    """
    Upload and process legal case documents.
    
    Accepts:
    - statement_text: Direct text input for case statement
    - statement_file: File upload for case statement (PDF, DOCX, TXT, Image)
    - fir_text: Direct text input for FIR
    - fir_file: File upload for FIR (PDF, DOCX, TXT, Image)
    - other_files: Additional supporting documents
    
    Returns:
        Dict with extracted text from all sources
    """
    result = {
        "statement_text": "",
        "fir_text": "",
        "other_docs_text": [],
        "processing_details": []
    }
    
    # Process statement
    if statement_text:
        result["statement_text"] = statement_text.strip()
        result["processing_details"].append({
            "source": "statement_text",
            "method": "direct_input",
            "char_count": len(statement_text.strip())
        })
    
    if statement_file:
        file_bytes = await statement_file.read()
        extracted = document_processor.process_file(file_bytes, statement_file.filename)
        
        if extracted["text"]:
            # Append to existing text if any
            if result["statement_text"]:
                result["statement_text"] += "\n\n" + extracted["text"]
            else:
                result["statement_text"] = extracted["text"]
        
        result["processing_details"].append({
            "source": "statement_file",
            "filename": statement_file.filename,
            **extracted
        })
    
    # Process FIR
    if fir_text:
        result["fir_text"] = fir_text.strip()
        result["processing_details"].append({
            "source": "fir_text",
            "method": "direct_input",
            "char_count": len(fir_text.strip())
        })
    
    if fir_file:
        file_bytes = await fir_file.read()
        extracted = document_processor.process_file(file_bytes, fir_file.filename)
        
        if extracted["text"]:
            # Append to existing text if any
            if result["fir_text"]:
                result["fir_text"] += "\n\n" + extracted["text"]
            else:
                result["fir_text"] = extracted["text"]
        
        result["processing_details"].append({
            "source": "fir_file",
            "filename": fir_file.filename,
            **extracted
        })
    
    # Process other files
    if other_files:
        for idx, file in enumerate(other_files):
            file_bytes = await file.read()
            extracted = document_processor.process_file(file_bytes, file.filename)
            
            result["other_docs_text"].append({
                "filename": file.filename,
                "text": extracted["text"],
                "metadata": extracted
            })
            
            result["processing_details"].append({
                "source": f"other_files[{idx}]",
                "filename": file.filename,
                **extracted
            })
    
    # Summary
    result["summary"] = {
        "statement_chars": len(result["statement_text"]),
        "fir_chars": len(result["fir_text"]),
        "other_docs_count": len(result["other_docs_text"]),
        "total_files_processed": len(result["processing_details"])
    }
    
    return result


# Text preprocessing endpoint
@app.post("/preprocess")
async def preprocess_text(request: PreprocessRequest) -> Dict[str, Any]:
    """
    Preprocess text: detect language, translate to English, and clean.
    
    Args:
        request: PreprocessRequest with text and processing flags
        
    Returns:
        Dict with preprocessing results including:
        - Language detection
        - Translation (if needed)
        - Cleaned text
        - Processing steps
    """
    result = text_preprocessor.preprocess(
        text=request.text,
        translate=request.translate,
        clean=request.clean
    )
    
    return result


# Issue classification endpoint
@app.post("/classify-issues")
async def classify_issues(request: ClassifyRequest) -> Dict[str, Any]:
    """
    Classify legal issues in text.
    
    Identifies:
    - Legal domain (Criminal, Civil, Family, Cyber, Consumer, Labour, Property)
    - Primary issue
    - Secondary issues
    
    Args:
        request: ClassifyRequest with text and processing flags
        
    Returns:
        Dict with classification results
    """
    result = issue_classifier.classify(
        text=request.text,
        use_embeddings=request.use_embeddings
    )
    
    return result


# Section mapping endpoint
@app.post("/map-sections")
async def map_sections(request: MapSectionsRequest) -> Dict[str, Any]:
    """
    Map legal issues to relevant sections.
    
    Maps to:
    - IPC (Indian Penal Code)
    - BNS (Bharatiya Nyaya Sanhita)
    - IT Act (Information Technology Act)
    - CrPC (Code of Criminal Procedure)
    
    Args:
        request: MapSectionsRequest with domain and issues
        
    Returns:
        Dict with mapped sections from relevant acts
    """
    result = section_mapper.map_sections(
        domain=request.domain,
        primary_issue=request.primary_issue,
        secondary_issues=request.secondary_issues
    )
    
    return result


# Evidence extraction endpoint
@app.post("/extract-evidence")
async def extract_evidence(request: ExtractEvidenceRequest) -> Dict[str, Any]:
    """
    Extract evidence from legal text.
    
    Extracts:
    - Witnesses (people mentioned with witness keywords)
    - Documents (evidence documents, CCTV, emails, etc.)
    - Dates and times
    - Locations
    - Monetary amounts
    
    Args:
        request: ExtractEvidenceRequest with text
        
    Returns:
        Dict with all extracted evidence
    """
    result = evidence_extractor.extract_evidence(request.text)
    
    return result


# Legal analysis endpoint
@app.post("/legal-analysis")
async def legal_analysis(request: LegalAnalysisRequest) -> Dict[str, Any]:
    """
    Perform legal analysis by applying law to facts.
    
    Uses Gemini API to generate detailed legal reasoning including:
    - Elements of the offense
    - Application of law to facts
    - Strength of case
    - Potential defenses
    - Conclusion
    
    Args:
        request: LegalAnalysisRequest with facts, sections, domain, and evidence
        
    Returns:
        Dict with legal analysis and reasoning
    """
    result = legal_analyzer.analyze_case(
        facts=request.facts,
        sections=request.sections,
        domain=request.domain,
        evidence=request.evidence
    )
    
    return result


# Report generation endpoint
@app.post("/generate-report")
async def generate_report(request: GenerateReportRequest) -> Dict[str, Any]:
    """
    Generate comprehensive case analysis report.
    
    Creates a detailed report including:
    - Case facts
    - Legal classification
    - Applicable sections
    - Evidence summary
    - Legal analysis
    - Conclusion
    
    Generates both markdown and PDF formats.
    
    Args:
        request: GenerateReportRequest with case_id, case_data, and save_markdown flag
        
    Returns:
        Dict with report paths and metadata
    """
    result = report_generator.generate_report(
        case_id=request.case_id,
        case_data=request.case_data,
        save_markdown=request.save_markdown
    )
    
    return result


if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
