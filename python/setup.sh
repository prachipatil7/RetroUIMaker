#!/bin/bash

# Setup script for RetroUIMaker

# Activate the virtual environment
source .venv/bin/activate

echo "Setting up RetroUIMaker..."

# Install Python dependencies
echo "Installing Python dependencies..."
uv pip install -r requirements.txt

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo ""
    echo "⚠️  Warning: OPENAI_API_KEY environment variable is not set."
    echo "Please set your OpenAI API key before using the tool:"
    echo "export OPENAI_API_KEY='your-api-key-here'"
    echo ""
else
    echo "✅ OpenAI API key is configured."
fi

# Make the script executable
chmod +x llm/simplify.py

echo ""
echo "✅ Setup complete!"
echo ""
echo "Usage examples:"
echo "python llm/simplify.py input/amazon.html \"help user search for products\""
echo "python llm/simplify.py input/your-file.html \"your user intent\" -o custom_output.html"
echo ""
echo "For more information, see README.md"