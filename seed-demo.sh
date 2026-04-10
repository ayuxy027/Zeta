#!/usr/bin/env bash
# =============================================================================
#  Zeta — Demo Seed Script
#  Seeds the knowledge base with diverse, realistic org data across all sources
#  Run:  bash seed-demo.sh
# =============================================================================

BACKEND="http://localhost:3001"
NEO4J_AUTH="$(echo -n 'neo4j:password' | base64)"

GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
RESET="\033[0m"
BOLD="\033[1m"

count=0
ok() { count=$((count + 1)); echo -e "  ${GREEN}[$count]${RESET} $1"; }
section() { echo ""; echo -e "${BOLD}${CYAN}── $1 ──${RESET}"; }

echo -e "${BOLD}${CYAN}Zeta Demo Seed${RESET} — ingesting diverse org data"
echo ""

# ── Clean slate ──
section "Resetting graph"
curl -s -X POST http://localhost:7474/db/neo4j/tx/commit \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $NEO4J_AUTH" \
  -d '{"statements":[{"statement":"MATCH (n) DETACH DELETE n"}]}' > /dev/null
ok "Neo4j cleared"

# ── Slack messages ──────────────────────────────────────────────────────
section "Slack messages (7)"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_arch_001","source_type":"slack",
  "raw_text":"After a long discussion we decided to go with PostgreSQL over MongoDB. Rahul pointed out our data is highly relational and MongoDB would create too many joins in application code. Priya agreed — PostgreSQL gives us the ACID guarantees we need for financial data.",
  "metadata":{"author":"Rahul","timestamp":"2024-01-01T10:00:00Z","channel":"#architecture"}
}' > /dev/null && ok "Slack: PostgreSQL decision"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_arch_002","source_type":"slack",
  "raw_text":"We agreed to use Auth0 for authentication instead of building our own. Sumeet raised the security risks of rolling our own auth — too many edge cases around session management, token rotation, and brute-force protection. Team agreed the 3-month time saving justifies the cost.",
  "metadata":{"author":"Sumeet","timestamp":"2024-01-02T14:00:00Z","channel":"#architecture"}
}' > /dev/null && ok "Slack: Auth0 decision"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_infra_001","source_type":"slack",
  "raw_text":"Decided to deploy on Railway instead of AWS for the MVP. Priya ran the cost comparison — Railway is 60% cheaper at our scale and has zero DevOps overhead. We can migrate to AWS post-Series A if needed.",
  "metadata":{"author":"Priya","timestamp":"2024-01-03T09:30:00Z","channel":"#infrastructure"}
}' > /dev/null && ok "Slack: Railway deployment"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_frontend_001","source_type":"slack",
  "raw_text":"We are going with React and TypeScript for the frontend. Rahul pushed for Vue but the team has more React experience. Sumeet also noted the React ecosystem is larger — more component libraries, better hiring pool. Decided unanimously to use React with Vite for fast builds.",
  "metadata":{"author":"Rahul","timestamp":"2024-01-04T11:00:00Z","channel":"#frontend"}
}' > /dev/null && ok "Slack: React decision"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_design_001","source_type":"slack",
  "raw_text":"Ananya proposed using Tailwind CSS instead of styled-components. The team agreed after she showed it reduces bundle size by 40% and makes responsive design much faster. We will use Tailwind with a custom design token system.",
  "metadata":{"author":"Ananya","timestamp":"2024-01-05T15:00:00Z","channel":"#design-system"}
}' > /dev/null && ok "Slack: Tailwind CSS decision"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_api_001","source_type":"slack",
  "raw_text":"For the API layer we are going with Express.js over Fastify. Sumeet benchmarked both — Fastify is 15% faster but Express has far more middleware ecosystem support and the team already knows it. Performance difference is negligible at our scale.",
  "metadata":{"author":"Sumeet","timestamp":"2024-01-06T10:00:00Z","channel":"#backend"}
}' > /dev/null && ok "Slack: Express.js decision"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_sprint_001","source_type":"slack",
  "raw_text":"Sprint planning: we will ship the beta by January 31st. Rahul owns the backend APIs, Ananya owns the dashboard UI, Priya handles DevOps and CI/CD pipeline. Sumeet is on auth and integrations. Daily standups at 10am IST.",
  "metadata":{"author":"Priya","timestamp":"2024-01-07T09:00:00Z","channel":"#sprint"}
}' > /dev/null && ok "Slack: Sprint plan"

