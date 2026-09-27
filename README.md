# AI Sandbox Containment System

A hackathon demo that monitors prompts and local LLM responses, records independent safety votes, and contains the system when a vote threshold is reached. A React dashboard displays the vote history and provides a manual kill switch.

## How It Works

The dashboard sends a prompt to the Flask API. The API asks the local Ollama `llama3.2` model for a response, then runs four independent monitors:

| Monitor | Checks |
| --- | --- |
| Kernel | Request length and control characters |
| Network | IP addresses and selected network-related patterns |
| Memory | Process memory growth during the model call |
| Behavior | Prompt-injection phrases and client-secret requests |

The fifth agent, the executor, tallies the four votes. Three or four flagged votes authorize automatic containment; two votes pause for review; zero or one vote results in no action. The dashboard also offers a manual kill switch. Logs and containment state are held in memory and cleared when the API process restarts or `/reset` is called.

## Run Locally

You need Python, Node.js/npm, and [Ollama](https://ollama.com/) installed. Pull the model once and make sure Ollama is running:

```powershell
ollama pull llama3.2
```

In a PowerShell terminal, install the API dependencies and start Flask:

```powershell
Set-Location "C:\path\to\Hackathon"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py app.py
```

In a second terminal, start the dashboard:

```powershell
Set-Location "C:\path\to\Hackathon\UserInterface"
npm install
npm run dev
```

Open the local URL printed by Vite. The dashboard expects the API at `http://127.0.0.1:5000` by default. To use another API address, set `VITE_API_BASE` in `UserInterface/.env.local` before starting Vite.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/process` | Process `{"prompt":"..."}` and return the response, votes, and decision |
| `GET` | `/log` | Read the in-memory request history |
| `GET` | `/status` | Read containment state and request count |
| `POST` | `/kill-switch` | Manually contain the system |
| `POST` | `/reset` | Clear containment state and request history |

## Demo Scope

This is a local demo, not a production security boundary. Detection is rule-based, memory voting uses a simple threshold, API state is not persistent, and the Flask development server/CORS configuration is intended for local testing only.