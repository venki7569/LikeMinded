"""
Vectorization Engine — TF-IDF and BERT embeddings for user profiles.
"""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from app.config import TFIDF_MAX_FEATURES, BERT_MODEL_NAME

# Lazy-loaded BERT model
_bert_model = None
_tfidf_vectorizer = None
_tfidf_matrix = None


def get_bert_model():
    """Lazy-load the sentence-transformers BERT model."""
    global _bert_model
    if _bert_model is None:
        from sentence_transformers import SentenceTransformer
        _bert_model = SentenceTransformer(BERT_MODEL_NAME)
    return _bert_model


def tfidf_vectorize(documents: list) -> tuple:
    """
    Vectorize documents using TF-IDF.
    Returns (tfidf_matrix, vectorizer).
    """
    global _tfidf_vectorizer, _tfidf_matrix
    _tfidf_vectorizer = TfidfVectorizer(
        max_features=TFIDF_MAX_FEATURES,
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.95,
    )
    _tfidf_matrix = _tfidf_vectorizer.fit_transform(documents)
    return _tfidf_matrix, _tfidf_vectorizer


def bert_vectorize(documents: list) -> np.ndarray:
    """
    Vectorize documents using BERT sentence embeddings.
    Returns a numpy array of shape (n_docs, embedding_dim).
    """
    model = get_bert_model()
    embeddings = model.encode(documents, show_progress_bar=False, normalize_embeddings=True)
    return np.array(embeddings)


def get_tfidf_feature_names() -> list:
    """Return feature names from the fitted TF-IDF vectorizer."""
    if _tfidf_vectorizer is not None:
        return _tfidf_vectorizer.get_feature_names_out().tolist()
    return []
