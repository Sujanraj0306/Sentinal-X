import subprocess
import json
try:
    res = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True)
    print(res.stdout)
except Exception as e:
    print(e)
