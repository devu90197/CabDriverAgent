FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements-api.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
ENV PORT=8000
EXPOSE 8000
CMD ["python", "-m", "backend.app"]
