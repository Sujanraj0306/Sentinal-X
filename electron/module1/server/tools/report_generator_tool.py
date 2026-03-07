"""
Report Generator Tool for Legal Case Analysis

Generates comprehensive case analysis reports in markdown and PDF formats.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
import markdown2
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib import colors
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ReportGenerator:
    """Generates case analysis reports in markdown and PDF formats."""
    
    def __init__(self, documents_dir: Optional[str] = None):
        """
        Initialize the ReportGenerator.
        
        Args:
            documents_dir: Base directory for storing reports
        """
        if documents_dir is None:
            # Default to root/documents
            documents_dir = Path(__file__).parent.parent.parent / "documents"
        
        self.documents_dir = Path(documents_dir)
        self.documents_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Report generator initialized. Documents dir: {self.documents_dir}")
    
    def generate_markdown_report(
        self,
        case_id: str,
        case_data: Dict[str, Any]
    ) -> str:
        """
        Generate markdown report from case data.
        """
        # Extract data
        facts = case_data.get("facts", "No facts provided")
        domain = case_data.get("domain", "Not specified")
        primary_issue = case_data.get("primary_issue", "Not identified")
        sections = case_data.get("sections", [])
        evidence = case_data.get("evidence", {})
        analysis = case_data.get("analysis", "No analysis available")
        
        # Generate report
        report = f"""# Legal Case Analysis Report

**Case ID:** {case_id}  
**Generated:** {datetime.now().strftime("%B %d, %Y at %I:%M %p")}  
**Domain:** {domain}  
**Primary Issue:** {primary_issue}

## 1. Case Facts

{facts}

## 2. Legal Classification

**Domain:** {domain}  
**Primary Issue:** {primary_issue}

"""
        
        if case_data.get("secondary_issues"):
            report += f"**Secondary Issues:** {', '.join(case_data['secondary_issues'])}\n"
        
        report += "\n## 3. Applicable Legal Sections\n\n"
        
        if sections:
            for i, section in enumerate(sections, 1):
                act = section.get("act", "Unknown")
                section_num = section.get("section", "N/A")
                title = section.get("title", "")
                description = section.get("description", "")
                punishment = section.get("punishment", "")
                bailable = section.get("bailable")
                cognizable = section.get("cognizable")
                
                report += f"### {i}. {act} Section {section_num}\n\n"
                report += f"**Title:** {title}\n\n"
                report += f"**Description:** {description}\n\n"
                
                if punishment:
                    report += f"**Punishment:** {punishment}\n\n"
                
                if bailable is not None:
                    report += f"**Bailable:** {'Yes' if bailable else 'No'}  \n"
                
                if cognizable is not None:
                    report += f"**Cognizable:** {'Yes' if cognizable else 'No'}\n\n"
        else:
            report += "No sections identified.\n\n"
        
        report += "## 4. Evidence Summary\n\n"
        
        if evidence:
            witnesses = evidence.get("witnesses", [])
            if witnesses:
                confirmed = [w for w in witnesses if w.get("is_witness")]
                report += f"### Witnesses ({len(confirmed)} confirmed)\n\n"
                for w in confirmed:
                    report += f"- **{w['name']}** ({w.get('type', 'witness')})\n"
                report += "\n"
            
            documents = evidence.get("documents", [])
            if documents:
                report += f"### Documents ({len(documents)})\n\n"
                for d in documents[:5]:
                    report += f"- {d['reference']}\n"
                report += "\n"
            
            dates = evidence.get("dates", [])
            if dates:
                report += f"### Important Dates\n\n"
                for d in dates[:5]:
                    report += f"- {d['date']}\n"
                report += "\n"
            
            locations = evidence.get("locations", [])
            if locations:
                report += f"### Locations\n\n"
                for l in locations[:5]:
                    report += f"- {l['location']}\n"
                report += "\n"
                
            money = evidence.get("money", [])
            if money:
                report += f"### Monetary Amounts\n\n"
                for m in money:
                    report += f"- {m['amount']}\n"
                report += "\n"
        else:
            report += "No evidence extracted.\n\n"
        
        report += "## 5. Legal Analysis\n\n"
        report += f"{analysis}\n\n"
        
        report += "## 6. Conclusion\n\n"
        
        if sections:
            report += f"Based on the facts and evidence presented, the case falls under the domain of **{domain}** law. "
            report += f"The primary issue identified is **{primary_issue}**. "
            report += f"\n\n{len(sections)} relevant legal section(s) have been identified:\n\n"
            for section in sections:
                report += f"- {section.get('act')} Section {section.get('section')}\n"
            report += "\n"
        else:
            report += "Further investigation is required to identify applicable legal sections.\n\n"
        
        report += """
## Disclaimer

This report is generated by an AI-powered legal analysis system and is intended for informational purposes only. It should not be considered as legal advice. Please consult with a qualified legal professional for specific legal guidance.

