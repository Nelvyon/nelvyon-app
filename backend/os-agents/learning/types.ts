export interface AgentOutcome {
  id: string;
  userId: string;
  agentId: string;
  sector: string;
  input: unknown;
  output: unknown;
  qualityScore: number | null;
  outcomeType: string | null;
  outcomeValue: number;
  feedback: string | null;
  createdAt: string;
}

export interface AgentLearning {
  id: string;
  agentId: string;
  sector: string;
  pattern: string;
  confidence: number;
  sampleSize: number;
  promptImprovement: string;
  applied: boolean;
  createdAt: string;
}
