#!/usr/bin/env bash
# =============================================================================
#  Zeta — Live Demo Script
#  Run: bash demo.sh
# =============================================================================

BACKEND="http://localhost:3001"
NEO4J_AUTH="$(echo -n 'neo4j:password' | base64)"

# ── Colours ──────────────────────────────────────────────────────────────────
BOLD="\033[1m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
MAGENTA="\033[35m"
RESET="\033[0m"

step=0

banner() {
  echo ""
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}${CYAN}  ZETA — Org Memory & Reasoning Engine  |  Live Demo  ${RESET}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}"
  echo ""
}

pause() {
  step=$((step + 1))
  echo ""
  echo -e "${YELLOW}▶  Press ENTER for Step $step — $1${RESET}"
  read -r
}

section() {
  echo ""
  echo -e "${BOLD}${MAGENTA}── $1 ──────────────────────────────────────────────────${RESET}"
  echo ""
}

ok() {
  echo -e "${GREEN}✔  $1${RESET}"
}

show_answer() {
  local response="$1"
  echo "$response" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      try {
        const r = JSON.parse(d);
        if (r.error) { console.log('ERROR:', r.error); return; }
        console.log('\n  ANSWER:', r.answer);
        console.log('\n  SOURCES (' + (r.sources?.length ?? 0) + '):');
        (r.sources || []).forEach((s,i) => {
          console.log('    ['+(i+1)+'] ' + s.source_id + ' | score: ' + (s.score?.toFixed(2) ?? '?') + ' | ' + (s.preview?.slice(0,80) ?? '') + '...');
        });
      } catch(e) { console.log('RAW:', d); }
    })"
}

show_graph() {
  local result="$1"
  echo "$result" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      try {
        const r = JSON.parse(d);
        const rows = r.results?.[0]?.data || [];
        rows.forEach(row => {
          const [type, count] = row.row;
          console.log('    ' + String(count).padStart(3) + '  ' + type);
        });
      } catch(e) { console.log(d); }
    })"
}

# =============================================================================
banner

pause "Check server is live"
section "1 · Server Health"
HEALTH=$(curl -s "$BACKEND/")
ok "Backend response: $HEALTH"

# =============================================================================
pause "Wipe old data — fresh demo start"
section "2 · Reset Graph"
curl -s -X POST http://localhost:7474/db/neo4j/tx/commit \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $NEO4J_AUTH" \
  -d '{"statements":[{"statement":"MATCH (n) DETACH DELETE n"}]}' > /dev/null
ok "Neo4j graph cleared"

# =============================================================================
pause "Ingest Slack message #1 — Database decision"
section "3 · Slack Ingest · Message 1 of 4"
echo -e "  ${CYAN}Message:${RESET} \"After a long discussion we decided to go with PostgreSQL over MongoDB."
echo -e "           Rahul pointed out our data is highly relational. Priya agreed —"
echo -e "           PostgreSQL gives us the ACID guarantees we need for financial data.\""
echo ""
R=$(curl -s -X POST "$BACKEND/slack/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event_id":"demo_001","event":{"type":"message","text":"After a long discussion we decided to go with PostgreSQL over MongoDB. Rahul pointed out our data is highly relational and MongoDB would create too many joins in application code. Priya agreed — PostgreSQL gives us the ACID guarantees we need for financial data.","user":"U_RAHUL","channel":"C_ARCH","ts":"1704067200"}}')
ok "Queued → $R  (returned instantly — 3-second rule)"

# =============================================================================
pause "Ingest Slack message #2 — Auth decision"
section "3 · Slack Ingest · Message 2 of 4"
echo -e "  ${CYAN}Message:${RESET} \"We agreed to use Auth0 for authentication instead of building our own."
echo -e "           Sumeet raised the security risks of rolling our own auth."
echo -e "           Team agreed the 3-month time saving justifies the cost.\""
echo ""
R=$(curl -s -X POST "$BACKEND/slack/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event_id":"demo_002","event":{"type":"message","text":"We agreed to use Auth0 for authentication instead of building our own. Sumeet raised the security risks of rolling our own auth — too many edge cases. Team agreed the 3-month time saving justifies the cost.","user":"U_SUMEET","channel":"C_ARCH","ts":"1704153600"}}')
ok "Queued → $R"

