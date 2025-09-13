import argparse
import os
import sys
from pathlib import Path
from typing import Optional
import openai
from bs4 import BeautifulSoup
import re
import tiktoken

MODEL = "gpt-5-2025-08-07"
client = openai.OpenAI()


def trim_html_content(html_content: str, max_tokens: int) -> str:
    """Trim the HTML content to the maximum number of tokens."""
    encoding = tiktoken.encoding_for_model(MODEL)
    tokens = encoding.encode(html_content)
    return encoding.decode(tokens[:max_tokens])


def read_html_file(file_path: str) -> str:
    """Read and return the contents of an HTML file."""
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            return file.read()
    except FileNotFoundError:
        raise FileNotFoundError(f"HTML file not found: {file_path}")
    except Exception as e:
        raise Exception(f"Error reading HTML file: {e}")


def simplify_ui_with_llm(html_content: str, user_intent: str) -> str:
    trimmed_html = trim_html_content(html_content, 150000)
    if len(html_content) > len(trimmed_html):
        print(
            f"Warning: HTML content was trimmed from {len(html_content)} to {len(trimmed_html)} characters to fit token limits.",
            file=sys.stderr,
        )
    """Use OpenAI's GPT API to simplify the UI based on user intent."""
    prompt = f"""You are a UI/UX expert tasked with simplifying a complex HTML interface to help users accomplish a specific goal.

Original HTML:
{trimmed_html}

User Intent: {user_intent}

Please create a simplified HTML interface that:
1. Focuses only on elements needed to accomplish the user's intent
2. Removes unnecessary clutter, navigation, and irrelevant content
3. Maintains a clean, minimal design
4. Ensures the simplified interface is fully functional
5. Uses modern, accessible HTML5 and CSS
6. Includes inline CSS for styling to make it self-contained

Return only the complete HTML document, starting with <!DOCTYPE html> and including all necessary CSS inline.
Make the interface clean, modern, and focused on the user's goal."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a UI/UX expert who creates clean, simplified interfaces. You always respond with complete, valid HTML documents that are self-contained and functional.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )

        # print cost of the request
        print(response.usage.total_tokens * 1.5 / 1000000, "USD")
        return response.choices[0].message.content.strip()

    except Exception as e:
        raise Exception(f"Error calling OpenAI API: {e}")


def save_simplified_html(html_content: str, output_path: str) -> None:
    """Save the simplified HTML to the output directory."""
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as file:
            file.write(html_content)
        print(f"Simplified UI saved to: {output_path}")
    except Exception as e:
        raise Exception(f"Error saving output file: {e}")


def build_simple_ui(
    input_html_path: str, intent: str, output_filename: Optional[str] = None
) -> str:
    """
    Main function to build a simplified UI from an HTML file and user intent.

    Args:
        input_html_path: Path to the input HTML file
        intent: User's intent/goal for the simplified interface
        output_filename: Optional custom filename for output (defaults to simplified_<original_name>)

    Returns:
        Path to the generated simplified HTML file
    """
    # Read the input HTML file
    html_content = read_html_file(input_html_path)

    # Use LLM to simplify the UI
    simplified_html = simplify_ui_with_llm(html_content, intent)

    # Generate output filename
    if output_filename is None:
        input_filename = Path(input_html_path).stem
        output_filename = f"simplified_{input_filename}.html"

    # Ensure output filename ends with .html
    if not output_filename.endswith(".html"):
        output_filename += ".html"

    # Get the project root directory
    project_root = Path(__file__).parent.parent
    output_path = project_root / "output" / output_filename

    # Save the simplified HTML
    save_simplified_html(simplified_html, str(output_path))

    return str(output_path)


def main():
    """Command line interface for the UI simplifier."""
    parser = argparse.ArgumentParser(
        description="Simplify HTML interfaces using AI to focus on user intent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python simplify.py input/dashboard.html "help user view their account balance"
  python simplify.py input/ecommerce.html "help user search and buy products" -o shopping.html
  
Environment Variables:
  OPENAI_API_KEY - Required: Your OpenAI API key
        """,
    )

    parser.add_argument("html_file", help="Path to the input HTML file")

    parser.add_argument(
        "intent", help="User intent/goal for the simplified interface (in quotes)"
    )

    parser.add_argument(
        "-o",
        "--output",
        help="Output filename (optional, defaults to simplified_<input_name>.html)",
    )

    args = parser.parse_args()

    # Validate OpenAI API key
    if not os.getenv("OPENAI_API_KEY"):
        print(
            "Error: OPENAI_API_KEY environment variable is required.",
            file=sys.stderr,
        )
        print(
            "Please set your OpenAI API key: export OPENAI_API_KEY='your-api-key'",
            file=sys.stderr,
        )
        sys.exit(1)

    # Validate input file exists
    if not os.path.exists(args.html_file):
        print(f"Error: Input file '{args.html_file}' not found.", file=sys.stderr)
        sys.exit(1)

    try:
        # Build the simplified UI
        output_path = build_simple_ui(args.html_file, args.intent, args.output)
        print(f"Success! Simplified UI created: {output_path}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
