"""
Explainer Module — Generates human-readable explanations for matches and communities.
"""
from app.services.nlp_pipeline import extract_keywords, preprocess


def explain_match(user_a: dict, user_b: dict, similarity_score: float) -> dict:
    """
    Generate an explanation for why two users matched.
    Identifies shared interests, domain overlap, and common goals.
    """
    reasons = []

    # Domain overlap
    if user_a.get("domain", "").lower() == user_b.get("domain", "").lower():
        reasons.append(f"Both are in the **{user_a['domain']}** domain")

    # Shared interests
    interests_a = set(i.strip().lower() for i in user_a.get("interests", "").split(","))
    interests_b = set(i.strip().lower() for i in user_b.get("interests", "").split(","))
    shared = interests_a & interests_b
    if shared:
        reasons.append(f"Shared interests: {', '.join(shared)}")

    # Common goal keywords
    goals_a = set(preprocess(user_a.get("goals", "")).split())
    goals_b = set(preprocess(user_b.get("goals", "")).split())
    common_goals = goals_a & goals_b
    if len(common_goals) > 2:
        top_common = list(common_goals)[:5]
        reasons.append(f"Similar goals around: {', '.join(top_common)}")

    # Complementary roles
    role_a = user_a.get("role", "").lower()
    role_b = user_b.get("role", "").lower()
    if role_a != role_b and user_a.get("domain") == user_b.get("domain"):
        reasons.append(f"Complementary roles: **{user_a['role']}** + **{user_b['role']}**")

    # Skill level
    if user_a.get("skill_level") == user_b.get("skill_level"):
        reasons.append(f"Same skill level: {user_a['skill_level']}")

    if not reasons:
        reasons.append("Similar overall profile based on NLP analysis")

    return {
        "similarity_score": round(similarity_score * 100, 1),
        "reasons": reasons,
        "summary": f"{user_a['name']} and {user_b['name']} have a "
                   f"{round(similarity_score * 100, 1)}% match"
                   + (f" — mainly due to {reasons[0].lower()}" if reasons else ""),
    }


def explain_community(community: dict, users: list) -> dict:
    """
    Generate an explanation for why a community was formed.
    """
    reasons = []
    members = []
    for idx in community.get("members", []):
        if idx < len(users):
            members.append(users[idx])

    # Domain analysis
    dominant = community.get("dominant_domain", "Unknown")
    reasons.append(f"Centered around the **{dominant}** domain")

    # Role diversity
    unique_roles = community.get("unique_roles", [])
    if len(unique_roles) > 1:
        reasons.append(f"Diverse roles: {', '.join(unique_roles)}")
        reasons.append("Members bring complementary skills to the group")
    elif len(unique_roles) == 1:
        reasons.append(f"All members share the **{unique_roles[0]}** role")

    # Size
    size = community.get("size", 0)
    reasons.append(f"Community has **{size}** members")

    # Cohesion
    diversity = community.get("role_diversity", 0)
    if diversity > 0.7:
        reasons.append("High role diversity — great for collaboration")
    elif diversity > 0.4:
        reasons.append("Moderate role diversity — balanced team")
    else:
        reasons.append("Low role diversity — specialized group")

    # Shared keywords across members
    all_text = " ".join([
        m.get("interests", "") + " " + m.get("goals", "")
        for m in members
    ])
    keywords = extract_keywords(all_text, top_n=8)
    if keywords:
        reasons.append(f"Common themes: {', '.join(keywords)}")

    return {
        "community_name": community.get("name", "Unknown"),
        "reasons": reasons,
        "summary": f"This community groups {size} members around {dominant} "
                   f"with {len(unique_roles)} different roles",
    }
