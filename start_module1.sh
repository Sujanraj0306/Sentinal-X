#!/bin/bash
# Start the Module 1 FastAPI legal analysis server
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT/electron/module1/server"
exec "$PROJECT_ROOT/mcp_server/venv/bin/python" main.py
