"""
Matching API routes — find similar users using TF-IDF or BERT + cosine similarity.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.nlp_pipeline import combine_user_fields
from app.services.vectorizer import tfidf_vectorize, bert_vectorize
from app.services.similarity import compute_similarity_matrix, get_top_matches, get_full_matrix_data
from app.services.explainer import explain_match

router = APIRouter(prefix="/api/match", tags=["Matching"])


def _get_users_and_docs(db: Session):
    """Helper to fetch users and build documents."""
    users = db.query(User).order_by(User.id).all()
    if len(users) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 users for matching")
    user_dicts = [u.to_dict() for u in users]
    documents = [combine_user_fields(ud) for ud in user_dicts]
    return user_dicts, documents


@router.get("/{user_id}")
def match_user(
    user_id: int,
    method: str = Query("tfidf", enum=["tfidf", "bert"]),
    top_n: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """
    Find top-N similar users for a given user.
    method: 'tfidf' or 'bert'
    """
    user_dicts, documents = _get_users_and_docs(db)

    # Find user index
    user_index = None
    for i, u in enumerate(user_dicts):
        if u["id"] == user_id:
            user_index = i
            break
    if user_index is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Vectorize
    if method == "bert":
        vectors = bert_vectorize(documents)
    else:
        vectors, _ = tfidf_vectorize(documents)

    # Compute similarity
    sim_matrix = compute_similarity_matrix(vectors)
    top_matches = get_top_matches(sim_matrix, user_index, top_n)

    # Build response with explanations
    results = []
    for matched_idx, score in top_matches:
        explanation = explain_match(user_dicts[user_index], user_dicts[matched_idx], score)
        results.append({
            "user": user_dicts[matched_idx],
            "similarity_score": round(score * 100, 1),
            "explanation": explanation,
        })

    return {
        "query_user": user_dicts[user_index],
        "method": method,
        "top_n": top_n,
        "matches": results,
    }


@router.get("/matrix/full")
def similarity_matrix(
    method: str = Query("tfidf", enum=["tfidf", "bert"]),
    db: Session = Depends(get_db),
):
    """Get the full similarity matrix for all users (for heatmap visualization)."""
    user_dicts, documents = _get_users_and_docs(db)

    if method == "bert":
        vectors = bert_vectorize(documents)
    else:
        vectors, _ = tfidf_vectorize(documents)

    sim_matrix = compute_similarity_matrix(vectors)
    matrix_data = get_full_matrix_data(sim_matrix)

    return {
        "method": method,
        "labels": [u["name"] for u in user_dicts],
        "matrix": matrix_data,
    }
