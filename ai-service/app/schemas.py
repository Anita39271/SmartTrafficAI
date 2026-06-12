from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RouteOption(BaseModel):
    id: str
    name: Optional[str] = None
    route_name: Optional[str] = None


class IncidentInput(BaseModel):
    incident_type: Optional[str] = None
    type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    road_name: Optional[str] = None
    description: Optional[str] = None


class TrafficDataInput(BaseModel):
    road_name: Optional[str] = None
    road: Optional[str] = None
    suburb: Optional[str] = None
    average_speed: Optional[float] = None
    traffic_volume: Optional[int] = None
    congestion_level: Optional[str] = None
    incident_count: Optional[int] = None
    roadwork_active: Optional[bool] = None
    weather: Optional[str] = None


class PredictRequest(BaseModel):
    starting_address: str
    destination_address: str
    travel_date: str
    travel_time: str
    transport_mode: str = "car"
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    route_geometry: Optional[List[Any]] = None
    distance: Optional[float] = None
    estimated_time: Optional[str] = None
    route_options: List[RouteOption] = Field(default_factory=list)
    incidents: List[Dict[str, Any]] = Field(default_factory=list)
    traffic_data: List[Dict[str, Any]] = Field(default_factory=list)
    historical_traffic_data: List[Dict[str, Any]] = Field(default_factory=list)


class RoutePrediction(BaseModel):
    id: str
    route_name: str
    traffic_level: str
    colour: str
    estimated_time: str
    estimated_delay: str
    confidence_score: int
    risk_reason: str
    route_colour: str


class PredictResponse(BaseModel):
    recommended_route: str
    predicted_congestion: str
    estimated_delay: str
    confidence_score: int
    risk_reason: str
    route_predictions: List[RoutePrediction]
    message: Optional[str] = None
