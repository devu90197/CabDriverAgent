@echo off
echo Setting up Cab Route Estimator...

echo Creating virtual environment for backend...
python -m venv backend/venv

echo Installing backend dependencies...
call backend\venv\Scripts\activate
pip install -r backend/requirements.txt

echo Installing frontend dependencies...
cd frontend
npm install

echo Setup complete!
echo.
echo To run the application:
echo 1. Start the backend: cd backend && venv\Scripts\activate && python app.py
echo 2. Start the frontend: cd frontend && npm run dev