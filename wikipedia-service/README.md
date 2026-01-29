# Wikipedia Search Microservice

Python-based microservice that provides Wikipedia search functionality for the fact-checker.

## Why Python?

The `wikipedia` npm package has issues with 403 errors. Python's `langchain-community` provides a more reliable Wikipedia integration.

## Setup

1. **Install Python dependencies:**

   ```bash
   cd wikipedia-service
   pip install -r requirements.txt
   ```

2. **Run the service:**

   ```bash
   python app.py
   ```

   The service will start on `http://localhost:5001`

## API Endpoints

### Health Check

```bash
GET http://localhost:5001/health
```

**Response:**

```json
{
  "status": "healthy",
  "service": "wikipedia-search"
}
```

### Search Wikipedia

```bash
POST http://localhost:5001/search
Content-Type: application/json

{
  "query": "Ajit Pawar Maharashtra",
  "max_results": 3
}
```

**Response:**

```json
{
  "results": [
    {
      "title": "Ajit Pawar",
      "summary": "Ajit Anantrao Pawar is an Indian politician...",
      "url": "https://en.wikipedia.org/wiki/Ajit_Pawar"
    }
  ],
  "count": 1
}
```

## Integration with TypeScript Backend

The TypeScript backend can call this service via HTTP:

```typescript
async function searchWikipediaPython(query: string) {
  const response = await fetch("http://localhost:5001/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, max_results: 3 }),
  });

  const data = await response.json();
  return data.results;
}
```

## Running in Production

### Option 1: Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app.py .
CMD ["python", "app.py"]
```

### Option 2: systemd service

Create `/etc/systemd/system/wikipedia-service.service`

### Option 3: PM2 (Node.js process manager)

```bash
pm2 start app.py --name wikipedia-service --interpreter python3
```

## Development

Start both services:

```bash
# Terminal 1: TypeScript backend
cd agent
npm run dev

# Terminal 2: Python Wikipedia service
cd wikipedia-service
python app.py
```
