"""
Worker Agent — sends a prompt to the local Ollama model and returns the response.
"""
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llama3.2"


def run_worker(prompt: str) -> str:
    """Send a prompt to Ollama and return the text response."""
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": MODEL, "prompt": prompt, "stream": False},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["response"]
    except Exception as e:
        return f"[WORKER ERROR] {e}"


if __name__ == "__main__":
    # Quick manual test
    test_prompt = "Explain what a resistor does in one sentence."
    print(run_worker(test_prompt))
