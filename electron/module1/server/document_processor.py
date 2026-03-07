"""
Document Processor for Legal Case Analysis

Handles OCR, text extraction from various file formats:
- Images (PNG, JPG, JPEG) -> Tesseract OCR
- PDFs -> PyMuPDF text extraction + OCR for scanned PDFs
- DOCX -> python-docx text extraction
- TXT -> Direct text reading
"""

import os
import io
from pathlib import Path
from typing import Optional, Dict, Any
import logging
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
from docx import Document
from langdetect import detect, LangDetectException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Handles document processing, OCR, and text extraction."""
    
    # Supported file extensions
    IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'}
    PDF_EXTENSIONS = {'.pdf'}
    DOCX_EXTENSIONS = {'.docx'}
    TEXT_EXTENSIONS = {'.txt'}
    
    def __init__(self):
        """Initialize the DocumentProcessor."""
        self.supported_extensions = (
            self.IMAGE_EXTENSIONS | 
            self.PDF_EXTENSIONS | 
            self.DOCX_EXTENSIONS | 
            self.TEXT_EXTENSIONS
        )
    
    def is_supported(self, filename: str) -> bool:
        """
        Check if file type is supported.
        
        Args:
            filename: Name of the file
            
        Returns:
            True if supported, False otherwise
        """
        ext = Path(filename).suffix.lower()
        return ext in self.supported_extensions
    
    def detect_language(self, text: str) -> str:
        """
        Detect language of text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Language code (e.g., 'en', 'hi', 'ta')
        """
        try:
            if not text or len(text.strip()) < 10:
                return "unknown"
            return detect(text)
        except LangDetectException:
            logger.warning("Could not detect language")
            return "unknown"
    
    def extract_text_from_image(self, image_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract text from image using Tesseract OCR.
        
        Args:
            image_bytes: Image file bytes
            filename: Original filename
            
        Returns:
            Dict with extracted text and metadata
        """
        try:
            logger.info(f"Performing OCR on image: {filename}")
            
            # Open image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Perform OCR
            text = pytesseract.image_to_string(image)
            
            # Detect language
            language = self.detect_language(text)
            
            logger.info(f"OCR completed. Extracted {len(text)} characters. Language: {language}")
            
            return {
                "text": text.strip(),
                "method": "ocr",
                "language": language,
                "char_count": len(text.strip()),
                "filename": filename
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from image {filename}: {str(e)}")
            return {
                "text": "",
                "method": "ocr",
                "error": str(e),
                "filename": filename
            }
    
    def extract_text_from_pdf(self, pdf_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract text from PDF using PyMuPDF.
        Falls back to OCR if PDF is scanned.
        
        Args:
            pdf_bytes: PDF file bytes
            filename: Original filename
            
        Returns:
            Dict with extracted text and metadata
        """
        try:
            logger.info(f"Extracting text from PDF: {filename}")
            
            # Open PDF
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            text = ""
            method = "direct"
            
            # Extract text from all pages
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
                page_text = page.get_text()
                text += page_text + "\n"
            
            # If very little text extracted, try OCR
            if len(text.strip()) < 100:
                logger.info(f"PDF appears to be scanned. Attempting OCR...")
                method = "ocr"
                text = ""
                
                for page_num in range(pdf_document.page_count):
                    page = pdf_document[page_num]
                    # Render page to image
                    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better OCR
                    img_bytes = pix.tobytes("png")
                    
                    # Perform OCR on page image
                    image = Image.open(io.BytesIO(img_bytes))
                    page_text = pytesseract.image_to_string(image)
                    text += page_text + "\n"
            
            pdf_document.close()
            
            # Detect language
            language = self.detect_language(text)
            
            logger.info(f"PDF processing completed. Extracted {len(text)} characters. Method: {method}. Language: {language}")
            
            return {
                "text": text.strip(),
                "method": method,
                "language": language,
                "char_count": len(text.strip()),
                "filename": filename
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF {filename}: {str(e)}")
            return {
                "text": "",
                "method": "error",
                "error": str(e),
                "filename": filename
            }
    
    def extract_text_from_docx(self, docx_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract text from DOCX file.
        
        Args:
            docx_bytes: DOCX file bytes
            filename: Original filename
            
        Returns:
            Dict with extracted text and metadata
        """
        try:
            logger.info(f"Extracting text from DOCX: {filename}")
            
            # Open DOCX
            doc = Document(io.BytesIO(docx_bytes))
            
            # Extract text from paragraphs
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            
            # Detect language
            language = self.detect_language(text)
            
            logger.info(f"DOCX processing completed. Extracted {len(text)} characters. Language: {language}")
            
            return {
                "text": text.strip(),
                "method": "direct",
                "language": language,
                "char_count": len(text.strip()),
                "filename": filename
            }
            
        except Exception as e:
            logger.error(f"Error extracting text from DOCX {filename}: {str(e)}")
            return {
                "text": "",
                "method": "error",
                "error": str(e),
                "filename": filename
            }
    
    def extract_text_from_txt(self, txt_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract text from TXT file.
        
        Args:
            txt_bytes: TXT file bytes
            filename: Original filename
            
        Returns:
            Dict with extracted text and metadata
        """
        try:
            logger.info(f"Reading text file: {filename}")
            
            # Try UTF-8 first, then fall back to other encodings
            encodings = ['utf-8', 'latin-1', 'cp1252']
            text = None
            
            for encoding in encodings:
                try:
                    text = txt_bytes.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            
            if text is None:
                raise ValueError("Could not decode text file with supported encodings")
            
            # Detect language
            language = self.detect_language(text)
            
            logger.info(f"Text file read. {len(text)} characters. Language: {language}")
            
            return {
                "text": text.strip(),
                "method": "direct",
                "language": language,
                "char_count": len(text.strip()),
                "filename": filename
            }
            
        except Exception as e:
            logger.error(f"Error reading text file {filename}: {str(e)}")
            return {
                "text": "",
                "method": "error",
                "error": str(e),
                "filename": filename
            }
    
    def process_file(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Process a file and extract text based on file type.
        
        Args:
            file_bytes: File content as bytes
            filename: Original filename
            
        Returns:
            Dict with extracted text and metadata
        """
        ext = Path(filename).suffix.lower()
        
        if not self.is_supported(filename):
            return {
                "text": "",
                "method": "unsupported",
                "error": f"Unsupported file type: {ext}",
                "filename": filename
            }
        
        # Route to appropriate processor
        if ext in self.IMAGE_EXTENSIONS:
            return self.extract_text_from_image(file_bytes, filename)
        elif ext in self.PDF_EXTENSIONS:
            return self.extract_text_from_pdf(file_bytes, filename)
        elif ext in self.DOCX_EXTENSIONS:
            return self.extract_text_from_docx(file_bytes, filename)
        elif ext in self.TEXT_EXTENSIONS:
            return self.extract_text_from_txt(file_bytes, filename)
        else:
            return {
                "text": "",
                "method": "unsupported",
                "error": f"Unsupported file type: {ext}",
                "filename": filename
            }


# Global instance
document_processor = DocumentProcessor()


if __name__ == "__main__":
    # Test the document processor
    print("Document Processor Test")
    print("=" * 50)
    print(f"Supported extensions: {document_processor.supported_extensions}")
