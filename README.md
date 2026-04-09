# Zeta

**Your Personalised PM Agent**

---

## Problem

**For Startups & Small Teams:**

In startups, product management responsibilities often fall on devrels, team leads, or solo founders who don't have dedicated PM resources. These individuals waste 40% of their week on manual PM work: writing notes, drafting PRDs, creating Jira tickets, translating meetings into actionable plans, and planning sprints.

This time could be better spent **building the MVP** and shipping product features.

Heizen PM Agent started solving this but locks features behind enterprise sales (not startup-friendly), offers limited integrations, forces vendor lock-in, and is too expensive for early-stage startups.

---

## Solution

Zeta is an AI Product Manager agent designed for **startups** that automates ideation, planning, and analysis—so devrels, team leads, and solo founders can focus solely on **building their MVP** instead of paperwork.

**Automates:**
- **Ideation** - Captures and structures ideas from meetings
- **Planning** - Converts discussions into sprints and backlogs  
- **Analysis** - Generates PRDs, user stories, and insights

Built specifically for startups, not enterprise. Affordable. Works for solo founders.

---

## Core Features

🤖 **AI Meeting Analysis** - Auto-joins calls, transcribes with speaker ID, generates MOMs, action plans using Groq's Meta Llama  
🎙️ **Meeting Transcription** - Real-time speech-to-text from any meeting  
📋 **MOM Generation** - Automatic meeting minutes with decision tracking  
✅ **Action Plan Creation** - Identifies and assigns action items from discussions  
⚡ **One-Click PRD Generation** - Meeting → structured Product Requirement Documents  
🎯 **Smart User Stories** - Formatted stories with acceptance criteria & point estimates  
🚀 **Intelligent Sprint Planning** - AI creates sprint plans from goals & backlog  
🔗 **Deep Integrations** - Push to Jira, Linear, Trello, ClickUp, Slack, Figma  
🔒 **Privacy-First** - Local audio processing, no data exfiltration without consent  
🎨 **Beautiful Vintage Design** - Toggle between modern UI and signature B&W aesthetic  
📱 **Fully Responsive** - Works on desktop, tablet, mobile  

---

## Heizen vs Zeta: Feature Comparison

| Feature | Heizen PM Agent | Zeta |
|---------|-----------------|------|
| **Meeting Capture** | Chrome extension, cloud-only | Chrome extension + local processing option |
| **PRD Generation** | Generic format | Industry-standard templates |
| **User Stories** | Manual creation | Auto-generated with estimates |
| **Sprint Planning** | Basic planning | AI + velocity analysis |
| **Integrations** | Jira, Trello (2 tools) | Jira, Linear, Trello, ClickUp, Slack, Figma, GitHub (7+ tools) |
| **Pricing** | Hidden, sales-led ($$$) | Transparent, self-serve ($29-79/user) |
| **Privacy** | Cloud-only | Local processing toggle |
| **Design** | Generic modern | Vintage aesthetic (your signature) |

---

## Tech Stack

**Frontend**: React 19 + TypeScript + Tailwind CSS  
**AI**: Groq SDK (Meta Llama) + multi-LLM routing  
**Audio**: Web Speech API + Deepgram  
**Current Mode**: Frontend design-only (no backend integration)  

---

## Getting Started

```bash
cd frontend
npm install && npm run dev
# Visit localhost:5173
```

## OAuth Setup (Auth0)

Create `frontend/.env` with:

```bash
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=your-api-audience-optional
```

Use `http://localhost:5173/login` as the allowed callback URL in Auth0.

---

**Built for PMs who ship. Not for paperwork.**
