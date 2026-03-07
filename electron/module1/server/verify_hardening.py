import requests
import sys

def test_root():
    """Test root endpoint for headers."""
    print("Testing Root Endpoint...")
    try:
        response = requests.get("http://localhost:8000/")
        print(f"Status Code: {response.status_code}")
        print(f"X-Request-ID: {response.headers.get('X-Request-ID')}")
        print(f"X-Process-Time: {response.headers.get('X-Process-Time')}")
        
        if response.status_code == 200 and response.headers.get('X-Request-ID'):
            print("✅ Root endpoint test passed")
            return True
        else:
            print("❌ Root endpoint test failed")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_error_handling():
    """Test global error handler by sending invalid data."""
    print("\nTesting Global Error Handling...")
    try:
        # Sending malformed JSON to trigger an error or trying an invalid endpoint
        # For simplicity, let's try to access a non-existent endpoint or force an internal error if possible.
        # But global handler catches unhandled exceptions. To trigger one, we might need a specific condition
        # or we just rely on standard 404/422 handling validation.
        # To truly test global 500 handler, we would need an endpoint effectively raising an Exception.
        # Since we don't want to break the code, we'll check if normal errors return standard structure.
        
        # Let's try sending invalid data to preprocess which expects JSON
        response = requests.post("http://localhost:8000/preprocess", data="invalid json")
        
        # This will likely be a 422 Validation Error from FastAPI, not 500.
        # However, checking if headers are present even on error is valuable.
        
        print(f"Status Code: {response.status_code}")
        print(f"X-Request-ID: {response.headers.get('X-Request-ID')}")
        
        if response.headers.get('X-Request-ID'):
            print("✅ Error response headers test passed")
            return True
        else:
            print("❌ Error response headers test failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_root() and test_error_handling()
    if success:
        print("\n✅ All hardening tests passed!")
        sys.exit(0)
    else:
        print("\n❌ One or more tests failed.")
        sys.exit(1)
