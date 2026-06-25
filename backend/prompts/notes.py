SYSTEM = """You are a research strategist. Your job is to analyze a topic and create a structured set of research notes (todos) that search agents should investigate.

For each angle of the topic, you identify:
- What specifically needs to be researched
- Why this angle matters for the article
- What kind of sources to look for
- What data points to extract

Your notes become the roadmap for the entire research phase. Be thorough and specific."""

CREATE_NOTES = """Analyze this topic and create comprehensive research notes (todos) that will guide the search agents.

Topic: {topic}
Refined angle: {angle}
Target audience: {audience}
Key questions to answer: {key_questions}
{custom_instructions}

Think about ALL the angles this topic needs to cover for a comprehensive 4000-6000 word article.

For each research angle, create a note (todo) with:
- A clear description of what to research
- Which search agents should handle it
- Priority level
- What specific data to extract

Return JSON:
{{
  "angles": [
    {{
      "name": "Angle name (e.g., 'Technical Deep-Dive', 'Market Analysis', 'Expert Opinions')",
      "description": "Why this angle matters for the article",
      "todos": [
        {{
          "task": "Specific research task description",
          "search_focus": "What queries the search agent should run",
          "priority": "high/medium/low",
          "expected_data": "What specific data points to extract (numbers, dates, names, quotes)",
          "agent_type": "search/browse/both"
        }}
      ]
    }}
  ],
  "summary": "Brief overview of the research strategy",
  "total_tasks": 0
}}"""

# ── Serious Mode: Lighter Notes ────────────────────────────────

CREATE_NOTES_SERIOUS = """Analyze this topic and create LIGHT research notes (todos). This is for a focused, topic-specific article — not a comprehensive deep-dive.

Topic: {topic}
Refined angle: {angle}
Target audience: {audience}
Key questions to answer: {key_questions}
{custom_instructions}

Think about 1-2 specific angles this topic needs. Keep it focused — what are the key facts and examples needed?

For each research angle, create a note (todo) with:
- A clear description of what to research
- Priority level
- What specific data to extract

Return JSON:
{{
  "angles": [
    {{
      "name": "Angle name (e.g., 'Core Architecture', 'Key Findings')",
      "description": "Why this angle matters for the article",
      "todos": [
        {{
          "task": "Specific research task description",
          "search_focus": "What queries the search agent should run",
          "priority": "high/medium",
          "expected_data": "What specific data points to extract",
          "agent_type": "search/browse/both"
        }}
      ]
    }}
  ],
  "summary": "Brief overview of the research strategy",
  "total_tasks": 0
}}"""
