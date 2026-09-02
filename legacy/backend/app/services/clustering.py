"""
Clustering Engine — Community generation using DBSCAN, K-Means, and rule-based logic.
"""
import numpy as np
from sklearn.cluster import DBSCAN, KMeans
from collections import defaultdict
from app.config import DBSCAN_EPS, DBSCAN_MIN_SAMPLES, KMEANS_DEFAULT_K


def cluster_dbscan(vectors, eps=None, min_samples=None) -> dict:
    """
    DBSCAN clustering — finds natural density-based clusters.
    No need to predefine number of clusters.
    Returns dict with cluster labels and metadata.
    """
    if eps is None:
        eps = DBSCAN_EPS
    if min_samples is None:
        min_samples = DBSCAN_MIN_SAMPLES

    # Convert sparse to dense if needed
    if hasattr(vectors, "toarray"):
        vectors = vectors.toarray()

    clustering = DBSCAN(eps=eps, min_samples=min_samples, metric="cosine")
    labels = clustering.fit_predict(vectors)

    return _build_cluster_result(labels, "DBSCAN")


def cluster_kmeans(vectors, k=None) -> dict:
    """
    K-Means clustering — partitions users into k communities.
    Returns dict with cluster labels and metadata.
    """
    if k is None:
        k = KMEANS_DEFAULT_K

    if hasattr(vectors, "toarray"):
        vectors = vectors.toarray()

    clustering = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = clustering.fit_predict(vectors)

    return _build_cluster_result(labels, "K-Means")


def cluster_rule_based(users: list) -> dict:
    """
    Rule-based clustering — groups users by domain, ensures role diversity.
    Each domain becomes a community with complementary roles.
    """
    domain_groups = defaultdict(list)
    for idx, user in enumerate(users):
        domain = user.get("domain", "Unknown")
        domain_groups[domain].append(idx)

    communities = []
    for domain, member_indices in domain_groups.items():
        roles = []
        for idx in member_indices:
            roles.append(users[idx].get("role", "Unknown"))

        unique_roles = list(set(roles))
        communities.append({
            "id": len(communities),
            "name": f"{domain} Community",
            "members": member_indices,
            "dominant_domain": domain,
            "roles": roles,
            "unique_roles": unique_roles,
            "role_diversity": len(unique_roles) / max(len(roles), 1),
            "size": len(member_indices),
            "method": "Rule-Based",
        })

    return {
        "method": "Rule-Based",
        "n_communities": len(communities),
        "communities": communities,
    }


def _build_cluster_result(labels, method: str) -> dict:
    """Build standardized cluster result from labels."""
    cluster_map = defaultdict(list)
    noise_points = []

    for idx, label in enumerate(labels):
        if label == -1:
            noise_points.append(idx)
        else:
            cluster_map[int(label)].append(idx)

    communities = []
    for cluster_id, member_indices in sorted(cluster_map.items()):
        communities.append({
            "id": cluster_id,
            "name": f"Community {cluster_id + 1}",
            "members": member_indices,
            "size": len(member_indices),
            "method": method,
        })

    return {
        "method": method,
        "n_communities": len(communities),
        "noise_points": noise_points,
        "communities": communities,
    }


def enrich_communities(communities_result: dict, users: list) -> dict:
    """
    Enrich community data with user details: dominant domain, role distribution, etc.
    """
    for comm in communities_result["communities"]:
        domains = []
        roles = []
        for idx in comm["members"]:
            if idx < len(users):
                domains.append(users[idx].get("domain", "Unknown"))
                roles.append(users[idx].get("role", "Unknown"))

        # Dominant domain
        domain_counts = {}
        for d in domains:
            domain_counts[d] = domain_counts.get(d, 0) + 1
        dominant = max(domain_counts.items(), key=lambda x: x[1]) if domain_counts else ("Unknown", 0)
        comm["dominant_domain"] = dominant[0]
        comm["domain_distribution"] = domain_counts

        # Role info
        unique_roles = list(set(roles))
        comm["roles"] = roles
        comm["unique_roles"] = unique_roles
        comm["role_diversity"] = round(len(unique_roles) / max(len(roles), 1), 2)

        # Auto-generate community name
        comm["name"] = f"{dominant[0]} — {', '.join(unique_roles[:3])}"
        if len(unique_roles) > 3:
            comm["name"] += f" +{len(unique_roles) - 3} more"

    return communities_result
