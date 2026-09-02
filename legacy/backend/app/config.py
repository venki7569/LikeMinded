"""
Configuration settings for LikeMinded+ backend.
"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Database
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'likeminded.db')}"

# CORS origins allowed
CORS_ORIGINS = ["*"]

# ML Settings
BERT_MODEL_NAME = "all-MiniLM-L6-v2"
TFIDF_MAX_FEATURES = 5000
DEFAULT_TOP_N_MATCHES = 10

# Clustering
DBSCAN_EPS = 0.45
DBSCAN_MIN_SAMPLES = 2
KMEANS_DEFAULT_K = 5

# Server
HOST = "127.0.0.1"
PORT = 8000