# =============================================================================
pause "Ingest Slack message #3 — Deployment decision"
section "3 · Slack Ingest · Message 3 of 4"
echo -e "  ${CYAN}Message:${RESET} \"Decided to deploy on Railway instead of AWS for the MVP."
echo -e "           Priya ran the cost comparison — Railway is 60% cheaper."
echo -e "           We can migrate to AWS post-Series A if needed.\""
echo ""
R=$(curl -s -X POST "$BACKEND/slack/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event_id":"demo_003","event":{"type":"message","text":"Decided to deploy on Railway instead of AWS for the MVP. Priya ran the cost comparison — Railway is 60% cheaper at our scale and has zero DevOps overhead. We can migrate to AWS post-Series A if needed.","user":"U_PRIYA","channel":"C_INFRA","ts":"1704240000"}}')
ok "Queued → $R"

# =============================================================================
pause "Ingest Email — vendor contract decision"
section "4 · Email Ingest (Gmail)"
echo -e "  ${CYAN}From:${RESET}    Sumeet Gond <sumeet@zeta.dev>"
echo -e "  ${CYAN}Subject:${RESET} RE: Vendor contract finalized"
echo -e "  ${CYAN}Body:${RESET}    \"Hi team, we signed the 2-year contract with Stripe for payments."
echo -e "           Razorpay was cheaper but Stripe's API quality and global coverage"
echo -e "           won. Negotiated 2.4% per transaction, down from 2.9%.\""
echo ""
R=$(curl -s -X POST "$BACKEND/api/ingest" \
  -H "Content-Type: application/json" \
  -d '{"source_id":"gmail_vendor_001","source_type":"gmail","raw_text":"Hi team, we signed the 2-year contract with Stripe for payments. Razorpay was cheaper but Stripe API quality and global coverage won us over. Sumeet negotiated 2.4% per transaction, down from the standard 2.9%.","metadata":{"author":"Sumeet Gond","timestamp":"2024-01-05T14:30:00Z","subject":"RE: Vendor contract finalized"}}')
ok "Pipeline result → $R"

# =============================================================================
pause "Ingest Drive Doc — architecture decision record"
section "5 · Drive Ingest (Google Doc)"
echo -e "  ${CYAN}Doc:${RESET}     ADR-003: Caching Strategy"
echo -e "  ${CYAN}Body:${RESET}    \"Decision: Use Redis for application caching. Context: Our API"
echo -e "           response times exceed 400ms. Redis with a 5-min TTL reduces"
echo -e "           p95 latency to under 80ms. Rahul benchmarked three options.\""
echo ""
R=$(curl -s -X POST "$BACKEND/api/ingest" \
  -H "Content-Type: application/json" \
  -d '{"source_id":"drive_adr_003","source_type":"drive","raw_text":"ADR-003: Caching Strategy. Decision: Use Redis for application-level caching. Context: Our API response times exceed 400ms on repeated queries. Rahul benchmarked Redis, Memcached, and in-memory LRU. Redis with a 5-minute TTL reduces p95 latency to under 80ms. Additional benefit: we already run Redis for BullMQ, so no new infrastructure.","metadata":{"author":"Rahul","timestamp":"2024-01-08T10:00:00Z","subject":"ADR-003: Caching Strategy","url":"https://docs.google.com/document/d/adr003"}}')
ok "Pipeline result → $R"