# ── Gmail emails ──────────────────────────────────────────────────────
section "Gmail emails (4)"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"gmail_vendor_001","source_type":"gmail",
  "raw_text":"Hi team, we signed the 2-year contract with Stripe for payments. Razorpay was cheaper but Stripe API quality and global coverage won us over. Sumeet negotiated 2.4% per transaction, down from the standard 2.9%. This saves us roughly $18K annually at projected volume.",
  "metadata":{"author":"Sumeet Gond","timestamp":"2024-01-05T14:30:00Z","subject":"RE: Vendor contract finalized"}
}' > /dev/null && ok "Gmail: Stripe vendor contract"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"gmail_legal_001","source_type":"gmail",
  "raw_text":"Legal review complete. We decided to go with Apache 2.0 license for our open-source SDK. Priya consulted with our legal advisor who confirmed Apache 2.0 gives us patent protection while allowing enterprise adoption. MIT was too permissive for our use case.",
  "metadata":{"author":"Priya","timestamp":"2024-01-08T11:00:00Z","subject":"RE: Open source licensing decision"}
}' > /dev/null && ok "Gmail: Apache 2.0 license"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"gmail_hiring_001","source_type":"gmail",
  "raw_text":"After interviewing 12 candidates, we decided to hire two senior engineers: one specializing in distributed systems (starting Feb 1) and one in ML/NLP (starting Feb 15). Rahul will onboard the systems engineer, Ananya will mentor the ML hire. Total budget approved: $340K combined.",
  "metadata":{"author":"Rahul","timestamp":"2024-01-10T16:00:00Z","subject":"Hiring decisions - Q1 2024"}
}' > /dev/null && ok "Gmail: Hiring decisions"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"gmail_investor_001","source_type":"gmail",
  "raw_text":"Board update: we decided to target Series A in Q3 2024 instead of Q2. Priya and Sumeet agreed we need 3 more months of traction data. Target metrics: 500 daily active users, $50K MRR, and 90% weekly retention. Current metrics: 120 DAU, $8K MRR, 82% retention.",
  "metadata":{"author":"Priya","timestamp":"2024-01-12T09:00:00Z","subject":"Board update - Series A timeline"}
}' > /dev/null && ok "Gmail: Series A timeline"

# ── Google Drive docs ──────────────────────────────────────────────────
section "Google Drive documents (4)"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"drive_adr_001","source_type":"drive",
  "raw_text":"ADR-001: Event-Driven Architecture. Decision: Use BullMQ with Redis for async event processing instead of direct synchronous calls. Context: Slack webhook requires response within 3 seconds. BullMQ provides reliable job queuing, retry logic, and dead-letter handling. Sumeet evaluated RabbitMQ and Kafka but they add infrastructure complexity we do not need at this stage.",
  "metadata":{"author":"Sumeet","timestamp":"2024-01-06T10:00:00Z","subject":"ADR-001: Event-Driven Architecture","url":"https://docs.google.com/document/d/adr001"}
}' > /dev/null && ok "Drive: ADR-001 Event Architecture"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"drive_adr_002","source_type":"drive",
  "raw_text":"ADR-002: Knowledge Graph Design. Decision: Use Neo4j for the decision knowledge graph with 5 node types: Decision, Person, Reason, Topic, and Source. Rahul designed the schema after evaluating ArangoDB and Amazon Neptune. Neo4j was chosen for its mature Cypher query language, APOC library, and strong community. Graph relationships: MADE, SUPPORTS, HAS_REASON, ABOUT.",
  "metadata":{"author":"Rahul","timestamp":"2024-01-07T14:00:00Z","subject":"ADR-002: Knowledge Graph Design","url":"https://docs.google.com/document/d/adr002"}
}' > /dev/null && ok "Drive: ADR-002 Knowledge Graph"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"drive_adr_003","source_type":"drive",
  "raw_text":"ADR-003: Caching Strategy. Decision: Use Redis for application-level caching. Context: Our API response times exceed 400ms on repeated queries. Rahul benchmarked Redis, Memcached, and in-memory LRU. Redis with a 5-minute TTL reduces p95 latency to under 80ms. Additional benefit: we already run Redis for BullMQ, so no new infrastructure.",
  "metadata":{"author":"Rahul","timestamp":"2024-01-08T10:00:00Z","subject":"ADR-003: Caching Strategy","url":"https://docs.google.com/document/d/adr003"}
}' > /dev/null && ok "Drive: ADR-003 Caching Strategy"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"drive_security_001","source_type":"drive",
  "raw_text":"Security Policy v1.0. Key decisions: All API tokens are encrypted at rest using AES-256-GCM. OAuth state parameters are signed with HMAC-SHA256 to prevent CSRF. Slack webhook signatures are verified against raw body bytes with constant-time comparison. Session tokens expire after 24 hours. Ananya audited the implementation and confirmed compliance with OWASP Top 10.",
  "metadata":{"author":"Ananya","timestamp":"2024-01-09T13:00:00Z","subject":"Security Policy v1.0","url":"https://docs.google.com/document/d/security"}
}' > /dev/null && ok "Drive: Security Policy"

