"""
Community API routes — auto-generate communities using clustering or rules.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.nlp_pipeline import combine_user_fields
from app.services.vectorizer import tfidf_vectorize, bert_vectorize
from app.services.clustering import (
    cluster_dbscan, cluster_kmeans, cluster_rule_based, enrich_communities
)
from app.services.explainer import explain_community

router = APIRouter(prefix="/api/communities", tags=["Communities"])


@router.get("")
def generate_communities(
    method: str = Query("rule", enum=["dbscan", "kmeans", "rule"]),
    k: int = Query(5, ge=2, le=20),
    vectorizer: str = Query("tfidf", enum=["tfidf", "bert"]),
    db: Session = Depends(get_db),
):
    """
    Auto-generate communities.
    method: 'dbscan', 'kmeans', or 'rule'
    k: number of clusters (only for kmeans)
    vectorizer: 'tfidf' or 'bert' (only for dbscan/kmeans)
    """
    users = db.query(User).order_by(User.id).all()
    if len(users) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 users")

    user_dicts = [u.to_dict() for u in users]

    if method == "rule":
        result = cluster_rule_based(user_dicts)
    else:
        documents = [combine_user_fields(ud) for ud in user_dicts]
        if vectorizer == "bert":
            vectors = bert_vectorize(documents)
        else:
            vectors, _ = tfidf_vectorize(documents)

        if method == "dbscan":
            result = cluster_dbscan(vectors)
        else:
            result = cluster_kmeans(vectors, k=k)

    # Enrich with user details
    result = enrich_communities(result, user_dicts)

    # Add member details to each community
    for comm in result["communities"]:
        comm["member_details"] = []
        for idx in comm["members"]:
            if idx < len(user_dicts):
                comm["member_details"].append({
                    "id": user_dicts[idx]["id"],
                    "name": user_dicts[idx]["name"],
                    "domain": user_dicts[idx]["domain"],
                    "role": user_dicts[idx]["role"],
                })

    return result


@router.get("/explain/{community_id}")
def explain_community_endpoint(
    community_id: int,
    method: str = Query("rule", enum=["dbscan", "kmeans", "rule"]),
    k: int = Query(5, ge=2, le=20),
    vectorizer: str = Query("tfidf", enum=["tfidf", "bert"]),
    db: Session = Depends(get_db),
):
    """Get explanation for a specific community."""
    # Re-generate communities to find the one requested
    users = db.query(User).order_by(User.id).all()
    user_dicts = [u.to_dict() for u in users]

    if method == "rule":
        result = cluster_rule_based(user_dicts)
    else:
        documents = [combine_user_fields(ud) for ud in user_dicts]
        if vectorizer == "bert":
            vectors = bert_vectorize(documents)
        else:
            vectors, _ = tfidf_vectorize(documents)
        if method == "dbscan":
            result = cluster_dbscan(vectors)
        else:
            result = cluster_kmeans(vectors, k=k)

    result = enrich_communities(result, user_dicts)

    # Find community
    community = None
    for comm in result["communities"]:
        if comm["id"] == community_id:
            community = comm
            break

    if community is None:
        raise HTTPException(status_code=404, detail="Community not found")

    explanation = explain_community(community, user_dicts)
    return explanation
