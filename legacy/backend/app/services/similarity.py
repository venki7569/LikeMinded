"""
Similarity Engine — Cosine similarity computation for user matching.
"""
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import issparse


def compute_similarity_matrix(vectors) -> np.ndarray:
    """
    Compute pairwise cosine similarity matrix.
    Works with both sparse (TF-IDF) and dense (BERT) matrices.
    """
    if issparse(vectors):
        return cosine_similarity(vectors).astype(float)
    return cosine_similarity(vectors).astype(float)


def get_top_matches(similarity_matrix: np.ndarray, user_index: int, top_n: int = 10) -> list:
    """
    Get top-N most similar users for a given user.
    Returns list of (matched_user_index, similarity_score).
    """
    scores = similarity_matrix[user_index]
    # Create index-score pairs, exclude self
    pairs = [(i, float(scores[i])) for i in range(len(scores)) if i != user_index]
    # Sort by score descending
    pairs.sort(key=lambda x: x[1], reverse=True)
    return pairs[:top_n]


def get_full_matrix_data(similarity_matrix: np.ndarray) -> list:
    """Return the similarity matrix as a list of lists for JSON serialization."""
    return [[round(float(v), 4) for v in row] for row in similarity_matrix]
