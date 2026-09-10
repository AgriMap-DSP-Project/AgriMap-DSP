FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for PostGIS/GDAL
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libgdal-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
