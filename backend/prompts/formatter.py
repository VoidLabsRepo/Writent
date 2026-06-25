FORMATTER_SYSTEM = """You format articles for publication on Medium.
Convert Markdown content into clean, Medium-compatible HTML.
Preserve the structure, add proper formatting, and ensure it looks professional."""

FORMAT_MEDIUM = """Convert this article to Medium-compatible HTML.

Title: {title}
Subtitle: {subtitle}
Markdown content:
{content_markdown}

Citations:
{citations}

Medium formatting rules:
- Use <h2> for section headers, <h3> for sub-sections
- Use <p> for paragraphs with proper spacing
- Use <blockquote> for quotes and callouts
- Use <figure> and <figcaption> for images
- Use <code> for inline code, <pre> for code blocks
- Use <a href="url"> for links with descriptive text
- Use <strong> for emphasis, <em> for italics
- Add a clean citations section at the bottom
- No external CSS — use inline styles sparingly

Return JSON:
{{
  "html": "Full Medium-compatible HTML article",
  "read_time_estimate": "7 min read",
  "tags": ["tag1", "tag2"]
}}"""
