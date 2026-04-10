import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  
  // Slack
  slackBotToken: process.env.SLACK_BOT_TOKEN ?? '',
  slackSigningSecret: process.env.SLACK_SIGNING_SECRET ?? '',
  
  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  
  // Redis
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  
  // Neo4j
  neo4jUri: process.env.NEO4J_URI ?? 'bolt://localhost:7687',
  neo4jUser: process.env.NEO4J_USER ?? 'neo4j',
  neo4jPassword: process.env.NEO4J_PASSWORD ?? 'password',
  
  // ChromaDB
  chromadbHost: process.env.CHROMADB_HOST ?? 'localhost',
  chromadbPort: Number(process.env.CHROMADB_PORT ?? 8001),
  
  // Node environment
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;

export function validateConfig(): void {
  const required: Array<keyof typeof config> = ['slackBotToken', 'slackSigningSecret'];
  
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key.toUpperCase()}`);
    }
  }
}
