from typing import Any, Dict, List

import pandas as pd

from .model import load_model_bundle
from .utils import colour_for_label, delay_for_label, feature_row


LABELS = ["Low traffic", "Moderate traffic", "Slow traffic", "Heavy traffic", "Severe / accident risk"]


def fallback_label(features: Dict[str, float]) -> str:
    score = 0
    score += 1 if features["is_peak_hour"] else 0
    score += min(int(features["incident_count"]), 2)
    score += min(int(features["roadwork_count"]), 2)
    score += 2 if features["severity_score"] >= 4 else 1 if features["severity_score"] >= 3 else 0
    score += 1 if features["average_speed"] < 45 else 0
    score += 1 if features["traffic_volume"] > 7000 else 0

    if score >= 6:
        return "Severe / accident risk"
    if score >= 4:
        return "Heavy traffic"
    if score >= 3:
        return "Slow traffic"
    if score >= 1:
        return "Moderate traffic"
    return "Low traffic"


def label_rank(label: str) -> int:
    order = {name: index for index, name in enumerate(LABELS)}
    return order.get(label, 1)


def route_name(route: Dict[str, Any], index: int) -> str:
    return route.get("name") or route.get("route_name") or f"Route {index + 1}"


def predict_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not payload.get("traffic_data") and payload.get("historical_traffic_data"):
        payload["traffic_data"] = payload["historical_traffic_data"]
    features = feature_row(payload)
    bundle = load_model_bundle()
    confidence = 72

    if bundle:
        model = bundle["model"]
        columns = bundle["features"]
        frame = pd.DataFrame([{column: features[column] for column in columns}])
        label = str(model.predict(frame)[0])
        if hasattr(model, "predict_proba"):
            confidence = int(max(model.predict_proba(frame)[0]) * 100)
    else:
        label = fallback_label(features)

    route_options = payload.get("route_options") or [
        {"id": "route-1", "name": "Route 1"},
        {"id": "route-2", "name": "Route 2"},
        {"id": "route-3", "name": "Route 3"},
    ]

    base_rank = label_rank(label)
    route_predictions: List[Dict[str, Any]] = []
    for index, route in enumerate(route_options[:3]):
        rank = min(base_rank + index, len(LABELS) - 1)
        if index == 0:
            rank = max(0, base_rank - 1)
        route_label = LABELS[rank]
        delay = delay_for_label(route_label)
        route_predictions.append({
            "id": route.get("id", f"route-{index + 1}"),
            "route_name": route_name(route, index),
            "traffic_level": route_label,
            "colour": colour_for_label(route_label),
            "estimated_time": f"{28 + delay + index * 4} minutes",
            "estimated_delay": f"{delay} minutes",
            "confidence_score": max(52, min(96, confidence - index * 7)),
            "risk_reason": reason_for(route_label, index),
            "route_colour": colour_for_label(route_label),
        })

    recommended = min(route_predictions, key=lambda item: delay_for_label(item["traffic_level"]))
    return {
        "recommended_route": recommended["id"],
        "predicted_congestion": recommended["traffic_level"],
        "estimated_delay": recommended["estimated_delay"],
        "confidence_score": recommended["confidence_score"],
        "risk_reason": recommended["risk_reason"],
        "route_colour": recommended["colour"],
        "route_predictions": route_predictions,
        "message": None if bundle else "No trained model found. Using rule-based fallback prediction.",
    }


def reason_for(label: str, index: int) -> str:
    if "Low" in label:
        return "No major roadworks and lower expected congestion for this time."
    if "Moderate" in label:
        return "Moderate congestion expected near Brisbane CBD."
    if "Slow" in label:
        return "Slower movement expected because of peak-hour pressure or roadworks."
    if "Heavy" in label:
        return "Heavy traffic and possible roadwork delay."
    return "Accident, closure, or severe congestion risk affects this route."
