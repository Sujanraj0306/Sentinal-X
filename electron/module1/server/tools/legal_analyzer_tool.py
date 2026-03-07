"""
Legal Analyzer Tool for Legal Case Analysis

Applies law to facts using Google Gemini API with structured templates.
Generates legal reasoning and analysis.
"""

import os
import logging
from typing import Dict, Any, List, Optional
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables explicitly from project root
try:
    from pathlib import Path
    root_env = Path(__file__).resolve().parent.parent.parent.parent.parent / '.env'
    load_dotenv(dotenv_path=root_env)
except Exception:
    load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    logger.info("Gemini API configured for legal analysis")
else:
    logger.warning("GEMINI_API_KEY not found. Legal analysis features will be limited.")


class LegalAnalyzer:
    """Analyzes legal cases by applying law to facts using Gemini API."""
    
    def __init__(self, gemini_api_key: Optional[str] = None):
        """
        Initialize the LegalAnalyzer.
        
        Args:
            gemini_api_key: Optional Gemini API key
        """
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.has_api = True
        else:
            self.has_api = bool(GEMINI_API_KEY)
        
        if self.has_api:
            try:
                self.model = genai.GenerativeModel('gemini-2.0-flash')
                logger.info("Gemini model initialized for legal analysis (gemini-2.0-flash)")
            except Exception as e:
                logger.error(f"Error initializing Gemini model: {str(e)}")
                self.has_api = False
    
    def generate_analysis_prompt(
        self,
        facts: str,
        sections: List[Dict[str, Any]],
        domain: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a structured prompt for legal analysis.
        
        Args:
            facts: Case facts
            sections: Relevant legal sections
            domain: Legal domain
            evidence: Extracted evidence
            
        Returns:
            Formatted prompt
        """
        prompt = """You are a legal expert analyzing a case. Provide a detailed legal analysis applying the relevant laws to the facts.

**Case Facts:**
{facts}

**Legal Domain:** {domain}

**Applicable Legal Sections:**
{sections_text}
"""
        
        # Format sections
        sections_text = ""
        for i, section in enumerate(sections, 1):
            act = section.get("act", "Unknown")
            section_num = section.get("section", "N/A")
            title = section.get("title", "")
            description = section.get("description", "")
            punishment = section.get("punishment", "")
            
            sections_text += f"\n{i}. **{act} Section {section_num}**: {title}\n"
            sections_text += f"   Description: {description}\n"
            if punishment:
                sections_text += f"   Punishment: {punishment}\n"
        
        # Add evidence if available
        if evidence:
            evidence_text = "\n**Evidence Available:**\n"
            if evidence.get("witnesses"):
                witnesses = [w["name"] for w in evidence["witnesses"] if w.get("is_witness")]
                if witnesses:
                    evidence_text += f"- Witnesses: {', '.join(witnesses)}\n"
            
            if evidence.get("documents"):
                docs = [d["reference"] for d in evidence["documents"][:3]]
                if docs:
                    evidence_text += f"- Documents: {', '.join(docs)}\n"
            
            if evidence.get("dates"):
                dates = [d["date"] for d in evidence["dates"][:2]]
                if dates:
                    evidence_text += f"- Dates: {', '.join(dates)}\n"
            
            if evidence.get("locations"):
                locations = [l["location"] for l in evidence["locations"][:2]]
                if locations:
                    evidence_text += f"- Locations: {', '.join(locations)}\n"
            
            prompt += evidence_text
        
        prompt += """

**Analysis Required:**

1. **Elements of the Offense**: Identify which elements of each applicable section are satisfied by the facts.

2. **Application of Law to Facts**: Explain how the facts meet the legal requirements of each section.

3. **Strength of Case**: Assess the strength of the case based on available facts and evidence.

4. **Potential Defenses**: Identify any potential defenses or counterarguments.

5. **Conclusion**: Provide a reasoned conclusion about the applicability of the sections.

Please provide a comprehensive legal analysis in clear, structured paragraphs. Use legal terminology appropriately and cite the relevant sections."""
        
        return prompt.format(
            facts=facts,
            domain=domain or "Not specified",
            sections_text=sections_text
        )
    
    def analyze_case(
        self,
        facts: str,
        sections: List[Dict[str, Any]],
        domain: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a legal case.
        
        Args:
            facts: Case facts
            sections: Relevant legal sections
            domain: Legal domain
            evidence: Extracted evidence
            
        Returns:
            Dict with analysis results
        """
        if not self.has_api:
            return {
                "analysis": "Legal analysis not available (Gemini API key not configured)",
                "method": "no_api",
                "error": "API key not configured"
            }
        
        try:
            logger.info(f"Analyzing case with {len(sections)} sections")
            
            # Generate prompt
            prompt = self.generate_analysis_prompt(facts, sections, domain, evidence)
            
            # Get analysis from Gemini with real timeout
            logger.info("Requesting analysis from Gemini API (gemini-2.0-flash, 30s timeout)...")
            
            import signal
            from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
            
            def _call_gemini(p):
                resp = self.model.generate_content(p)
                return resp.text.strip()
            
            try:
                executor = ThreadPoolExecutor(max_workers=1)
                future = executor.submit(_call_gemini, prompt)
                analysis_text = future.result(timeout=30)
                logger.info(f"Analysis generated ({len(analysis_text)} chars)")
                
            except (TimeoutError, FuturesTimeoutError, Exception) as e:
                logger.error(f"API Failed: {str(e)}")
                # Return cleanly formatted error JSON
                return {
                    "analysis": f"Error generating legal analysis: {str(e)}",
                    "method": "api_error",
                    "domain": domain,
                    "sections_analyzed": len(sections),
                    "facts_length": len(facts),
                    "has_evidence": evidence is not None,
                    "error": str(e)
                }
            finally:
                # IMPORTANT: wait=False prevents main thread from deadlocking if worker hangs
                if 'executor' in locals():
                    executor.shutdown(wait=False)
            
            # Structure the result
            result = {
                "analysis": analysis_text,
                "method": "gemini_api",
                "domain": domain,
                "sections_analyzed": len(sections),
                "facts_length": len(facts),
                "has_evidence": evidence is not None
            }
            
            # Add section summary
            result["sections_summary"] = [
                {
                    "act": s.get("act"),
                    "section": s.get("section"),
                    "title": s.get("title")
                }
                for s in sections
            ]
            
            return result
            
        except Exception as e:
            logger.error(f"Legal analysis error: {str(e)}")
            # Fall back to template analysis on any error
            try:
                analysis_text = self.generate_template_analysis(facts, sections, domain)
                return {
                    "analysis": analysis_text,
                    "method": "template_fallback",
                    "domain": domain,
                    "sections_analyzed": len(sections),
                    "error": str(e)
                }
            except:
                return {
                    "analysis": f"Error during analysis: {str(e)}",
                    "method": "error",
                    "error": str(e)
                }
    
    def generate_template_analysis(
        self,
        facts: str,
        sections: List[Dict[str, Any]],
        domain: Optional[str] = None
    ) -> str:
        """
        Generate a template-based analysis (fallback when API is not available).
        
        Args:
            facts: Case facts
            sections: Relevant legal sections
            domain: Legal domain
            
        Returns:
            Template-based analysis text
        """
        analysis = f"# Legal Analysis\n\n"
        analysis += f"**Domain:** {domain or 'Not specified'}\n\n"
        
        analysis += f"## Case Facts\n{facts}\n\n"
        
        analysis += f"## Applicable Legal Sections\n\n"
        for section in sections:
            act = section.get("act", "Unknown")
            section_num = section.get("section", "N/A")
            title = section.get("title", "")
            punishment = section.get("punishment", "")
            
            analysis += f"### {act} Section {section_num}: {title}\n"
            if punishment:
                analysis += f"**Punishment:** {punishment}\n"
            analysis += "\n"
        
        analysis += f"## Analysis\n\n"
        analysis += f"Based on the facts presented, the following sections may be applicable:\n\n"
        
        for i, section in enumerate(sections, 1):
            act = section.get("act", "Unknown")
            section_num = section.get("section", "N/A")
            title = section.get("title", "")
            
            analysis += f"{i}. **{act} Section {section_num}** ({title}): "
            analysis += f"The facts suggest potential applicability of this section. "
            analysis += f"Further investigation and legal consultation is recommended.\n\n"
        
        analysis += "**Note:** This is a template-based analysis. For detailed legal reasoning, please configure the Gemini API key.\n"
        
        return analysis


# Global instance
legal_analyzer = LegalAnalyzer()


if __name__ == "__main__":
    # Test the legal analyzer
    print("Legal Analyzer Test")
    print("=" * 50)
    
    test_facts = "The accused assaulted the victim causing injuries."
    test_sections = [
        {
            "act": "IPC",
            "section": "323",
            "title": "Punishment for voluntarily causing hurt",
            "description": "Whoever voluntarily causes hurt...",
            "punishment": "Imprisonment up to 1 year or fine"
        }
    ]
    
    result = legal_analyzer.analyze_case(
        facts=test_facts,
        sections=test_sections,
        domain="Criminal"
    )
    
    print(f"\nMethod: {result['method']}")
    print(f"\nAnalysis:\n{result['analysis'][:500]}...")
