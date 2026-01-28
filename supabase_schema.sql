-- nodes
create table if not exists nodes (
  id bigserial primary key,
  lat double precision not null,
  lng double precision not null
);

-- edges (directed; insert both directions for undirected graph)
create table if not exists edges (
  id bigserial primary key,
  from_node bigint not null references nodes(id),
  to_node bigint not null references nodes(id),
  distance_km double precision not null,
  travel_time_min double precision
);

-- jobs table (async tasks)
create table if not exists jobs (
  job_id text primary key,
  user_id text,
  status text, -- queued|running|completed|failed
  params jsonb,
  progress int default 0,
  result jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- route logs / audit
create table if not exists route_logs (
  id bigserial primary key,
  job_id text,
  event_type text,
  payload jsonb,
  ts timestamptz default now()
);