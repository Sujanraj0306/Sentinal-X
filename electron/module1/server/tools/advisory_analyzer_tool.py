"""
Advisory Analyzer Tool

Generates legal advisory analysis using Gemini API with RAG-retrieved context.
Provides step-by-step guidance for pre-litigation advisory cases.
"""

import logging
import os
from typing import Dict, Any, List
import google.generativeai as genai
from datetime import datetime

logger = logging.getLogger(__name__)


class AdvisoryAnalyzer:
    """Generates advisory legal analysis using Gemini API."""
    
    def __init__(self):
        """Initialize the advisory analyzer."""
        logger.info("Initializing Advisory Analyzer...")
        
        # Configure Gemini API
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY not found in environment")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            logger.info("Gemini API configured successfully")
    
    def analyze_advisory(
        self,
        client_objective: str,
        background: str,
        domain: str,
        retrieved_docs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate advisory analysis.
        
        Args:
            client_objective: Client's stated objective
            background: Background details
            domain: Advisory domain
            retrieved_docs: RAG-retrieved relevant documents
            
        Returns:
            Dict with advisory analysis
        """
        try:
            logger.info(f"Generating advisory analysis for domain: {domain}")
            
            if not self.model:
                logger.warning("Gemini API not configured, using fallback")
                return self._fallback_analysis(client_objective, background, domain)
            
            # Prepare context from retrieved documents
            context = self._prepare_context(retrieved_docs)
            
            # Create prompt
            prompt = self._create_advisory_prompt(
                client_objective,
                background,
                domain,
                context
            )
            
            # Generate analysis with timeout
            try:
                response = self.model.generate_content(
                    prompt,
                    request_options={"timeout": 30}
                )
                analysis_text = response.text
                
                result = {
                    "analysis": analysis_text,
                    "domain": domain,
                    "generated_at": datetime.now().isoformat(),
                    "model_used": "gemini-1.5-flash",
                    "context_docs_count": len(retrieved_docs)
                }
                
                logger.info("Advisory analysis generated successfully")
                return result
                
            except Exception as api_error:
                logger.error(f"Gemini API error: {str(api_error)}")
                logger.info("Falling back to template-based analysis")
                return self._fallback_analysis(client_objective, background, domain)
            
        except Exception as e:
            logger.error(f"Error generating advisory analysis: {str(e)}")
            return self._fallback_analysis(client_objective, background, domain)
    
    def _prepare_context(self, retrieved_docs: List[Dict[str, Any]]) -> str:
        """Prepare context from retrieved documents."""
        if not retrieved_docs:
            return "No specific legal provisions retrieved."
        
        context_parts = []
        for i, doc in enumerate(retrieved_docs[:5], 1):  # Top 5 docs
            text = doc.get("text", "")
            context_parts.append(f"**Reference {i}:**\n{text}\n")
        
        return "\n".join(context_parts)
    
    def _create_advisory_prompt(
        self,
        objective: str,
        background: str,
        domain: str,
        context: str
    ) -> str:
        """Create prompt for Gemini."""
        prompt = f"""You are a senior legal consultant providing pre-litigation advisory services in India.

**ADVISORY DOMAIN**: {domain}

**CLIENT OBJECTIVE**:
{objective}

**BACKGROUND DETAILS**:
{background}

**RELEVANT LEGAL PROVISIONS AND GUIDELINES**:
{context}

**YOUR TASK**:
Provide comprehensive legal advisory guidance in the following structure:

## 1. UNDERSTANDING THE OBJECTIVE
Clearly restate and analyze the client's objective.

## 2. LEGAL FRAMEWORK
Identify and explain the applicable laws, regulations, and legal provisions relevant to this matter.

## 3. KEY LEGAL CONSIDERATIONS
List and explain the critical legal points the client must understand.

## 4. COMPLIANCE CHECKLIST
Provide a detailed checklist of compliance requirements, documents needed, and steps to be taken.

## 5. RISK ANALYSIS
Identify potential legal risks, pitfalls, and areas of concern.

## 6. RECOMMENDED COURSE OF ACTION
Provide step-by-step recommendations with timelines and priorities.

## 7. DOCUMENTATION REQUIRED
List all documents that should be prepared, obtained, or verified.

## 8. ESTIMATED TIMELINE AND COSTS
Provide realistic estimates for the process.

## 9. PREVENTIVE MEASURES
Suggest measures to avoid future legal complications.

## 10. FINAL ADVISORY OPINION
Summarize your professional opinion and key takeaways.

**IMPORTANT GUIDELINES**:
- Be specific and actionable
- Cite relevant laws and provisions
- Use clear, professional language
- Provide practical, implementable advice
- Highlight critical deadlines and requirements
- Warn about common mistakes to avoid
- Format using markdown with clear headings and bullet points
- Use tables where appropriate for checklists

Generate the comprehensive advisory analysis now:
"""
        return prompt
    
    def _fallback_analysis(self, objective: str, background: str, domain: str) -> Dict[str, Any]:
        """Fallback analysis when Gemini API is unavailable."""
        analysis = f"""# ADVISORY ANALYSIS - {domain.upper()}

## CLIENT OBJECTIVE
{objective}

## BACKGROUND
{background}

## ADVISORY GUIDANCE

### Legal Framework
This matter falls under the {domain} domain. Relevant laws and regulations should be reviewed based on the specific circumstances.

### Key Considerations
1. Verify all legal requirements applicable to this matter
2. Ensure compliance with relevant statutes and regulations
3. Obtain necessary approvals and clearances
4. Maintain proper documentation
5. Seek professional legal opinion for complex aspects

### Compliance Checklist
- [ ] Identify all applicable laws and regulations
- [ ] Gather required documents
- [ ] Verify compliance requirements
- [ ] Obtain necessary registrations/licenses
- [ ] Prepare required agreements/contracts
- [ ] File necessary applications
- [ ] Maintain proper records

### Risk Analysis
**Potential Risks:**
- Non-compliance with legal requirements
- Inadequate documentation
- Missed deadlines
- Regulatory penalties

**Mitigation:**
- Conduct thorough due diligence
- Engage qualified legal professionals
- Maintain comprehensive documentation
- Monitor compliance regularly

### Recommended Actions
1. **Immediate**: Consult with a specialized {domain} lawyer
2. **Short-term**: Gather all relevant documents and information
3. **Medium-term**: Complete necessary compliance procedures
4. **Long-term**: Establish ongoing compliance mechanisms

### Documentation Required
- Identity and address proofs
- Relevant certificates and registrations
- Financial documents
- Agreements and contracts
- Compliance certificates

### Timeline
The process typically takes 2-8 weeks depending on complexity and specific requirements.

### Final Advisory
This is a preliminary advisory based on the information provided. It is strongly recommended to consult with a qualified legal professional specializing in {domain} law for detailed guidance specific to your circumstances.

**Note**: This analysis was generated using fallback template. For comprehensive AI-powered analysis, please ensure Gemini API is configured.
"""
        
        return {
            "analysis": analysis,
            "domain": domain,
            "generated_at": datetime.now().isoformat(),
            "model_used": "fallback_template",
            "context_docs_count": 0
        }


# Global instance
advisory_analyzer = AdvisoryAnalyzer()
