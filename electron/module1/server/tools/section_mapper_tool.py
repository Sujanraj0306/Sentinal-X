"""
Section Mapper Tool for Legal Case Analysis

Maps legal issues to relevant sections of:
- IPC (Indian Penal Code)
- BNS (Bharatiya Nyaya Sanhita)
- IT Act (Information Technology Act)
- CrPC (Code of Criminal Procedure)
"""

import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SectionMapper:
    """Maps legal issues to relevant legal sections."""
    
    def __init__(self, sections_file: Optional[str] = None):
        """
        Initialize the SectionMapper.
        
        Args:
            sections_file: Path to sections.json file
        """
        if sections_file is None:
            # Default path
            sections_file = Path(__file__).parent.parent / "data" / "sections.json"
        
        self.sections_file = Path(sections_file)
        self.sections_data = {}
        self.load_sections()
    
    def load_sections(self):
        """Load sections from JSON file."""
        try:
            if not self.sections_file.exists():
                logger.error(f"Sections file not found: {self.sections_file}")
                return
            
            with open(self.sections_file, 'r', encoding='utf-8') as f:
                self.sections_data = json.load(f)
            
            logger.info(f"Loaded sections from {self.sections_file}")
            logger.info(f"Available acts: {list(self.sections_data.keys())}")
            
        except Exception as e:
            logger.error(f"Error loading sections: {str(e)}")
    
    def get_sections_for_issue(
        self, 
        issue: str, 
        acts: Optional[List[str]] = None
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get relevant sections for a legal issue.
        
        Args:
            issue: Legal issue (e.g., "Assault", "Theft")
            acts: List of acts to search (default: all)
            
        Returns:
            Dict with sections from each act
        """
        if acts is None:
            acts = ["IPC", "BNS", "IT_ACT", "CrPC"]
        
        result = {}
        
        for act in acts:
            if act not in self.sections_data:
                continue
            
            act_data = self.sections_data[act]
            
            # Handle note field
            if isinstance(act_data, dict) and "note" in act_data:
                result[f"{act}_note"] = act_data["note"]
                # Remove note from search
                act_data = {k: v for k, v in act_data.items() if k != "note"}
            
            # Search for issue
            if issue in act_data:
                result[act] = act_data[issue]
            else:
                # Try fuzzy matching
                for key in act_data.keys():
                    if issue.lower() in key.lower() or key.lower() in issue.lower():
                        result[act] = act_data[key]
                        break
        
        return result
    
    def map_sections(
        self,
        domain: str,
        primary_issue: str,
        secondary_issues: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Map legal issues to sections.
        
        Args:
            domain: Legal domain (Criminal, Civil, etc.)
            primary_issue: Primary legal issue
            secondary_issues: List of secondary issues
            
        Returns:
            Dict with mapped sections
        """
        try:
            logger.info(f"Mapping sections for: Domain={domain}, Issue={primary_issue}")
            
            result = {
                "domain": domain,
                "primary_issue": primary_issue,
                "primary_sections": {},
                "secondary_sections": {},
                "all_sections": []
            }
            
            # Determine which acts to use based on domain
            if domain == "Cyber":
                acts = ["IT_ACT", "IPC", "BNS"]
            elif domain in ["Criminal", "Family"]:
                acts = ["IPC", "BNS", "CrPC"]
            else:
                acts = ["IPC", "BNS"]
            
            # Get sections for primary issue
            primary_sections = self.get_sections_for_issue(primary_issue, acts)
            result["primary_sections"] = primary_sections
            
            # Collect all sections
            for act, sections in primary_sections.items():
                if not act.endswith("_note") and isinstance(sections, list):
                    for section in sections:
                        result["all_sections"].append({
                            "act": act,
                            "issue": primary_issue,
                            "type": "primary",
                            **section
                        })
            
            # Get sections for secondary issues
            if secondary_issues:
                for sec_issue in secondary_issues:
                    sec_sections = self.get_sections_for_issue(sec_issue, acts)
                    result["secondary_sections"][sec_issue] = sec_sections
                    
                    # Add to all sections
                    for act, sections in sec_sections.items():
                        if not act.endswith("_note") and isinstance(sections, list):
                            for section in sections:
                                result["all_sections"].append({
                                    "act": act,
                                    "issue": sec_issue,
                                    "type": "secondary",
                                    **section
                                })
            
            # Summary
            result["summary"] = {
                "total_sections": len(result["all_sections"]),
                "acts_covered": list(set([s["act"] for s in result["all_sections"]])),
                "primary_sections_count": len([s for s in result["all_sections"] if s["type"] == "primary"]),
                "secondary_sections_count": len([s for s in result["all_sections"] if s["type"] == "secondary"])
            }
            
            logger.info(f"Mapped {len(result['all_sections'])} sections")
            
            return result
            
        except Exception as e:
            logger.error(f"Section mapping error: {str(e)}")
            return {
                "domain": domain,
                "primary_issue": primary_issue,
                "error": str(e),
                "all_sections": []
            }
    
    def get_section_details(self, act: str, section_number: str) -> Optional[Dict[str, Any]]:
        """
        Get details of a specific section.
        
        Args:
            act: Act name (IPC, BNS, IT_ACT, CrPC)
            section_number: Section number
            
        Returns:
            Section details or None
        """
        try:
            if act not in self.sections_data:
                return None
            
            act_data = self.sections_data[act]
            
            # Search through all issues
            for issue, sections in act_data.items():
                if issue == "note":
                    continue
                
                if isinstance(sections, list):
                    for section in sections:
                        if section.get("section") == section_number:
                            return {
                                "act": act,
                                "issue": issue,
                                **section
                            }
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting section details: {str(e)}")
            return None
    
    def search_sections(self, query: str) -> List[Dict[str, Any]]:
        """
        Search sections by keyword.
        
        Args:
            query: Search query
            
        Returns:
            List of matching sections
        """
        results = []
        query_lower = query.lower()
        
        try:
            for act, act_data in self.sections_data.items():
                if isinstance(act_data, dict):
                    for issue, sections in act_data.items():
                        if issue == "note":
                            continue
                        
                        if isinstance(sections, list):
                            for section in sections:
                                # Search in title, description, section number
                                if (query_lower in section.get("title", "").lower() or
                                    query_lower in section.get("description", "").lower() or
                                    query_lower in section.get("section", "")):
                                    results.append({
                                        "act": act,
                                        "issue": issue,
                                        **section
                                    })
            
            logger.info(f"Found {len(results)} sections matching '{query}'")
            return results
            
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return []


# Global instance
section_mapper = SectionMapper()


if __name__ == "__main__":
    # Test the section mapper
    print("Section Mapper Test")
    print("=" * 50)
    
    # Test 1: Assault
    result = section_mapper.map_sections("Criminal", "Assault")
    print(f"\nTest 1: Assault")
    print(f"Total sections: {result['summary']['total_sections']}")
    print(f"Acts covered: {result['summary']['acts_covered']}")
    
    if result['all_sections']:
        print("\nSections:")
        for section in result['all_sections'][:3]:  # Show first 3
            print(f"  {section['act']} {section['section']}: {section['title']}")
    
    # Test 2: Phishing
    result = section_mapper.map_sections("Cyber", "Phishing")
    print(f"\nTest 2: Phishing")
    print(f"Total sections: {result['summary']['total_sections']}")
    print(f"Acts covered: {result['summary']['acts_covered']}")