# ── Noise messages (should be filtered) ──────────────────────────────
section "Noise messages (2 — should be skipped)"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_noise_001","source_type":"slack",
  "raw_text":"standup in 10 mins everyone @here",
  "metadata":{"author":"Sumeet","timestamp":"2024-01-05T09:50:00Z","channel":"#general"}
}' > /dev/null && ok "Slack noise: standup ping"

curl -s -X POST "$BACKEND/api/ingest" -H "Content-Type: application/json" -d '{
  "source_id":"slack_noise_002","source_type":"slack",
  "raw_text":"lol nice meme 😂😂",
  "metadata":{"author":"Rahul","timestamp":"2024-01-06T17:00:00Z","channel":"#random"}
}' > /dev/null && ok "Slack noise: random chat"

# ── Wait for pipeline ──
section "Processing"
echo -e "  ${YELLOW}Waiting 20 seconds for all pipeline jobs to complete...${RESET}"
for i in $(seq 1 20); do
  printf "  %d/20\r" "$i"
  sleep 1
done
echo ""

# ── Verify ──
section "Verification"
GRAPH=$(curl -s -X POST http://localhost:7474/db/neo4j/tx/commit \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $NEO4J_AUTH" \
  -d '{"statements":[{"statement":"MATCH (n) RETURN labels(n)[0] as type, count(n) as count ORDER BY count DESC"}]}')

echo "$GRAPH" | node -e "
let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
  const r=JSON.parse(d);
  const rows=r.results?.[0]?.data||[];
  console.log('');
  console.log('  Knowledge graph:');
  rows.forEach(row=>console.log('    '+String(row.row[1]).padStart(3)+' '+row.row[0]+' nodes'));
  console.log('');
})"

# ── Sample queries ──
section "Sample queries to try"
echo ""
echo "  Cross-source:"
echo "    • Why did we choose PostgreSQL?"
echo "    • What payment provider did we pick and why?"
echo "    • What is our caching strategy?"
echo ""
echo "  People-focused:"
echo "    • What decisions did Priya make?"
echo "    • What is Rahul responsible for?"
echo "    • What did Ananya contribute?"
echo ""
echo "  Strategic:"
echo "    • When is our Series A target?"
echo "    • What are our current metrics vs targets?"
echo "    • List all major technical decisions"
echo ""
echo "  Architecture:"
echo "    • Why did we choose event-driven architecture?"
echo "    • What database does our knowledge graph use?"
echo "    • What is our security policy?"
echo ""
echo -e "${BOLD}${GREEN}Seed complete!${RESET} Open ${CYAN}http://localhost:5173/dashboard/chat${RESET} to query."
echo ""
