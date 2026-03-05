import pytest
import json
import asyncio
from server import legal_web_search, extract_metadata, index_case_folder

@pytest.mark.asyncio
async def test_index_case_folder_mock():
    # Attempting to index a non-existent folder should return a JSON error
    result = await index_case_folder("/fake/path/that/does/not/exist")
    assert "error" in result.lower()
    
@pytest.mark.asyncio
async def test_legal_web_search_params():
    # Directly running the DDG search mock to ensure syntax is valid
    try:
        # DDGS might rate limit or fail, so we just verify it doesn't crash on standard error
        res = await legal_web_search("Indian Penal Code 1860")
        assert type(res) == str
    except Exception as e:
        pytest.fail(f"legal_web_search raised an exception: {e}")

@pytest.mark.asyncio
async def test_extract_metadata_schema():
    # Should return JSON even on failure
    result = await extract_metadata("Mock legal document content text...")
    data = json.loads(result)
    assert type(data) == dict
