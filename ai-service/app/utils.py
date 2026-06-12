from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List
import hashlib
import os


ROOT = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", ROOT / "saved_model" / "traffic_model.joblib"))
TRAINING_DATA_PATH = Path(os.getenv("TRAINING_DATA_PATH", ROOT / "data" / "sample_traffic_training.csv"))
METADATA_PATH = ROOT / "saved_model" / "model_metadata.json"


SEVERITY_SCORES = {
    "low": 1,
    "medium": 2,
    "moderate": 2,
    "high": 3,
    "severe": 4,
    "serious": 4,
}


def parse_hour(travel_time: str) -> int:
    try:
        return int(travel_time.split(":")[0])
    except Exception:
        return 8


def parse_day_of_week(travel_date: str) -> int:
    try:
        return datetime.fromisoformat(travel_date).weekday()
    except Exception:
        return datetime.now().weekday()


def is_peak_hour(hour: int) -> int:
    return int(7 <= hour <= 9 or 16 <= hour <= 18)


def incident_type(item: Dict[str, Any]) -> str:
    return str(item.get("incident_type") or item.get("type") or "").lower()


def severity_score(incidents: List[Dict[str, Any]]) -> int:
    if not incidents:
        return 0
    return max(SEVERITY_SCORES.get(str(item.get("severity", "low")).lower(), 1) for item in incidents)


def feature_row(payload: Dict[str, Any]) -> Dict[str, float]:
    incidents = payload.get("incidents") or []
    traffic = payload.get("traffic_data") or []
    hour = parse_hour(payload.get("travel_time", "08:00"))
    speeds = [float(item.get("average_speed")) for item in traffic if item.get("average_speed") is not None]
    volumes = [int(item.get("traffic_volume")) for item in traffic if item.get("traffic_volume") is not None]
    roadworks = [item for item in incidents if "roadwork" in incident_type(item)]
    serious = [item for item in incidents if incident_type(item) in {"crash", "closure", "hazard", "flooding"}]
    first_traffic = traffic[0] if traffic else {}
    area_text = " ".join([
        str(first_traffic.get("road_name") or first_traffic.get("road") or payload.get("starting_address") or ""),
        str(first_traffic.get("suburb") or first_traffic.get("location") or payload.get("destination_address") or ""),
    ])

    return {
        "road_name_code": stable_category_code(first_traffic.get("road_name") or first_traffic.get("road") or payload.get("starting_address")),
        "suburb_code": stable_category_code(first_traffic.get("suburb") or first_traffic.get("location") or area_text),
        "day_of_week": parse_day_of_week(payload.get("travel_date", "")),
        "hour": hour,
        "is_peak_hour": is_peak_hour(hour),
        "incident_count": len(incidents),
        "roadwork_count": len(roadworks),
        "average_speed": sum(speeds) / len(speeds) if speeds else 58.0,
        "traffic_volume": sum(volumes) / len(volumes) if volumes else 4200,
        "severity_score": max(severity_score(incidents), 4 if serious else 0),
        "weather_code": stable_category_code(first_traffic.get("weather") or "unknown"),
    }


def stable_category_code(value: Any) -> int:
    text = str(value or "unknown").strip().lower()
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 10000


def colour_for_label(label: str) -> str:
    label = label.lower()
    if "severe" in label or "accident" in label:
        return "dark red"
    if "heavy" in label:
        return "red"
    if "slow" in label:
        return "orange"
    if "moderate" in label:
        return "yellow"
    return "green"


def delay_for_label(label: str) -> int:
    label = label.lower()
    if "severe" in label:
        return 38
    if "heavy" in label:
        return 25
    if "slow" in label:
        return 18
    if "moderate" in label:
        return 12
    return 5
