# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Fix for Render/Generic Linux libGL error
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies required for OpenCV and ONNX
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    cmake \
    libgtk2.0-dev \
    pkg-config \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5002

# Run the application
# Using gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5002", "--workers", "1", "--timeout", "120", "app:app"]
