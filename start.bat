@echo off
echo Starting Cab Route Estimator...

echo Starting backend server...
start "Backend" cmd /k "cd backend && venv\Scripts\activate && python app.py"

timeout /t 5

echo Starting frontend server...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo Both servers started!
echo Frontend will be available at http://localhost:3000
echo Backend API will be available at http://localhost:8000