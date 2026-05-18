CREATE TABLE leaderboard_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leaderboard_results_user_id ON leaderboard_results(user_id);
CREATE INDEX idx_leaderboard_results_agent_id ON leaderboard_results(agent_id);
CREATE INDEX idx_leaderboard_results_created_at ON leaderboard_results(created_at DESC);

CREATE TABLE leaderboard_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sector text NOT NULL,
  posicion int NOT NULL,
  score numeric NOT NULL,
  semana text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_leaderboard_rankings_user_id ON leaderboard_rankings(user_id);
CREATE INDEX idx_leaderboard_rankings_sector ON leaderboard_rankings(sector);
CREATE INDEX idx_leaderboard_rankings_semana ON leaderboard_rankings(semana);
CREATE INDEX idx_leaderboard_rankings_posicion ON leaderboard_rankings(sector, semana, posicion);
