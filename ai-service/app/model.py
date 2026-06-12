import json

import joblib

from .utils import METADATA_PATH, MODEL_PATH


def load_model_bundle():
    if not MODEL_PATH.exists():
        return None
    return joblib.load(MODEL_PATH)


def model_status():
    metadata = {}
    if METADATA_PATH.exists():
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    exists = MODEL_PATH.exists()
    return {
        "model_exists": exists,
        "model_path": str(MODEL_PATH),
        "trained_at": metadata.get("trained_at"),
        "accuracy": metadata.get("accuracy"),
        "accuracy_score": metadata.get("accuracy_score", metadata.get("accuracy")),
        "records_used": metadata.get("records_used"),
        "model_status": metadata.get("model_status", "development/sample-data model" if exists else "not trained"),
        "message": "Development/sample-data model is trained and ready." if exists else "No trained model found. Rule-based fallback will be used.",
    }
