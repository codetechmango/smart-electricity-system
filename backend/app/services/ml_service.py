from pathlib import Path
from typing import Any

import joblib

MODEL_DIR = Path(__file__).resolve().parent.parent / "ml_models"
ANOMALY_MODEL_PATH = MODEL_DIR / "anomaly_model.pkl"
SCALER_PATH = MODEL_DIR / "scaler.pkl"
BILL_MODEL_PATH = MODEL_DIR / "bill_model.pkl"


def _load_pickle(path: Path) -> Any:
    if not path.exists():
        raise FileNotFoundError(f"Model file not found: {path}")
    return joblib.load(path)


_anomaly_model = _load_pickle(ANOMALY_MODEL_PATH)
_scaler = _load_pickle(SCALER_PATH)
_bill_model = _load_pickle(BILL_MODEL_PATH)


def detect_anomaly(input_dict: dict[str, float]) -> int:
    if not input_dict:
        raise ValueError("input_dict cannot be empty")

    feature_values = [float(value) for value in input_dict.values()]
    scaled_features = _scaler.transform([feature_values])
    prediction = _anomaly_model.predict(scaled_features)[0]

    return 1 if int(prediction) == -1 else 0


def predict_bill(units: float) -> float:
    prediction = _bill_model.predict([[float(units)]])[0]
    return round(float(prediction), 2)


def compute_risk_score(is_anomaly: int | bool, units: float) -> int:
    score = 0

    if bool(is_anomaly):
        score += 50

    usage = float(units)
    if usage >= 500:
        score += 40
    elif usage >= 300:
        score += 25
    elif usage >= 150:
        score += 10

    return max(0, min(100, score))