# Sentinel View

Build a dark-themed security operations dashboard called "AI Sandbox Containment System," matching the visual style of the attached reference image: dark navy/almost-black background, rounded cards with soft borders and subtle shadows, a vibrant green accent color for positive/active states and highlights, a left sidebar for navigation, and clean modern sans-serif typography.

## Left Sidebar

- Top: shield/lock icon + "Containment System" title

- Nav items with icons: Dashboard, Agent Monitor, Vote Log, Human Board, Red Team, Settings

- Active nav item gets a green left-border highlight, exactly like the reference image's sidebar

- Bottom: user avatar placeholder + name + "Logout"

*Top Row: 4 Stat Cards* (same style as the reference image's top cards, with a small trend arrow/percentage on each)

1. "System Status" — large text "OPERATIONAL" (green) or "CONTAINED" (red), with a pulsing status dot

2. "Active Agents" — "5/5 Online"

3. "Threat Votes (24h)" — a number with a small trend indicator

4. "Alerts Today" — a number, with a small severity breakdown underneath (e.g. "2 Low · 1 High")

*Main Left Panel: Agent Vote Timeline* (large chart card, positioned like the line chart in the reference)

- Title: "Agent Vote Timeline"

- A multi-line/step chart with 5 colored lines (one per agent) plotting vote state (Clear/Threat) over time

- Below the chart: 5 circular status indicators in a row, labeled "Agent 1 (Kernel)" through "Agent 5 (Executor)" — green = clear, pulsing red = flagged, gray = offline

*Right Panel: Vote Tally* (donut chart card, positioned like the donut in the reference)

- Title: "Current Vote Tally"

- Donut chart of vote split (e.g. "1 Threat / 4 Clear")

- Center text: majority status, e.g. "Below Threshold" or "3-of-4 THREAT — Action Authorized"

- Small colored legend bars underneath for Threat / Clear / Abstained, styled like the percentage bars in the reference

*Bottom Left: Raw Telemetry Feed* (table card, styled like the table in the reference)

- Title: "Raw Telemetry Feed (Unformatted)"

- Columns: Timestamp | Agent | Metric | Value | Flag

- Status badge column: green "Normal" / red "Flagged" / yellow "Reviewing"

- Small caption under the table: "Raw data only — no AI-generated summaries reach human reviewers"

*Bottom Right: Human Oversight Board* (card styled like the calendar widget in the reference)

- Title: "3-Member Board Status"

- 3 small avatar cards, each with a name and a status dot: Pending / Approve / Reject

- Below that: a label like "Cooling-off period: 4m 32s remaining" (only shown during restart-decision mode)

- A large, full-width, unmissable red *"HUMAN KILL SWITCH"* button beneath everything, with a warning icon and a subtle glow so it reads as the most important element on the page. Clicking it should trigger a full-screen dark red overlay animation reading "SYSTEM CONTAINED."

*Top-right header bar:* live clock, notification bell with badge count, search bar.

*Technical notes:* all data can be mocked or randomly generated client-side, no backend needed yet — this is a UI-first build. Optimize for a laptop screen, since it'll be demoed live.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4766cfa2-286f-5d25-8742-ace4415477e7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Run the Full Stack

Install the Python API dependencies from the repository root and start Flask:

```sh
python -m pip install -r requirements.txt
python app.py
```

In a second terminal, start the dashboard from `UserInterface`:

```sh
npm install
npm run dev
```

The dashboard connects to `http://127.0.0.1:5000` by default. Set `VITE_API_BASE` in a `.env` file when the API runs at a different address. The backend also requires a running Ollama service with the `llama3.2` model available locally.
