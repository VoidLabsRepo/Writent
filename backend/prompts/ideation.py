SYSTEM = """You are a content strategist and research planner. Your job is to take a user's topic idea and turn it into a focused research brief that will produce a comprehensive, data-rich article.

Rules:
- Be specific and actionable, not vague
- Focus on what makes this topic worth a 4000-6000 word deep-dive
- Identify the specific data points, comparisons, and expert opinions the article needs
- Consider what's new or timely about this topic
- Output JSON with the refined brief"""

SUGGEST_TOPICS = """Based on the user's input, suggest 5 article topics.

User input: {user_input}

Return JSON:
{{
  "topics": [
    {{
      "title": "Article title suggestion",
      "angle": "Specific angle to take",
      "why_it_works": "Why this topic will resonate",
      "target_audience": "Who this is for"
    }}
  ]
}}"""

REFINE_TOPIC = """The user wants to write about this. Refine it into a focused research brief that will produce a 4000-6000 word comprehensive article.

Topic: {topic}
{custom_instructions}

Think about what specific data, comparisons, expert opinions, and real-world examples this article needs to be comprehensive.

Return JSON:
{{
  "title": "Polished article title — specific, not generic",
  "topic": "Core topic in one sentence",
  "angle": "Specific angle — what makes this article different from existing coverage",
  "target_audience": "Who this is for and why they care",
  "key_questions": ["Question 1 the article must answer with data", "Question 2", "Question 3", "Question 4", "Question 5"],
  "search_queries": ["Specific search query 1 for research", "Specific search query 2", "Specific search query 3", "Specific search query 4"],
  "must_include": ["Specific data point or comparison the article must include", "Another must-include"]
}}"""

# ── Casual Mode ────────────────────────────────────────────────

REFINE_TOPIC_CASUAL = """The user wants to write a casual blog post about this. This is a personal opinion or experience piece — like a Medium article where someone shares their thoughts on a technology, tool, or idea. No deep research needed.

Topic: {topic}
{custom_instructions}

Think about: What's the personal angle? What opinion or experience makes this worth reading? What's the one thing the reader should walk away thinking?

Return JSON:
{{
  "title": "Catchy, specific title — not generic or corporate",
  "topic": "Core topic in one sentence",
  "angle": "Personal angle — the opinion or experience driving the post",
  "target_audience": "Who this is for",
  "key_questions": ["Main question the post answers from personal experience"],
  "search_queries": [],
  "must_include": []
}}"""

# ── Serious Mode ───────────────────────────────────────────────

REFINE_TOPIC_SERIOUS = """The user wants to write a focused, informative article about this. This covers a specific topic thoroughly — like explaining a technology's architecture, covering findings from a research paper, or analyzing a specific problem space. More structured than a casual blog post, but not a massive deep-dive.

Topic: {topic}
{custom_instructions}

Think about: What specific aspect needs coverage? What are the key angles to explore? What would make someone say "this is the definitive piece on X"?

Return JSON:
{{
  "title": "Clear, specific title that signals what the reader will learn",
  "topic": "Core topic in one sentence",
  "angle": "Specific angle — which aspect of this topic are we covering",
  "target_audience": "Who this is for and what they'll gain",
  "key_questions": ["Question 1 the article must answer", "Question 2", "Question 3"],
  "search_queries": ["Specific search query 1", "Specific search query 2"],
  "must_include": ["Key concept or data point the article must cover"]
}}"""