*Report generated by AI-Based Legal Case Classification & Analysis System*
"""
        return report

    def _process_table(self, buffer, elements, styles, available_width):
        """Helper to process and render a table from markdown lines."""
        data = []
        for row_str in buffer:
            # Clean split by pipe
            # | A | B | -> ["", "A", "B", ""] -> ["A", "B"]
            cells = [c.strip() for c in row_str.split('|')]
            # Remove empty first/last if they exist
            if len(cells) > 0 and cells[0] == '': cells.pop(0)
            if len(cells) > 0 and cells[-1] == '': cells.pop(-1)
            
            if not cells: continue
            
            # Skip delimiter row
            if '---' in cells[0]: continue
            
            # Create paragraphs for wrapping
            row_data = []
            for cell in cells:
                # Handle bold inside cell
                cell_text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', cell)
                row_data.append(Paragraph(cell_text, styles['Normal']))
            data.append(row_data)
        
        if not data: return

        # Calculate column widths
        num_cols = len(data[0])
        col_width = available_width / num_cols if num_cols > 0 else available_width
        
        t = Table(data, colWidths=[col_width] * num_cols)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 0.2 * inch))

    def generate_pdf_report(
        self,
        case_id: str,
        markdown_text: str
    ) -> str:
        """
        Generate PDF report from markdown using reportlab.
        """
        try:
            case_dir = self.documents_dir / case_id
            case_dir.mkdir(parents=True, exist_ok=True)
            
            pdf_path = case_dir / "case_analysis_report.pdf"
            
            # Page settings
            doc = SimpleDocTemplate(
                str(pdf_path),
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=72
            )
            
            # Calculate available width for tables
            available_width = A4[0] - 144 # 72*2
            
            elements = []
            styles = getSampleStyleSheet()
            styles['Normal'].alignment = TA_JUSTIFY
            
            # Custom Styles
            styles.add(ParagraphStyle(name='Justify', alignment=TA_JUSTIFY, parent=styles['Normal']))
            
            lines = markdown_text.split('\n')
            table_buffer = []
            
            for line in lines:
                line = line.strip()
                
                # Check for table
                if line.startswith('|') and line.endswith('|'):
                    table_buffer.append(line)
                    continue
                else:
                    # Flush table buffer if we hit a non-table line
                    if table_buffer:
                        self._process_table(table_buffer, elements, styles, available_width)
                        table_buffer = []
                
                if not line:
                    # Reduce blank space? User asked for less space.
                    # We can add small space
                    # elements.append(Spacer(1, 0.1*inch))
                    continue
                
                # Ignore separators
                if line == '---' or line == '___' or set(line) == {'-'}:
                    continue
                
                # HEADINGS
                if line.startswith('# '):
                    text = line[2:].strip()
                    elements.append(Spacer(1, 0.2*inch))
                    elements.append(Paragraph(text, styles['Title']))
                    elements.append(Spacer(1, 0.2*inch))
                elif line.startswith('## '):
                    text = line[3:].strip()
                    elements.append(Spacer(1, 0.2*inch))
                    elements.append(Paragraph(text, styles['Heading2'])) # Heading1 is huge
                    elements.append(Spacer(1, 0.1*inch))
                elif line.startswith('### '):
                    text = line[4:].strip()
                    elements.append(Spacer(1, 0.1*inch))
                    elements.append(Paragraph(text, styles['Heading3']))
                    elements.append(Spacer(1, 0.05*inch))
                elif line.startswith('**') and line.endswith('**'):
                    # Bold line
                    text = f"<b>{line[2:-2]}</b>"
                    elements.append(Paragraph(text, styles['Normal']))
                    elements.append(Spacer(1, 0.1*inch))
                elif line.startswith('- ') or line.startswith('* '):
                    # List item
                    text = f"• {line[2:]}"
                    # Handle bold inside list
                    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
                    elements.append(Paragraph(text, styles['Normal'], bulletText='•'))
                else:
                    # Normal paragraph
                    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', line)
                    elements.append(Paragraph(text, styles['Normal']))
                    # Small space after paragraph
                    elements.append(Spacer(1, 0.1*inch))
            
            # Final flush
            if table_buffer:
                self._process_table(table_buffer, elements, styles, available_width)
            
            doc.build(elements)
            logger.info(f"PDF report generated: {pdf_path}")
            return str(pdf_path)
            
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            raise
    
    def generate_report(
        self,
        case_id: str,
        case_data: Dict[str, Any],
        save_markdown: bool = True
    ) -> Dict[str, Any]:
        """Generate complete case analysis report."""
        try:
            logger.info(f"Generating report for case: {case_id}")
            markdown_text = self.generate_markdown_report(case_id, case_data)
            
            case_dir = self.documents_dir / case_id
            case_dir.mkdir(parents=True, exist_ok=True)
            
            markdown_path = None
            if save_markdown:
                markdown_path = case_dir / "case_analysis_report.md"
                with open(markdown_path, 'w', encoding='utf-8') as f:
                    f.write(markdown_text)
            
            pdf_path = self.generate_pdf_report(case_id, markdown_text)
            
            result = {
                "case_id": case_id,
                "pdf_path": pdf_path,
                "markdown_path": str(markdown_path) if markdown_path else None,
                "case_directory": str(case_dir),
                "generated_at": datetime.now().isoformat(),
                "report_size_kb": round(Path(pdf_path).stat().st_size / 1024, 2)
            }
            return result
        except Exception as e:
            logger.error(f"Report generation error: {str(e)}")
            return {"case_id": case_id, "error": str(e), "generated_at": datetime.now().isoformat()}

# Global instance
report_generator = ReportGenerator()
