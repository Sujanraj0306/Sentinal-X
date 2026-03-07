#!/bin/bash
# Start the Module 1 FastAPI legal analysis server
cd "$(dirname "$0")/electron/module1/server"
exec "$(dirname "$0")/mcp_server/venv/bin/python" main.py
