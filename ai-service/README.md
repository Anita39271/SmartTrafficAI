# SmartTraffic AI Service

FastAPI service for SmartTraffic AI. It trains a Random Forest traffic model and serves prediction responses to the Node.js backend.

## Install

```bash
cd ai-service
pip install -r requirements.txt
```

## Run

```bash
python -m uvicorn app.main:app --reload --port 8000
```

## Endpoints

- `GET /`
- `GET /health`
- `GET /model/status`
- `POST /model/train`
- `POST /predict`

## Train Model

```bash
curl -X POST http://localhost:8000/model/train
```

When called directly without records, training uses the sample CSV fallback. In the full app, admins should train from the Admin AI Management page so the Node backend can send imported PostgreSQL `historical_traffic_data` records into the FastAPI service.

Training status is honest:

- Fewer than 1,000 real records: sample-data fallback is used.
- 1,000-10,000 real records: small real-data model.
- 10,000+ real records: good MVP model data volume.
- 1-2 years of clean data is the recommended MVP target.

The model is saved to:

```text
app/saved_model/traffic_model.joblib
```

You can override paths with:

```env
MODEL_PATH=app/saved_model/traffic_model.joblib
TRAINING_DATA_PATH=app/data/sample_traffic_training.csv
```

## Fallback

If no trained model exists, `/predict` uses rule-based traffic prediction. The service does not crash.

## Backend Connection

The Node backend reads this value from `backend/.env`:

```env
AI_SERVICE_URL=http://localhost:8000
```

If this FastAPI service is not running, the backend returns a rule-based fallback response instead of crashing.
