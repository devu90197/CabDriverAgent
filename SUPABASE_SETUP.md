# Supabase Setup Instructions

This document provides instructions for setting up your Supabase project with the Cab Driver Agent application.

## Prerequisites

1. A Supabase account (you already have this with your project credentials)
2. Access to your Supabase project dashboard

## Database Setup

### 1. Run the Setup Script

Execute the SQL script located at `supabase/setup.sql` in your Supabase SQL editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/setup.sql` into the editor
4. Click "Run" to execute the script

This will create the following tables:
- `route_calculations`: Stores route calculation history
- `user_preferences`: Stores user preferences
- `jobs`: Tracks backend job status
- `nodes`: Map nodes for route calculation
- `edges`: Connections between map nodes

### 2. Enable Realtime

The setup script already enables Realtime for the necessary tables. To verify:

1. Go to your Supabase project dashboard
2. Navigate to Database → Replication
3. Ensure that `route_calculations` and `jobs` tables are listed

### 3. Configure Authentication (Optional)

For production use, you may want to configure authentication:

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Settings
3. Configure your desired authentication providers

## Environment Variables

Ensure your environment variables are properly configured:

### Backend (.env file)
```
SUPABASE_URL=https://zwwpjavxfemzdpyyeekc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3d3BqYXZ4ZmVtemRweXllZWtjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY4ODc2MiwiZXhwIjoyMDgwMjY0NzYyfQ.7bWrJs98_hoexuJ3nXAcx8e9MeCqQ2pVy0ZguRYUMl0
```

### Frontend (.env file)
```
NEXT_PUBLIC_SUPABASE_URL=https://zwwpjavxfemzdpyyeekc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3d3BqYXZ4ZmVtemRweXllZWtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODg3NjIsImV4cCI6MjA4MDI2NDc2Mn0.vgOQSpl3QfgXHySfAQP2mRpQd5xBzhGLpvdZfNsY410
```

## Testing the Integration

1. Start your backend server:
   ```
   cd backend
   python app.py
   ```

2. Start your frontend:
   ```
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`
4. Calculate a route and verify that it's saved to your Supabase database

## Real-time Features

The application is configured to receive real-time updates when new routes are calculated. You can extend this functionality to:

1. Show notifications when other users calculate routes
2. Display a live feed of recent route calculations
3. Implement collaborative route planning features

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Verify your Supabase URL and keys are correct
2. **Realtime Not Working**: Ensure Realtime is enabled for the tables
3. **Permission Errors**: Check that RLS policies are properly configured

### Checking Data

You can verify data is being saved by querying your tables in the Supabase SQL editor:

```sql
-- Check route calculations
SELECT * FROM route_calculations ORDER BY created_at DESC LIMIT 10;

-- Check jobs
SELECT * FROM jobs ORDER BY created_at DESC LIMIT 10;
```

## Next Steps

1. Populate the `nodes` and `edges` tables with your map data
2. Implement user authentication for personalized experiences
3. Add more real-time features using Supabase subscriptions
4. Set up automated backups for your database