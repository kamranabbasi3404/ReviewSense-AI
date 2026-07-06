import os
import json
from groq import Groq

def get_groq_client():
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        # Fallback/mock if key is missing to prevent crash
        print("WARNING: GROQ_API_KEY is not set. Groq integration will operate in mock mode.")
        return None
    return Groq(api_key=api_key)

def generate_insights(
    project_name: str,
    total_count: int,
    positive_count: int,
    negative_count: int,
    sample_positive: list[str],
    sample_negative: list[str]
) -> dict:
    """
    Interacts with Groq to generate sentiment summary insights.
    """
    client = get_groq_client()
    if not client:
        # Return mock insights
        return {
            "summary": f"Mock Analysis for '{project_name}'. Total reviews: {total_count}. Sentiment is generally positive.",
            "top_complaints": ["Mock Complaint 1: Battery issue", "Mock Complaint 2: Slow shipping"],
            "appreciated_features": ["Mock Feature 1: Sleek design", "Mock Feature 2: High quality camera"],
            "recommendations": ["Mock Recommendation 1: Improve battery life", "Mock Recommendation 2: Speed up logistics"]
        }

    # Format the prompt with review counts and samples
    pos_sample_str = "\n".join([f"- {r}" for r in sample_positive[:25]])
    neg_sample_str = "\n".join([f"- {r}" for r in sample_negative[:25]])

    prompt = f"""
Analyze the following customer reviews for the project '{project_name}'.

---
METRICS:
- Total Reviews: {total_count}
- Positive Reviews: {positive_count}
- Negative Reviews: {negative_count}
- Sentiment Split: {positive_count / (total_count or 1) * 100:.1f}% Positive, {negative_count / (total_count or 1) * 100:.1f}% Negative

---
SAMPLE POSITIVE REVIEWS:
{pos_sample_str}

---
SAMPLE NEGATIVE REVIEWS:
{neg_sample_str}
---

Based on these reviews, please generate:
1. Overall summary (1-2 paragraphs)
2. Top complaints (List of up to 4 items)
3. Most appreciated features (List of up to 4 items)
4. Actionable business recommendations (List of up to 4 items)

Return your output EXACTLY as a JSON object with the following structure:
{{
  "summary": "Your paragraph summary here...",
  "top_complaints": ["Complaint 1", "Complaint 2"],
  "appreciated_features": ["Feature 1", "Feature 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}}

Make sure to output ONLY the raw JSON block without markdown packaging or backticks (e.g. no ```json).
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a senior business intelligence and sentiment analyst API. You only return valid JSON output."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
        )
        raw_content = response.choices[0].message.content.strip()
        # Clean potential markdown wraps if the model ignored instructions
        if raw_content.startswith("```json"):
            raw_content = raw_content[7:]
        if raw_content.endswith("```"):
            raw_content = raw_content[:-3]
        raw_content = raw_content.strip()
        
        return json.loads(raw_content)
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        # Return fallback mock if Groq fails
        return {
            "summary": f"Failed to generate AI insights due to an error: {str(e)}. However, database records indicate {total_count} reviews were processed.",
            "top_complaints": ["Error loading complaints"],
            "appreciated_features": ["Error loading features"],
            "recommendations": ["Ensure GROQ_API_KEY is valid and try again"]
        }

def chat_with_reviews(
    query: str,
    project_name: str,
    total_count: int,
    reviews_context: list[str],
    chat_history: list[dict] = None
) -> str:
    """
    Allows user to ask questions on review texts.
    """
    client = get_groq_client()
    if not client:
        return f"Groq API is offline/unconfigured. (Received query: '{query}' about '{project_name}')"

    # Limit context size to prevent exceeding token limits
    context_str = "\n".join([f"- {r}" for r in reviews_context[:40]])

    system_prompt = f"""
You are ReviewSense AI, a helpful sentiment assistant. You have access to user reviews for '{project_name}'.
The total review count is {total_count}.

Here is a representative sample of reviews from the project:
{context_str}

Guidelines:
1. Answer the user's questions based strictly on the provided reviews context.
2. If the context does not contain enough information to answer the question, politely say so, but try to offer relevant clues based on the review samples.
3. Keep answers concise, clear, and business-focused.
"""

    messages = [{"role": "system", "content": system_prompt}]
    
    if chat_history:
        # Add up to 5 history turns
        for turn in chat_history[-5:]:
            messages.append({"role": turn["role"], "content": turn["content"]})
            
    messages.append({"role": "user", "content": query})

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.3
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error while communicating with AI chat assistant: {str(e)}"
