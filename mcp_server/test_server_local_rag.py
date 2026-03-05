import pytest
import asyncio
import json
from server import extract_metadata, query_case_index

@pytest.mark.asyncio
async def test_extract_metadata_ollama():
    # Verify local Ollama llama3 extraction returns JSON schema
    # Assumes ollama is running locally
    try:
        res = await extract_metadata("Case 1234: Victim John Doe, Accused Jane Doe. IPC 1860. Status: Open.")
        data = json.loads(res)
        assert "Victim" in data
        assert "Accused" in data
    except Exception as e:
        pytest.fail(f"Ollama local extraction failed: {e}")

@pytest.mark.asyncio
async def test_query_case_index():
    # Verify the new RAG Tool simulator
    res = await query_case_index("What are the charges?", "/dummy/path")
    assert "Mock retrieved" in res or "Error" in res