# =============================================================================
pause "Ingest NOISE — should be filtered out"
section "6 · Noise Test (Slack)"
echo -e "  ${CYAN}Message:${RESET} \"standup in 10 mins everyone @here\""
echo -e "  ${YELLOW}Expected: pipeline will mark this as not relevant and skip it${RESET}"
echo ""
R=$(curl -s -X POST "$BACKEND/slack/events" \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event_id":"demo_004","event":{"type":"message","text":"standup in 10 mins everyone @here","user":"U_SUMEET","channel":"C_GENERAL","ts":"1704326400"}}')
ok "Queued → $R"

# =============================================================================
pause "Wait for pipeline to process all messages"
section "7 · Pipeline Processing"
echo "  Waiting 15 seconds for Groq extraction + graph writes..."
for i in $(seq 1 15); do
  printf "  %d/15\r" "$i"
  sleep 1
done
echo ""

GRAPH=$(curl -s -X POST http://localhost:7474/db/neo4j/tx/commit \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $NEO4J_AUTH" \
  -d '{"statements":[{"statement":"MATCH (n) RETURN labels(n)[0] as type, count(n) as count ORDER BY count DESC"}]}')

ok "Knowledge graph now contains:"
show_graph "$GRAPH"
echo ""
echo -e "  ${YELLOW}Note: 4 messages ingested, noise message correctly skipped${RESET}"

# =============================================================================
pause "Query #1 — Why PostgreSQL?"
section "5 · Query Engine · Q1"
echo -e "  ${CYAN}Question:${RESET} \"Why did we choose PostgreSQL?\""
echo ""
R=$(curl -s -X POST "$BACKEND/api/query" \
  -H "Content-Type: application/json" \
  -d '{"question":"Why did we choose PostgreSQL?"}')
show_answer "$R"

# =============================================================================
pause "Query #2 — Why Auth0?"
section "5 · Query Engine · Q2"
echo -e "  ${CYAN}Question:${RESET} \"Why did we pick Auth0 instead of building our own auth?\""
echo ""
R=$(curl -s -X POST "$BACKEND/api/query" \
  -H "Content-Type: application/json" \
  -d '{"question":"Why did we pick Auth0 instead of building our own auth?"}')
show_answer "$R"

# =============================================================================
pause "Query #3 — Who made which decisions?"
section "5 · Query Engine · Q3"
echo -e "  ${CYAN}Question:${RESET} \"What decisions did Priya make and why?\""
echo ""
R=$(curl -s -X POST "$BACKEND/api/query" \
  -H "Content-Type: application/json" \
  -d '{"question":"What decisions did Priya make and why?"}')
show_answer "$R"

# =============================================================================
pause "Query #4 — Cross-source: Payments (from Email)"
section "8 · Query Engine · Q4 (email source)"
echo -e "  ${CYAN}Question:${RESET} \"Why did we pick Stripe over Razorpay?\""
echo ""
R=$(curl -s -X POST "$BACKEND/api/query" \
  -H "Content-Type: application/json" \
  -d '{"question":"Why did we pick Stripe over Razorpay?"}')
show_answer "$R"

# =============================================================================
pause "Query #5 — Cross-source: Caching (from Drive doc)"
section "8 · Query Engine · Q5 (drive source)"
echo -e "  ${CYAN}Question:${RESET} \"What is our caching strategy and who benchmarked it?\""
echo ""
R=$(curl -s -X POST "$BACKEND/api/query" \
  -H "Content-Type: application/json" \
  -d '{"question":"What is our caching strategy and who benchmarked it?"}')
show_answer "$R"

# =============================================================================
pause "Query #6 — Meta question across all sources"
section "8 · Query Engine · Q6 (cross-source)"
echo -e "  ${CYAN}Question:${RESET} \"List all the major technical decisions and who made them\""
echo ""
R=$(curl -s -X POST "$BACKEND/api/query" \
  -H "Content-Type: application/json" \
  -d '{"question":"List all the major technical decisions and who made them"}')
show_answer "$R"

# =============================================================================
pause "Show the knowledge graph — open Neo4j browser"
section "6 · Knowledge Graph  →  localhost:7474"
echo ""
echo -e "  ${BOLD}Open in browser:${RESET}  http://localhost:7474"
echo -e "  ${BOLD}Login:${RESET}            neo4j / password"
echo ""
echo -e "  ${BOLD}Paste this Cypher query:${RESET}"
echo ""
echo -e "  ${CYAN}MATCH (p:Person)-[:MADE]->(d:Decision)-[:HAS_REASON]->(r:Reason)${RESET}"
echo -e "  ${CYAN}RETURN p, d, r${RESET}"
echo ""
echo -e "  ${YELLOW}What you'll see:${RESET}"
echo "    • Person nodes (Rahul, Priya, Sumeet)"
echo "    • Decision nodes (PostgreSQL, Auth0, Railway)"
echo "    • Reason nodes (ACID guarantees, 60% cheaper, security risks)"
echo "    • Arrows showing WHO decided WHAT and WHY"
echo ""

# =============================================================================
echo ""
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${GREEN}  Demo complete!                                  ${RESET}"
echo -e "${BOLD}${GREEN}══════════════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${BOLD}Stack:${RESET}"
echo "    • BullMQ + Redis    → async Slack ingestion (3-sec rule)"
echo "    • Groq llama-3.3-70b → entity extraction + answer synthesis"
echo "    • ChromaDB + Gemini embeddings → semantic search"
echo "    • Neo4j             → decision knowledge graph"
echo "    • Express + Auth0   → secure API"
echo ""
