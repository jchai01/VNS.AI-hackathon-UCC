# Flask Backend for Nginx Log Parser

This is a Flask backend service for parsing Nginx access log files. It provides an API endpoint that accepts log files, parses them, and returns structured data.

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
```

2. Activate the virtual environment:

- On Windows:

```bash
venv\Scripts\activate
```

- On macOS/Linux:

```bash
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run the server:

```bash
python app.py
```

The server will start at http://localhost:5000.

## API Endpoints

### POST /api/parse-log

Uploads and parses an Nginx access log file.

**Request:**

- Content-Type: multipart/form-data
- Body:
  - file: The log file to parse

**Response:**

```json
{
  "fileName": "access.log",
  "entries": [
    {
      "ipAddress": "192.168.1.1",
      "dateTime": "2023-04-17T05:15:05",
      "method": "GET",
      "path": "/blog/post-1",
      "statusCode": 200,
      "bytes": 18954,
      "referer": "https://website.local.lan/blog/",
      "userAgent": "Mozilla/5.0..."
    },
    ...
  ],
  "totalRequests": 123,
  "uniqueVisitors": 45,
  "totalBandwidth": 987654
}
```

## Integrating with Frontend

To use this backend with the React frontend, update the file upload handler in the React app to send the log file to this API endpoint.
