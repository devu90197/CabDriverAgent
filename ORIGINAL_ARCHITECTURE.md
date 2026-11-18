# Cab Driver Agent: Scalable Route Estimation System

A high-performance, full-stack application designed to estimate and optimize routes for logistics and ride-sharing services. Built with a distributed architecture, it handles real-time requests and long-running optimization tasks through a robust task queue system.

## 🚀 Key Engineering Highlights

- **Distributed Task Processing**: Implemented Celery with Redis to handle computationally intensive route optimizations (Traveling Salesman Problem) asynchronously, ensuring a responsive user experience.
- **Algorithm Optimization**: Integrated multiple pathfinding and optimization algorithms, including **Dijkstra**, **A***, and **Nearest Neighbor with 2-opt local search**, selecting the optimal approach based on problem complexity.
- **Real-time Map Integration**: Dynamic visualization of optimized routes using **Mapbox/Leaflet.js**, providing intuitive feedback on distance and ETA.
- **Scalable Architecture**: Decoupled Next.js frontend and FastAPI backend, leveraging Supabase for secure, real-time data persistence and job tracking.
- **Automated Workflows**: Integration with n8n for post-processing tasks, analytics, and automated notification triggers.

## 🏗️ System Architecture

The system is designed for horizontal scalability:

1.  **Frontend (Next.js)**: React hooks-based state management with interactive mapping for route input and visualization.
2.  **API Layer (FastAPI)**: High-performance Python backend managing synchronous route requests and job delegation.
3.  **Task Queue (Celery + Redis)**: Asynchronous workers processing large-scale routing jobs (e.g., > 6 stops) without blocking the main event loop.
4.  **Data Layer (Supabase)**: Relational storage for job metadata, historical routes, and real-time status updates.

## 🛠️ Technology Stack

- **Backend**: Python 3.11+, FastAPI, Celery, SQLAlchemy
- **Frontend**: TypeScript, Next.js 14, Tailwind CSS, Leaflet.js
- **Infrastructure**: Redis (Message Broker), Supabase (PostgreSQL + Auth)
- **Automation**: n8n.online

## 🏁 Getting Started

### Prerequisites

- Node.js 18+ & Python 3.11+
- Redis (Local instance or Managed Cloud)
- Supabase Project

### Setup Environment

1.  Clone the repository and install dependencies:
    ```bash
    # Backend
    cd backend
    python -m venv venv
    source venv/bin/activate  # venv\Scripts\activate on Windows
    pip install -r requirements.txt

    # Frontend
    cd ../frontend
    npm install
    ```

2.  Configure environment variables:
    Create a `.env` file in the root based on `.env.example`:
    ```env
    SUPABASE_URL=your_supabase_url
    SUPABASE_SERVICE_ROLE_KEY=your_key
    REDIS_URL=your_redis_url
    ```

### Running the Project

- **Start Backend**: `cd backend && uvicorn app:app --reload`
- **Start Celery Worker**: `cd worker && celery -A tasks worker --loglevel=info`
- **Start Frontend**: `cd frontend && npm run dev`

## 📊 Algorithms & Performance

### 1. Shortest Path (A* / Dijkstra)
Optimized for point-to-point routing using heuristic-based search to minimize compute time while ensuring path optimality.

### 2. Route Optimization (Nearest Neighbor + 2-opt)
For multi-stop delivery routes, the system employs a greedy Nearest Neighbor approach followed by a 2-opt local search to eliminate "crossings" and minimize total travel distance, providing a high-quality approximation for the NP-hard TSP.

---
*Developed as a robust solution for modern logistics and fleet management challenges.*
