"""
Lazy loading utility for AI/ML models.

Models are loaded from disk the first time they are actually needed (i.e. the
first request to an endpoint that requires them), rather than at application
startup. This shifts the loading cost from cold-start time to the first feature
request and keeps the server responsive even when ML artifacts are heavy.

All accessors are thread-safe (double-checked locking) so that a model is only
loaded once even under concurrent first-access requests.
"""

import os
import threading
import joblib
import cloudpickle

# Module-level lock to protect lazy initialization.
_lock = threading.Lock()

# Cache for loaded model artifacts (None means "not yet loaded").
_risk_model = None
_target_encoder = None
_feature_columns = None
_recommendation_engine = None
_sia = None


def _get_models_dir() -> str:
    """Resolve the absolute path to the backend/models directory."""
    # This file lives in backend/src, so models dir is one level up.
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "models")


def get_risk_model():
    """Return the wellness risk classification model, loading on first use."""
    global _risk_model
    if _risk_model is None:
        with _lock:
            if _risk_model is None:
                _risk_model = joblib.load(
                    os.path.join(_get_models_dir(), "wellness_risk_model.pkl")
                )
    return _risk_model


def get_target_encoder():
    """Return the target label encoder, loading on first use."""
    global _target_encoder
    if _target_encoder is None:
        with _lock:
            if _target_encoder is None:
                _target_encoder = joblib.load(
                    os.path.join(_get_models_dir(), "target_encoder.pkl")
                )
    return _target_encoder


def get_feature_columns():
    """Return the feature columns list, loading on first use."""
    global _feature_columns
    if _feature_columns is None:
        with _lock:
            if _feature_columns is None:
                _feature_columns = joblib.load(
                    os.path.join(_get_models_dir(), "feature_columns.pkl")
                )
    return _feature_columns


def get_recommendation_engine():
    """Return the wellness recommendation engine, loading on first use.

    The engine is expected to be a callable function (serialized via cloudpickle).
    If the loaded artifact is not callable (e.g. a stale ``dict`` or an old
    class-based object from a previous commit), we return ``None`` instead so the
    calling code can safely fall back to its built-in rule-based logic rather than
    crashing with a "'dict' object is not callable" error.
    """
    global _recommendation_engine
    if _recommendation_engine is None:
        with _lock:
            if _recommendation_engine is None:
                try:
                    with open(
                        os.path.join(_get_models_dir(), "wellness_recommendation_engine.pkl"),
                        "rb",
                    ) as f:
                        _recommendation_engine = cloudpickle.load(f)
                    # Guard against a stale/non-callable artifact (dict, class, etc.)
                    if not callable(_recommendation_engine):
                        print(
                            "WARNING: recommendation engine artifact is not callable "
                            f"(type={type(_recommendation_engine)}). Falling back to "
                            "rule-based recommendations."
                        )
                        _recommendation_engine = None
                except Exception as e:  # noqa: BLE001 - defensive, never crash startup
                    print(
                        "WARNING: failed to load recommendation engine "
                        f"({e}). Falling back to rule-based recommendations."
                    )
                    _recommendation_engine = None
    return _recommendation_engine


def get_sentiment_analyzer():
    """Return the VADER sentiment analyzer, loading on first use."""
    global _sia
    if _sia is None:
        with _lock:
            if _sia is None:
                import nltk

                nltk.download("vader_lexicon", quiet=True)
                from nltk.sentiment import SentimentIntensityAnalyzer

                _sia = SentimentIntensityAnalyzer()
    return _sia


def preload_models(blocking: bool = False) -> None:
    """Eagerly load all model artifacts so the first feature request is fast.

    By default this runs in a background daemon thread so server startup is not
    blocked. Pass ``blocking=True`` to force synchronous loading (useful for
    smoke tests or ensuring readiness before serving traffic).

    Loading is thread-safe and idempotent: re-running simply returns the already
    cached artifacts.
    """
    def _load_all():
        get_risk_model()
        get_target_encoder()
        get_feature_columns()
        get_recommendation_engine()
        get_sentiment_analyzer()

    if blocking:
        _load_all()
        return

    try:
        import threading

        thread = threading.Thread(target=_load_all, name="model-preloader", daemon=True)
        thread.start()
    except Exception as e:  # pragma: no cover - defensive
        print(f"Failed to start model preloader thread: {e}")
