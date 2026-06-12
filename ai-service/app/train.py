import json
from datetime import datetime, timezone

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

from .utils import METADATA_PATH, MODEL_PATH, TRAINING_DATA_PATH, is_peak_hour, parse_hour, stable_category_code


MIN_REAL_RECORDS = 1000

FEATURES = [
    "road_name_code",
    "suburb_code",
    "day_of_week",
    "hour",
    "is_peak_hour",
    "incident_count",
    "roadwork_count",
    "average_speed",
    "traffic_volume",
    "severity_score",
    "weather_code",
]


def train_model(payload=None):
    payload = payload or {}
    real_records = payload.get("historical_traffic_data") or payload.get("records") or []
    real_frame = build_real_training_frame(real_records)
    using_real_data = len(real_frame) >= MIN_REAL_RECORDS
    data = real_frame if using_real_data else build_sample_training_frame()
    data = data.dropna(subset=["congestion_label"])
    x = data[FEATURES]
    y = data["congestion_label"]

    stratify = y if y.value_counts().min() >= 2 else None
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.25, random_state=42, stratify=stratify)

    model = RandomForestClassifier(n_estimators=120, random_state=42, class_weight="balanced")
    model.fit(x_train, y_train)
    accuracy = accuracy_score(y_test, model.predict(x_test))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES}, MODEL_PATH)

    date_range = date_range_for(real_frame if using_real_data else data)
    model_status = model_status_for(len(real_frame), using_real_data)
    metadata = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "accuracy": round(float(accuracy), 3),
        "accuracy_score": round(float(accuracy), 3),
        "records_used": int(len(data)),
        "real_records_available": int(len(real_frame)),
        "minimum_real_records_required": MIN_REAL_RECORDS,
        "model_path": str(MODEL_PATH),
        "model_file_path": str(MODEL_PATH),
        "model_name": "random_forest_traffic_model",
        "model_status": model_status,
        "model_type": "real-data" if using_real_data else "sample-data",
        "training_source": "imported historical traffic data" if using_real_data else "sample training CSV fallback",
        "enough_real_data": using_real_data,
        "date_range_used": date_range,
        "data_readiness": readiness_for(len(real_frame)),
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def build_sample_training_frame():
    data = pd.read_csv(TRAINING_DATA_PATH)
    data["road_name_code"] = data.get("road_name", "sample").apply(stable_category_code) if "road_name" in data else stable_category_code("sample")
    data["suburb_code"] = data.get("suburb", "sample").apply(stable_category_code) if "suburb" in data else stable_category_code("sample")
    data["weather_code"] = data.get("weather", "unknown").apply(stable_category_code) if "weather" in data else stable_category_code("unknown")
    return data


def build_real_training_frame(records):
    rows = []
    for record in records:
        label = normalize_label(record.get("congestion_level"))
        if not label:
            continue
        hour = parse_hour(str(record.get("time") or "08:00"))
        rows.append({
            "road_name_code": stable_category_code(record.get("road_name")),
            "suburb_code": stable_category_code(record.get("suburb") or record.get("location")),
            "day_of_week": day_number(record.get("day_of_week"), record.get("date")),
            "hour": hour,
            "is_peak_hour": is_peak_hour(hour),
            "incident_count": int(record.get("incident_count") or 0),
            "roadwork_count": 1 if record.get("roadwork_active") else 0,
            "average_speed": float(record.get("average_speed") or 0),
            "traffic_volume": float(record.get("traffic_volume") or 0),
            "severity_score": severity_for(label),
            "weather_code": stable_category_code(record.get("weather") or "unknown"),
            "congestion_label": label,
            "date": str(record.get("date") or "")[:10],
        })
    return pd.DataFrame(rows)


def normalize_label(value):
    label = str(value or "").strip().lower()
    if label in {"low", "clear", "low traffic"}:
        return "Low traffic"
    if label in {"medium", "moderate", "moderate traffic"}:
        return "Moderate traffic"
    if label in {"slow", "slow traffic"}:
        return "Slow traffic"
    if label in {"high", "heavy", "heavy traffic"}:
        return "Heavy traffic"
    if label in {"severe", "severe / accident risk", "accident"}:
        return "Severe / accident risk"
    return None


def day_number(day_of_week, date_value):
    names = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }
    day = str(day_of_week or "").strip().lower()
    if day in names:
        return names[day]
    try:
        return datetime.fromisoformat(str(date_value)[:10]).weekday()
    except Exception:
        return 0


def severity_for(label):
    if "Severe" in label:
        return 4
    if "Heavy" in label:
        return 3
    if "Slow" in label or "Moderate" in label:
        return 2
    return 1


def date_range_for(data):
    if "date" not in data or data.empty:
        return {"earliest_date": None, "latest_date": None}
    dates = pd.to_datetime(data["date"], errors="coerce").dropna()
    if dates.empty:
        return {"earliest_date": None, "latest_date": None}
    return {
        "earliest_date": dates.min().date().isoformat(),
        "latest_date": dates.max().date().isoformat(),
    }


def model_status_for(real_count, using_real_data):
    if using_real_data:
        return "good MVP real-data model" if real_count >= 10000 else "small real-data model"
    if real_count:
        return "not enough data; sample-data model"
    return "development/sample-data model"


def readiness_for(real_count):
    if real_count >= 10000:
        return "10,000+ real records available; good MVP data volume"
    if real_count >= MIN_REAL_RECORDS:
        return "1,000+ real records available; small real-data model"
    return "Less than 1,000 real records available; sample data fallback used"
