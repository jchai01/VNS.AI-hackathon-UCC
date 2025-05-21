Live URL: https://jchai01.github.io/VNS.AI-hackathon-UCC/

# Instruction

1. Clone repo:

```bash
git clone https://github.com/jchai01/VNS.AI-hackathon-UCC.git
cd VNS.AI-hackathon-UCC
```

2. Create .env file, reference from .env.example.

3. Install dependencies and run:

```bash
npm i
npm start
```

4. Running the backend, cd into backend: `cd backend`

5. Create .env file, reference from .env.example.

6. Create Python virtual environment, for e.g:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

7. Install dependency and run:

```bash
pip install -r requirements.txt
python app.py
```

# Hosting

In the root folder of the repo: `npm run deploy`

Inside <repo-path>/backend, run with gunicorn (e.g. with 3 workers): `gunicorn -w 3 --bind 0.0.0.0:8080 app:app`

Ideal number of worker: (number of CPU cores x 2) + 1 (use `nproc` to check number of CPU cores).
