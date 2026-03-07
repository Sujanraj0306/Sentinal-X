"""
Advisory Report Generator Tool

Generates PDF reports for pre-litigation advisory cases.
"""

import logging
import os
from typing import Dict, Any
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
import re

logger = logging.getLogger(__name__)


class AdvisoryReportGenerator:
    """Generates PDF reports for advisory cases."""
    
    def __init__(self):
        """Initialize the report generator."""
        logger.info("Advisory Report Generator initialized")
        self.documents_dir = "documents"
        os.makedirs(self.documents_dir, exist_ok=True)
    
    def generate_report(
        self,
        case_id: str,
        advisory_data: Dict[str, Any],
        save_markdown: bool = True
    ) -> Dict[str, Any]:
        """
        Generate advisory PDF report.
        
        Args:
            case_id: Unique case identifier
            advisory_data: Advisory case data
            save_markdown: Whether to save markdown version
            
        Returns:
            Dict with report paths and metadata
        """
        try:
            logger.info(f"Generating advisory report for case: {case_id}")
            
            # Create case directory
            case_dir = os.path.join(self.documents_dir, case_id)
            os.makedirs(case_dir, exist_ok=True)
            
            # Generate PDF
            pdf_path = os.path.join(case_dir, "advisory_report.pdf")
            self._generate_pdf(pdf_path, case_id, advisory_data)
            
            # Generate Markdown if requested
            md_path = None
            if save_markdown:
                md_path = os.path.join(case_dir, "advisory_report.md")
                self._generate_markdown(md_path, case_id, advisory_data)
            
            result = {
                "case_id": case_id,
                "pdf_path": os.path.abspath(pdf_path),
                "markdown_path": os.path.abspath(md_path) if md_path else None,
                "case_directory": os.path.abspath(case_dir),
                "generated_at": datetime.now().isoformat()
            }
            
            logger.info(f"Advisory report generated: {pdf_path}")
            return result
            
        except Exception as e:
            logger.error(f"Error generating advisory report: {str(e)}")
            raise
    
    def _generate_pdf(self, pdf_path: str, case_id: str, data: Dict[str, Any]):
        """Generate PDF report."""
        doc = SimpleDocTemplate(
            pdf_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.black,
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.black,
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold',
            textTransform='uppercase'
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['BodyText'],
            fontSize=11,
            alignment=TA_JUSTIFY,
            spaceAfter=12
        )
        
        # Build document
        elements = []
        
        # Title
        elements.append(Paragraph("PRE-LITIGATION ADVISORY REPORT", title_style))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Case Information
        case_info = [
            ["Case ID:", case_id],
            ["Advisory Domain:", data.get("domain", "N/A")],
            ["Generated On:", datetime.now().strftime("%B %d, %Y at %I:%M %p")],
            ["Report Type:", "Pre-Litigation Advisory"]
        ]
        
        case_table = Table(case_info, colWidths=[2*inch, 4*inch])
        case_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(case_table)
        elements.append(Spacer(1, 0.3 * inch))
        
        # Client Objective
        elements.append(Paragraph("CLIENT OBJECTIVE", heading_style))
        objective_text = data.get("client_objective", "Not specified")
        elements.append(Paragraph(objective_text, body_style))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Background
        elements.append(Paragraph("BACKGROUND DETAILS", heading_style))
        background_text = data.get("background", "Not provided")
        elements.append(Paragraph(background_text, body_style))
        elements.append(Spacer(1, 0.2 * inch))
        
        # Documents Reviewed
        if data.get("documents_reviewed"):
            elements.append(Paragraph("DOCUMENTS REVIEWED", heading_style))
            for doc in data["documents_reviewed"]:
                elements.append(Paragraph(f"• {doc}", body_style))
            elements.append(Spacer(1, 0.2 * inch))
        
        # Advisory Analysis
        elements.append(Paragraph("LEGAL ADVISORY ANALYSIS", heading_style))
        analysis_text = data.get("analysis", "No analysis available")
        
        # Process markdown-style analysis
        self._add_formatted_text(elements, analysis_text, styles, body_style, heading_style)
        
        # Disclaimer
        elements.append(Spacer(1, 0.3 * inch))
        elements.append(Paragraph("LEGAL DISCLAIMER", heading_style))
        disclaimer = """This advisory report is generated based on the information provided and general legal principles. 
        It is intended for informational purposes only and does not constitute legal advice. The analysis is based on 
        current laws and regulations, which may change. For specific legal advice tailored to your circumstances, 
        please consult with a qualified legal professional. The authors and generators of this report assume no 
        liability for actions taken based on this advisory."""
        elements.append(Paragraph(disclaimer, body_style))
        
        # Build PDF
        doc.build(elements)
    
    def _add_formatted_text(self, elements, text, styles, body_style, heading_style):
        """Add formatted text to PDF elements."""
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                elements.append(Spacer(1, 0.1 * inch))
                continue
            
            # Handle headings
            if line.startswith('##'):
                heading_text = line.replace('##', '').strip()
                elements.append(Paragraph(heading_text, heading_style))
            elif line.startswith('**') and line.endswith('**'):
                # Bold text
                bold_text = line.replace('**', '')
                elements.append(Paragraph(f"<b>{bold_text}</b>", body_style))
            elif line.startswith('- ') or line.startswith('* '):
                # Bullet points
                bullet_text = line[2:]
                bullet_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', bullet_text)
                elements.append(Paragraph(f"• {bullet_text}", body_style))
            else:
                # Regular text
                formatted_line = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)
                elements.append(Paragraph(formatted_line, body_style))
    
    def _generate_markdown(self, md_path: str, case_id: str, data: Dict[str, Any]):
        """Generate Markdown report."""
        md_content = f"""# PRE-LITIGATION ADVISORY REPORT

## Case Information
- **Case ID**: {case_id}
- **Advisory Domain**: {data.get("domain", "N/A")}
- **Generated On**: {datetime.now().strftime("%B %d, %Y at %I:%M %p")}
- **Report Type**: Pre-Litigation Advisory

---

## CLIENT OBJECTIVE
{data.get("client_objective", "Not specified")}

---

## BACKGROUND DETAILS
{data.get("background", "Not provided")}

---

"""
        
        if data.get("documents_reviewed"):
            md_content += "## DOCUMENTS REVIEWED\n"
            for doc in data["documents_reviewed"]:
                md_content += f"- {doc}\n"
            md_content += "\n---\n\n"
        
        md_content += f"""## LEGAL ADVISORY ANALYSIS

{data.get("analysis", "No analysis available")}

---

## LEGAL DISCLAIMER

This advisory report is generated based on the information provided and general legal principles. 
It is intended for informational purposes only and does not constitute legal advice. The analysis 
is based on current laws and regulations, which may change. For specific legal advice tailored to 
your circumstances, please consult with a qualified legal professional. The authors and generators 
of this report assume no liability for actions taken based on this advisory.
"""
        
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(md_content)


# Global instance
advisory_report_generator = AdvisoryReportGenerator()
