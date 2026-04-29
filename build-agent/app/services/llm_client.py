import litellm

from app.config import settings


def complete(prompt: str, system_prompt: str = "", temperature: float = 0.3) -> str:
    response = litellm.completion(
        model=settings.llm_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content
