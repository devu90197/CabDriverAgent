-- Create route_calculations table
CREATE TABLE IF NOT EXISTS route_calculations (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  pickup_location JSONB,
  dropoff_location JSONB,
  stops JSONB[],
  route_result JSONB,
  algorithm_used TEXT,
  distance_km NUMERIC,
  eta_min NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_route_calculations_user_id ON route_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_route_calculations_created_at ON route_calculations(created_at);

-- Enable Realtime for the route_calculations table
ALTER TABLE route_calculations REPLICA IDENTITY FULL;

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create jobs table (for backend job tracking)
CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT,
  params JSONB,
  result JSONB,
  progress INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for jobs table
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Enable Realtime for the jobs table
ALTER TABLE jobs REPLICA IDENTITY FULL;

-- Create nodes table (for map nodes)
CREATE TABLE IF NOT EXISTS nodes (
  id SERIAL PRIMARY KEY,
  lat NUMERIC,
  lng NUMERIC,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create edges table (for map edges/routes)
CREATE TABLE IF NOT EXISTS edges (
  id SERIAL PRIMARY KEY,
  from_node INTEGER REFERENCES nodes(id),
  to_node INTEGER REFERENCES nodes(id),
  distance_km NUMERIC,
  travel_time_min NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_edges_from_node ON edges(from_node);
CREATE INDEX IF NOT EXISTS idx_edges_to_node ON edges(to_node);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE route_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;

-- Create policies for route_calculations
CREATE POLICY "Users can view their own route calculations" ON route_calculations
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own route calculations" ON route_calculations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Create policies for jobs
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Create policies for nodes (public read access)
CREATE POLICY "Public read access for nodes" ON nodes
  FOR SELECT USING (true);

-- Create policies for edges (public read access)
CREATE POLICY "Public read access for edges" ON edges
  FOR SELECT USING (true);

-- Grant permissions to authenticated users
GRANT ALL ON TABLE route_calculations TO authenticated;
GRANT ALL ON TABLE user_preferences TO authenticated;
GRANT ALL ON TABLE jobs TO authenticated;
GRANT SELECT ON TABLE nodes TO authenticated;
GRANT SELECT ON TABLE edges TO authenticated;

-- Grant permissions to anon users (for public access to nodes/edges)
GRANT SELECT ON TABLE nodes TO anon;
GRANT SELECT ON TABLE edges TO anon;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE route_calculations_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE nodes_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE edges_id_seq TO authenticated;