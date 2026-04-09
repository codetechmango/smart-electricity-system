from typing import List, Tuple
import statistics


def detect_anomaly(
    history: List[float],
    current_value: float,
    window_size: int = 168,   # Up to 1 week of hourly data
    k: float = 3.0            # Sensitivity factor
) -> Tuple[bool, float]:
    """
    Hybrid Dynamic Z-Score anomaly detection.

    Returns:
        (is_anomaly: bool, z_score: float)
    """

    # Initialization Phase: not enough history
    if not history:
        return False, 0.0

    # Use sliding window
    window = history[-window_size:]

    mean = statistics.mean(window)

    # If only one value exists
    if len(window) == 1:
        return False, 0.0

    std_dev = statistics.stdev(window)

    # Edge Case: perfectly flat usage
    if std_dev == 0:
        std_dev = 0.1 * mean if mean != 0 else 0.1

    # Calculate Z-score
    z_score = (current_value - mean) / std_dev

    # Anomaly condition
    is_anomaly = abs(z_score) > k

    return is_anomaly, z_score