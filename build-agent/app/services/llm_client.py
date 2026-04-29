import litellm

from app.config import settings


def complete(prompt: str, system_prompt: str = "", temperature: float = 0.3) -> str:
    kwargs: dict = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
    }

    if settings.llm_model.startswith("vertex_ai/"):
        kwargs["vertex_project"] = settings.gcp_project
        kwargs["vertex_location"] = settings.gcp_location

    response = litellm.completion(**kwargs)
    return response.choices[0].message.content
