# RetroUIMaker

A tool that uses AI to simplify complex HTML interfaces based on user intent, creating focused, minimal UIs that help users accomplish specific goals.

## Features

- Parse complex HTML files and understand their structure
- Use OpenAI's GPT-4o to analyze and simplify interfaces
- Smart token management for large HTML files
- Generate clean, modern HTML with inline CSS
- Command-line interface for easy automation
- Configurable output filenames
- Comprehensive error handling

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set your OpenAI API key:
```bash
export OPENAI_API_KEY='your-api-key-here'
```

## Usage

### Basic Usage
```bash
python llm/simplify.py input/your-file.html "your user intent"
```

### With Custom Output Filename
```bash
python llm/simplify.py input/dashboard.html "help user view account balance" -o account_view.html
```

### Examples

```bash
# Simplify an e-commerce page for shopping
python llm/simplify.py input/ecommerce.html "help user search and buy products"

# Simplify a dashboard for viewing account info
python llm/simplify.py input/dashboard.html "help user view their account balance and recent transactions"

# Simplify a form for user registration
python llm/simplify.py input/signup.html "help user create a new account quickly"
```

## How It Works

1. **HTML Parsing**: Reads and validates the input HTML file
2. **LLM Analysis**: Sends the HTML and user intent to GPT-4o for analysis
3. **UI Simplification**: The AI removes unnecessary elements and focuses on the user's goal
4. **Output Generation**: Creates a new, simplified HTML file in the `output/` directory

## Project Structure

```
RetroUIMaker/
├── input/          # Place your original HTML files here
├── output/         # Simplified HTML files are generated here
├── llm/
│   └── simplify.py # Main script
├── requirements.txt
└── README.md
```

## Requirements

- Python 3.7+
- OpenAI API key
- Internet connection for API calls

## Error Handling

The tool includes comprehensive error handling for:
- Missing input files
- Invalid HTML content
- OpenAI API errors
- File system permissions
- Missing API keys

## Output

The simplified HTML files include:
- Clean, modern design
- Inline CSS for self-contained files
- Only elements necessary for the user's intent
- Accessible HTML5 structure
- Responsive design principles
