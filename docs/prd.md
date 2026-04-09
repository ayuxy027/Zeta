# Zeta - Comprehensive Project Information

**Your Personalised PM Agent**

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Problem & Solution](#problem--solution)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Current Implementation Status](#current-implementation-status)
6. [Features Status](#features-status)
7. [API Integration](#api-integration)
8. [Database Structure](#database-structure)
9. [Frontend Structure](#frontend-structure)
10. [Backend Structure](#backend-structure)
11. [Development Status](#development-status)
12. [Environment Setup](#environment-setup)
13. [Known Issues & Limitations](#known-issues--limitations)
14. [Future Roadmap](#future-roadmap)

---

## Project Overview

**Zeta** is an AI-powered Product Manager agent that automates meeting documentation, PRD generation, user story creation, and sprint planning. The platform joins meetings, transcribes conversations, generates meeting minutes, action plans, and structured product documentation.

### Target Customers

**Primary Users: Startups & Small Teams**

Zeta is specifically designed for startups who want to simplify workloads from product managers. In many startups, traditional PM responsibilities (planning, allocation, strategy) are handled by:
- **DevRels** (Developer Relations) who wear multiple hats
- **Team Leads** managing both technical and product decisions
- **Solo Founders** building their MVP while handling all aspects of product development

**Core Value Proposition:**

Zeta accelerates work speed by automating:
- **Ideation** - Capturing and structuring ideas from meetings
- **Planning** - Converting discussions into actionable sprints and backlogs
- **Analysis** - Generating insights from meeting transcripts and decisions

This automation allows startup teams to **focus solely on building their MVP** instead of spending hours on documentation, planning meetings, and translating ideas into structured product requirements.

### Project Evolution

- **Current Name**: Zeta (Meeting transcription & PM automation platform)
- **Focus**: Meeting transcription, MOM generation, action item extraction, and integration with Vexa API

---

## Problem & Solution

### Problem

**For Startups & Small Teams:**

In startups, product management responsibilities often fall on devrels, team leads, or solo founders who don't have dedicated PM resources. These individuals waste 40% of their week on manual PM work:
- Writing meeting notes
- Drafting PRDs
- Creating Jira tickets
- Translating meetings into actionable plans
- Planning sprints and allocating resources
- Analyzing meeting outcomes and decisions

This time could be better spent **building the MVP** and shipping product features.

**Existing Solutions:**

Heizen PM Agent started solving this but:
- Locks features behind enterprise sales (not startup-friendly)
- Offers limited integrations
- Forces vendor lock-in
- Too expensive for early-stage startups
- Built for large teams, not solo founders or small teams

### Solution

**Zeta** is an AI Product Manager agent designed for startups that:
- **Automates Ideation** - Captures ideas from meetings and structures them automatically
- **Automates Planning** - Converts discussions into sprint plans, backlogs, and actionable tasks
- **Automates Analysis** - Generates insights, PRDs, and user stories from meeting transcripts
- Joins meetings automatically
- Writes documentation (PRDs, MOMs, user stories)
- Runs sprint planning
- Integrates with popular PM tools (Jira, Linear, Trello, ClickUp, Slack, Figma)

**Goal**: Accelerate startup teams' work speed by automating PM tasks, so devrels, team leads, and solo founders can **focus solely on building their MVP** instead of paperwork.

**Key Differentiators:**
- Built specifically for startups (not enterprise-focused)
- Affordable pricing for early-stage teams
- Works for solo founders and small teams (not just large organizations)
- Automates the entire PM workflow (ideation → planning → analysis)
- Lets builders build, not document

---

## Architecture

### System Architecture

```
┌─────────────────┐    HTTP/API    ┌─────────────────┐    Vexa API    ┌─────────────────┐
│                 │   Requests     │                 │   Integration  │                 │
│   FRONTEND      │ ──────────────▶│   BACKEND       │ ──────────────▶│   VEXA SERVICE  │
│                 │                │                 │                │                 │
│ • React + TS    │ ◀──────────────│ • Express.js    │ ◀──────────────│ • Transcription │
│ • SessionContext│   JSON Response│ • API Routes    │   Transcripts  │ • Bot Management│
│ • API Service   │                │ • Validation    │                │ • Real-time Data│
└─────────────────┘                └─────────────────┘                └─────────────────┘
                                           │
                                           │ SQLite
                                           ▼
                                   ┌─────────────────┐
                                   │   DATABASE      │
                                   │                 │
                                   │ • sessions      │
                                   │ • transcripts   │
                                   │ • meetings      │
                                   └─────────────────┘
```

### Data Flow

1. **User Input**: User enters Google Meet or Teams link
2. **Bot Request**: Frontend → Backend → Vexa API (requests bot)
3. **Bot Joins**: Vexa bot joins the meeting
4. **Transcription**: Vexa transcribes meeting in real-time
5. **Data Retrieval**: Backend polls Vexa API for transcripts
6. **Storage**: Transcripts stored in SQLite database
7. **Processing**: Backend processes transcripts for analysis
8. **Display**: Frontend displays transcripts, summaries, MOMs, action items

---

## Tech Stack

### Frontend

- **Framework**: React 19.1.1
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4.17
- **Routing**: React Router DOM 7.9.4
- **Icons**: Lucide React 0.536.0
- **State Management**: React Context API
- **Build Tool**: Vite 7.0.6
- **Fonts**: Inter + Space Grotesk

### Backend

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js 5.1.0
- **Database**: SQLite3 5.1.6 (→ PostgreSQL planned)
- **HTTP Client**: Axios 1.12.2
- **Security**: Helmet 8.1.0, CORS 2.8.5
- **Validation**: Express Validator 7.2.1
- **Logging**: Morgan 1.10.1
- **Compression**: Compression 1.8.1

### External Services

- **Transcription**: Vexa API (api.cloud.vexa.ai)
- **AI Processing**: Groq SDK (Meta Llama models) - Planned
- **Audio Processing**: Web Speech API + Deepgram - Planned

### Development Tools

- **Package Manager**: npm
- **Type Checking**: TypeScript 5.9.2
- **Linting**: ESLint 9.32.0
- **Code Formatting**: Prettier (via ESLint)
- **Hot Reload**: Vite HMR
- **Process Manager**: Nodemon (backend)

---

## Current Implementation Status

### ✅ Completed Features

#### Frontend
- [x] Landing page with feature showcase
- [x] Meeting transcriber interface
- [x] Google Meet link input and validation
- [x] Microsoft Teams link support
- [x] Real-time transcript display
- [x] Session management (create, load, delete)
- [x] Meeting minutes (MOM) page
- [x] Summary page
- [x] Action points page
- [x] About page
- [x] Responsive design (mobile, tablet, desktop)
- [x] Navigation bar with routing
- [x] Session context for state management
- [x] API service layer
- [x] Error handling and validation
- [x] Export transcript functionality
- [x] Transcript library/session history

#### Backend
- [x] Express.js server setup
- [x] CORS configuration
- [x] Security middleware (Helmet)
- [x] Request validation
- [x] Error handling middleware
- [x] Vexa API integration service
- [x] Bot management routes
- [x] Transcript retrieval routes
- [x] Meeting management routes
- [x] Session management routes
- [x] Webhook routes
- [x] SQLite database setup
- [x] Database service layer
- [x] Health check endpoint

#### API Integration
- [x] Vexa API client setup
- [x] Bot request functionality
- [x] Bot status retrieval
- [x] Transcript fetching
- [x] Meeting management
- [x] Bot configuration updates
- [x] Bot stop functionality

### 🚧 In Progress

- [ ] AI-powered analysis (Groq integration)
- [ ] PRD generation
- [ ] User story generation
- [ ] Sprint planning
- [ ] Integration with Jira, Linear, Trello, ClickUp
- [ ] Chrome extension
- [ ] WebSocket support for real-time updates
- [ ] PostgreSQL migration
- [ ] Authentication & authorization
- [ ] Multi-user support

### 📋 Planned Features

- [ ] One-click PRD generation
- [ ] Smart user stories with acceptance criteria
- [ ] Intelligent sprint planning
- [ ] Deep integrations (Jira, Linear, Trello, ClickUp, Slack, Figma, GitHub)
- [ ] Chrome extension for auto-join
- [ ] Local audio processing option
- [ ] Vector search for transcripts
- [ ] Multi-LLM routing
- [ ] Python FastAPI microservice
- [ ] WebSocket real-time updates
- [ ] User authentication
- [ ] Team collaboration features
- [ ] Analytics dashboard

---

## Features Status

### Core Features

| Feature | Status | Implementation Details |
|---------|--------|----------------------|
| **Meeting Transcription** | ✅ Complete | Integrated with Vexa API, supports Google Meet & Teams |
| **Real-time Transcripts** | ✅ Complete | Polling-based retrieval, displays in UI |
| **MOM Generation** | 🚧 Partial | UI ready, backend processing in progress |
| **Action Items** | 🚧 Partial | UI ready, extraction logic in progress |
| **Meeting Summaries** | 🚧 Partial | UI ready, summarization in progress |
| **Session Management** | ✅ Complete | Create, load, delete sessions |
| **Transcript Export** | ✅ Complete | Export to text file |
| **Bot Management** | ✅ Complete | Request, status, stop bot |
| **PRD Generation** | ❌ Planned | Not implemented |
| **User Stories** | ❌ Planned | Not implemented |
| **Sprint Planning** | ❌ Planned | Not implemented |
| **Tool Integrations** | ❌ Planned | Not implemented |
| **Chrome Extension** | ❌ Planned | Not implemented |

### UI Features

| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | ✅ Complete | Simple, clean design with feature showcase |
| Meeting Transcriber | ✅ Complete | Full workflow: join → transcribe → stop |
| MOM Page | ✅ Complete | Displays meeting minutes (UI ready) |
| Summary Page | ✅ Complete | Displays meeting summary (UI ready) |
| Action Points Page | ✅ Complete | Displays action items (UI ready) |
| About Page | ✅ Complete | Project information |
| Navigation | ✅ Complete | Responsive navbar with routing |
| Session Library | ✅ Complete | View and manage past sessions |
| Responsive Design | ✅ Complete | Mobile, tablet, desktop support |
| Error Handling | ✅ Complete | User-friendly error messages |
| Loading States | ✅ Complete | Loading indicators for async operations |

---

## API Integration

### Vexa API Integration

**Base URL**: `https://api.cloud.vexa.ai`

**Authentication**: API Key via `X-API-Key` header

**Endpoints Used**:

1. **POST /bots** - Request bot for meeting
   - Supports Google Meet and Microsoft Teams
   - Parameters: platform, native_meeting_id, passcode (Teams), language, bot_name
   
2. **GET /bots/status** - Get status of running bots
   - Returns list of active bots
   
3. **GET /transcripts/{platform}/{meeting_id}** - Get meeting transcript
   - Real-time transcription data
   - Supports polling during/after meeting
   
4. **PUT /bots/{platform}/{meeting_id}/config** - Update bot configuration
   - Change language, etc.
   
5. **DELETE /bots/{platform}/{meeting_id}** - Stop bot
   - Remove bot from meeting
   
6. **GET /meetings** - List meetings
   - Get meeting history
   
7. **PATCH /meetings/{platform}/{meeting_id}** - Update meeting data
   - Update name, participants, languages, notes
   
8. **DELETE /meetings/{platform}/{meeting_id}** - Delete meeting
   - Purge transcripts and anonymize data
   
9. **PUT /user/webhook** - Set webhook URL
   - Receive notifications when meetings finish

### Backend API Routes

**Base URL**: `http://localhost:3001/api`

#### Bot Routes (`/api/bots`)
- `POST /` - Request bot
- `GET /status` - Get bot status
- `PUT /:platform/:meetingId/config` - Update bot config
- `DELETE /:platform/:meetingId` - Stop bot

#### Transcript Routes (`/api/transcripts`)
- `GET /:platform/:meetingId` - Get transcript

#### Meeting Routes (`/api/meetings`)
- `GET /` - List meetings
- `PATCH /:platform/:meetingId` - Update meeting
- `DELETE /:platform/:meetingId` - Delete meeting

#### Session Routes (`/api/sessions`)
- `POST /` - Create session
- `GET /` - Get all sessions
- `GET /:sessionId` - Get session
- `PUT /:sessionId` - Update session
- `DELETE /:sessionId` - Delete session
- `POST /:sessionId/transcripts` - Save transcript
- `GET /:sessionId/transcripts` - Get transcripts
- `GET /stats/overview` - Get session statistics

#### Webhook Routes (`/api/webhook`)
- `POST /` - Receive webhook from Vexa

### Frontend API Service

**Location**: `src/services/apiService.ts`

**Methods**:
- `requestBot()` - Request bot for meeting
- `getBotStatus()` - Get bot status
- `updateBotConfig()` - Update bot configuration
- `stopBot()` - Stop bot
- `getTranscript()` - Get transcript
- `listMeetings()` - List meetings
- `updateMeeting()` - Update meeting
- `deleteMeeting()` - Delete meeting
- `createSession()` - Create session
- `getAllSessions()` - Get all sessions
- `getSession()` - Get session
- `updateSession()` - Update session
- `deleteSession()` - Delete session
- `saveTranscript()` - Save transcript
- `getTranscripts()` - Get transcripts
- `getSessionStats()` - Get session statistics
- `extractGoogleMeetId()` - Extract meeting ID from URL
- `validateGoogleMeetLink()` - Validate Google Meet link
- `extractTeamsMeetingId()` - Extract Teams meeting ID and passcode
- `validateTeamsLink()` - Validate Teams link

---

## Database Structure

### SQLite Database

**Location**: `backend/data/sessions.db`

### Tables

#### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  meeting_name TEXT,
  participants TEXT,
  language TEXT,
  status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Transcripts Table
```sql
CREATE TABLE transcripts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  speaker TEXT,
  text TEXT NOT NULL,
  timestamp TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Future: PostgreSQL Migration

Planned migration to PostgreSQL with:
- Vector search capabilities
- Better performance
- Scalability
- Advanced querying

---

## Frontend Structure

```
src/
├── App.tsx                      # Main app component with routing
├── main.tsx                     # Entry point
├── index.css                    # Global styles
├── vite-env.d.ts               # Vite type definitions
│
├── components/                  # Reusable components
│   ├── Navbar.tsx              # Navigation bar
│   ├── landing/                # Landing page components
│   │   ├── FeatureCard.tsx
│   │   ├── Footer.tsx
│   │   ├── HeroSection.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Navigation.tsx
│   └── moments/                # Meeting analysis components
│       ├── ActionItemsSummary.tsx
│       └── MeetingInfoCards.tsx
│
├── pages/                       # Page components
│   ├── LandingPage.tsx         # Landing page
│   ├── MeetingTranscriber.tsx  # Main transcription interface
│   ├── MOMPage.tsx             # Meeting minutes page
│   ├── SummaryPage.tsx         # Summary page
│   ├── ActionPointsPage.tsx    # Action points page
│   └── AboutPage.tsx           # About page
│
├── contexts/                    # React contexts
│   ├── SessionContext.tsx      # Session state management
│   └── SessionContextDefinition.ts
│
├── hooks/                       # Custom hooks
│   └── useSession.ts           # Session management hook
│
├── services/                    # API services
│   └── apiService.ts           # API client
│
├── types/                       # TypeScript types
│   └── index.ts                # Type definitions
│
└── utils/                       # Utility functions
    └── index.ts                # Helper functions
```

### Key Components

#### MeetingTranscriber.tsx
Main transcription interface with:
- Meeting link input (Google Meet/Teams)
- Bot join functionality
- Real-time transcript display
- Session management
- Export functionality
- Transcript library

#### SessionContext.tsx
Global state management for:
- Current session
- Current transcript
- Transcription status
- Session list
- Error handling

#### apiService.ts
Centralized API client with:
- All backend API methods
- URL validation
- Meeting ID extraction
- Error handling

---

## Backend Structure

```
backend/
├── src/
│   ├── server.js               # Express server setup
│   │
│   ├── routes/                 # API routes
│   │   ├── botRoutes.js       # Bot management routes
│   │   ├── meetingRoutes.js   # Meeting management routes
│   │   ├── transcriptRoutes.js # Transcript routes
│   │   ├── sessionRoutes.js   # Session routes
│   │   └── webhookRoutes.js   # Webhook routes
│   │
│   ├── services/               # Business logic
│   │   ├── vexaService.js     # Vexa API client
│   │   └── databaseService.js # Database operations
│   │
│   ├── middleware/             # Express middleware
│   │   └── errorMiddleware.js # Error handling
│   │
│   └── utils/                  # Utilities
│       └── validation.js      # Request validation
│
├── data/                       # Database files
│   └── sessions.db            # SQLite database
│
└── logs/                       # Log files
    ├── combined.log
    └── error.log
```

### Key Files

#### server.js
Express server with:
- CORS configuration
- Security middleware (Helmet)
- Request logging (Morgan)
- Compression
- Rate limiting (disabled for testing)
- Error handling
- Health check endpoint

#### vexaService.js
Vexa API client with:
- Axios instance setup
- Request/response interceptors
- Bot management methods
- Transcript retrieval
- Meeting management
- Error handling

#### databaseService.js
Database operations with:
- Session CRUD operations
- Transcript CRUD operations
- Database initialization
- Query helpers

---

## Development Status

### Current Phase: **MVP (Minimum Viable Product)**

### Completed Milestones

1. ✅ **Project Setup**
   - React + TypeScript frontend
   - Express.js backend
   - SQLite database
   - Vite build system

2. ✅ **Core UI**
   - Landing page
   - Meeting transcriber interface
   - Session management UI
   - Responsive design

3. ✅ **Vexa Integration**
   - Bot request functionality
   - Transcript retrieval
   - Meeting management
   - Error handling

4. ✅ **Backend API**
   - RESTful API endpoints
   - Database operations
   - Session management
   - Validation and error handling

### Current Work

- [ ] AI-powered analysis integration
- [ ] MOM generation logic
- [ ] Action item extraction
- [ ] Meeting summarization
- [ ] Real-time updates (WebSocket)

### Next Milestones

1. **AI Integration** (In Progress)
   - Groq SDK integration
   - MOM generation
   - Action item extraction
   - Meeting summarization

2. **PRD Generation** (Planned)
   - Meeting → PRD conversion
   - Template system
   - Export functionality

3. **User Stories** (Planned)
   - Auto-generation
   - Acceptance criteria
   - Point estimates

4. **Sprint Planning** (Planned)
   - AI-powered planning
   - Velocity analysis
   - Capacity planning

5. **Integrations** (Planned)
   - Jira integration
   - Linear integration
   - Trello integration
   - ClickUp integration
   - Slack integration
   - Figma integration

6. **Chrome Extension** (Planned)
   - Auto-join meetings
   - Background processing
   - Notification system

---

## Environment Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- SQLite3 (included with Node.js)

### Frontend Setup

```bash
# Install dependencies
npm install

# Set up environment variables
echo "VITE_GROQ_API_KEY=your_groq_api_key_here" > .env

# Start development server
npm run dev

# Visit http://localhost:5173
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Set up environment variables
echo "VEXA_API_KEY=your_vexa_api_key_here" > .env
echo "PORT=3001" >> .env
echo "FRONTEND_URL=http://localhost:5173" >> .env
echo "NODE_ENV=development" >> .env

# Start development server
npm run dev

# Server runs on http://localhost:3001
```

### Environment Variables

#### Frontend (.env)
```
VITE_GROQ_API_KEY=your_groq_api_key_here
```

#### Backend (.env)
```
VEXA_API_KEY=your_vexa_api_key_here
PORT=3001
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
VEXA_BASE_URL=https://api.cloud.vexa.ai
```

### Database Setup

SQLite database is automatically created on first run at `backend/data/sessions.db`.

### Development Scripts

#### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Type check with TypeScript
```

#### Backend
```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests
```

---

## Known Issues & Limitations

### Current Limitations

1. **Polling-based Updates**
   - Transcripts are fetched via polling, not WebSocket
   - Not real-time, slight delay in updates
   - **Solution**: Implement WebSocket support

2. **No Authentication**
   - No user authentication system
   - No multi-user support
   - **Solution**: Implement authentication (OAuth, JWT)

3. **SQLite Database**
   - Not suitable for production scale
   - No vector search capabilities
   - **Solution**: Migrate to PostgreSQL

4. **No AI Processing**
   - MOM generation, summaries, action items are UI-only
   - No actual AI analysis
   - **Solution**: Integrate Groq SDK

5. **No Integrations**
   - No Jira, Linear, Trello integrations
   - No export to external tools
   - **Solution**: Implement integration APIs

6. **No Chrome Extension**
   - Manual meeting link entry required
   - No auto-join functionality
   - **Solution**: Develop Chrome extension

7. **Limited Error Handling**
   - Some error cases not handled
   - No retry logic for API failures
   - **Solution**: Improve error handling and retry logic

8. **No Rate Limiting**
   - Rate limiting disabled for testing
   - Could cause API abuse
   - **Solution**: Enable and configure rate limiting

9. **No Caching**
   - No transcript caching
   - Repeated API calls for same data
   - **Solution**: Implement caching layer

10. **No Analytics**
    - No usage analytics
    - No performance metrics
    - **Solution**: Implement analytics

### Known Bugs

1. **Transcript Display**
   - Sometimes transcripts don't update in real-time
   - **Status**: Investigating

2. **Session Management**
   - Session state sometimes inconsistent
   - **Status**: Fixing

3. **Error Messages**
   - Some error messages not user-friendly
   - **Status**: Improving

---

## Future Roadmap

### Phase 1: AI Integration (Current)
- [ ] Groq SDK integration
- [ ] MOM generation with AI
- [ ] Action item extraction
- [ ] Meeting summarization
- [ ] Speaker identification

### Phase 2: PRD & User Stories
- [ ] PRD generation from meetings
- [ ] User story generation
- [ ] Acceptance criteria generation
- [ ] Point estimation
- [ ] Template system

### Phase 3: Sprint Planning
- [ ] AI-powered sprint planning
- [ ] Velocity analysis
- [ ] Capacity planning
- [ ] Backlog prioritization
- [ ] Sprint retrospective

### Phase 4: Integrations
- [ ] Jira integration
- [ ] Linear integration
- [ ] Trello integration
- [ ] ClickUp integration
- [ ] Slack integration
- [ ] Figma integration
- [ ] GitHub integration

### Phase 5: Chrome Extension
- [ ] Chrome extension development
- [ ] Auto-join meetings
- [ ] Background processing
- [ ] Notification system
- [ ] Browser integration

### Phase 6: Advanced Features
- [ ] WebSocket real-time updates
- [ ] PostgreSQL migration
- [ ] Vector search
- [ ] Multi-LLM routing
- [ ] Python FastAPI microservice
- [ ] Authentication & authorization
- [ ] Team collaboration
- [ ] Analytics dashboard
- [ ] Local audio processing
- [ ] Privacy controls

### Phase 7: Scale & Production
- [ ] Production deployment
- [ ] Load balancing
- [ ] CDN integration
- [ ] Monitoring & logging
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation
- [ ] User onboarding

---

## Additional Resources

### Documentation
- [README.md](./README.md) - Project overview and getting started
- [upadtedPRD.md](./upadtedPRD.md) - Product requirements document
- [docs/apiDocs.md](./docs/apiDocs.md) - Vexa API documentation
- [kt.txt](./kt.txt) - Knowledge transfer document

### API Documentation
- Vexa API: https://api.cloud.vexa.ai
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/health

### External Services
- Vexa API: https://vexa.ai
- Groq API: https://groq.com (planned)
- Deepgram: https://deepgram.com (planned)

---

## Contact & Support

For questions, issues, or contributions:
- Check [README.md](./README.md) for setup instructions
- Review [docs/apiDocs.md](./docs/apiDocs.md) for API usage
- See [kt.txt](./kt.txt) for knowledge transfer

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: MVP - In Development

---

**Built for PMs who ship. Not for paperwork.**

