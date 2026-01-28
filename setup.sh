#!/bin/bash

echo "Setting up Cab Route Estimator..."

# Create virtual environment for backend
echo "Creating virtual environment for backend..."
python -m venv backend/venv

# Activate virtual environment and install backend dependencies
echo "Installing backend dependencies..."
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install

echo "Setup complete!"
echo ""
echo "To run the application:"
echo "1. Start the backend: cd backend && source venv/bin/activate && python app.py"
echo "2. Start the frontend: cd frontend && npm run dev"