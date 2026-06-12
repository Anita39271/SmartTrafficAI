from fastapi import FastAPI, Request

from .model import model_status
from .predict import predict_payload
from .schemas import PredictRequest
from .train import train_model

app = FastAPI(title="SmartTraffic AI Service", version="0.1.0")


@app.get("/")
def root():
    return {"message": "SmartTraffic AI FastAPI service is running"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "smarttraffic-ai-service"}


@app.get("/model/status")
def status():
    return model_status()


@app.get("/model-status")
def model_status_alias():
    return model_status()


async def request_json(request: Request):
    try:
        return await request.json()
    except Exception:
        return {}


@app.post("/model/train")
async def train(request: Request):
    metadata = train_model(await request_json(request))
    return {"status": "trained", **metadata}


@app.post("/train")
async def train_alias(request: Request):
    metadata = train_model(await request_json(request))
    return {"status": "trained", **metadata}


@app.post("/predict")
def predict(request: PredictRequest):
    return predict_payload(request.model_dump())
