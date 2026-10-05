# Lead Capture System — AI Automation Engineer Assessment

A clean lead-capture form that validates on both client and server, then forwards
data to an existing n8n workflow via webhook.

```
HTML form → JS validation → fetch() → FastAPI POST /api/leads
→ server-side validation → n8n webhook → JSON response → UI
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create virtual environment and install dependencies
uv venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

uv pip install -r requirements.txt

# Configure environment
cp ../.env.example ../.env
# Edit ../.env — set N8N_WEBHOOK_URL (required) and optionally N8N_WEBHOOK_SECRET

# Run the server
uvicorn backend.main:app --reload
```

The API is now at **http://localhost:8000**. Check **http://localhost:8000/health**.

### 2. Frontend

Open a second terminal and serve the `frontend/` folder on port 5500:

```bash
# Simple option (Python built-in server)
cd frontend
python -m http.server 5500

# Or use VS Code Live Server (default port 5500)
```

Open **http://localhost:5500** in your browser.

### 3. Frontend Config

Edit `frontend/config.js` to point to your backend if it's not on `localhost:8000`:

```js
window.APP_CONFIG = { API_URL: "http://localhost:8000" };
```

---

## Environment Variables

| Variable            | Required | Default                                           | Description                          |
|---------------------|----------|---------------------------------------------------|--------------------------------------|
| `N8N_WEBHOOK_URL`   | Yes      | —                                                 | Production webhook URL from n8n      |
| `N8N_WEBHOOK_SECRET`| No       | (empty)                                           | Value for `X-Webhook-Secret` header  |
| `ALLOWED_ORIGINS`   | No       | `http://localhost:5500,http://127.0.0.1:5500`     | CORS origins, comma-separated        |

Copy `.env.example` to `.env` and fill in the values.

---

## n8n Workflow Setup

1. Open your n8n instance.
2. Import the workflow JSON file from `n8n/lead-workflow.json` (added separately).
3. **Activate** the workflow so the webhook is live.
4. Copy the **Production** webhook URL (not the test URL) into your `.env`:
   ```
   N8N_WEBHOOK_URL=https://your-n8n.example.com/webhook/lead-capture
   ```
5. If you configured a webhook secret in n8n, set `N8N_WEBHOOK_SECRET` as well.

> **Important:** The backend must use the **Production** webhook URL. The test URL
> only works when you manually click "Listen for Test Event" in n8n.

---

## Running Tests

### Backend (pytest)

```bash
# From the project root, with the virtual environment active
pytest backend/tests/ -v
```

### Frontend (Vitest)

```bash
cd frontend
npm install
npx vitest run
```

---

## Manual Test Cases

### 1. Valid Submission
Fill in all required fields with valid data and submit. You should see:
> ✅ "Thank you! Your information has been submitted successfully."

### 2. Invalid Email
Enter `john@` as the email and submit. You should see:
> ❌ "Please enter a valid email address." next to the email field.

### 3. Missing Required Field
Leave "Company" blank and submit. You should see:
> ❌ "Company is required." next to the company field. The form should NOT make an API request.

### 4. API / n8n Failure
Stop the backend server (or set an unreachable `N8N_WEBHOOK_URL`) and submit a valid form:
> ❌ "Something went wrong. Please try again." (or a 502/504 message if the backend is up but n8n is down).

### 5. Rapid Multiple Clicks
Click Submit rapidly 5+ times. Only **one** request should be sent (the button disables
and an `isSubmitting` flag prevents duplicate requests).

---

## Project Structure

```
project/
├── frontend/
│   ├── index.html          # Semantic, accessible form
│   ├── style.css           # Mobile-first dark theme
│   ├── script.js           # Validation, submission, DOM updates
│   ├── config.js           # window.APP_CONFIG = { API_URL: ... }
│   └── tests/
│       └── validation.test.js
├── backend/
│   ├── main.py             # FastAPI app, routes, CORS, rate limiting
│   ├── schemas.py          # Pydantic request/response models
│   ├── validators.py       # Server-side validation (independent)
│   ├── n8n_client.py       # Async webhook client with error mapping
│   ├── config.py           # Settings from env vars
│   ├── requirements.txt
│   └── tests/
│       └── test_api.py
├── n8n/
│   └── .gitkeep            # Workflow added separately
├── .env.example
├── .gitignore
└── README.md
```

---

## Assumptions & Limitations

- **No database**: Leads are forwarded to n8n only; no local persistence.
- **No authentication**: The form is publicly accessible; rate limiting (10 req/min per IP) provides basic abuse protection.
- **Single-page**: No routing or SPA framework; the form is a single HTML page.
- **n8n must be running**: If the n8n webhook is unreachable, submissions will fail with a user-friendly error (502/504).
- **CORS**: Only the configured origins are allowed; the default is `localhost:5500`.
- **HTTPS in production**: In a real deployment, both frontend and backend should be served over HTTPS.
