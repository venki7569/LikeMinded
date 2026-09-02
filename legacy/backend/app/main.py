"""
LikeMinded+ — FastAPI Application Entry Point.
AI-Based User Matching and Automatic Community Generation System.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.config import CORS_ORIGINS
from app.database import init_db, SessionLocal
from app.routes import users, matching, communities
from app.utils.seed_data import seed_database

# Create FastAPI app
app = FastAPI(
    title="LikeMinded+",
    description="AI-Based User Matching and Automatic Community Generation System",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(users.router)
app.include_router(matching.router)
app.include_router(communities.router)

# Mount frontend static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/css", StaticFiles(directory=os.path.join(frontend_dir, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(frontend_dir, "js")), name="js")
    if os.path.exists(os.path.join(frontend_dir, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")


@app.on_event("startup")
def startup_event():
    """Initialize database and seed data on startup."""
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    print("LikeMinded+ API is ready!")


@app.get("/", include_in_schema=False)
def serve_index():
    """Serve the frontend dashboard."""
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "LikeMinded+ API is running. Visit /docs for API documentation."}


@app.get("/register", include_in_schema=False)
def serve_register():
    return FileResponse(os.path.join(frontend_dir, "register.html"))


@app.get("/matches", include_in_schema=False)
def serve_matches():
    return FileResponse(os.path.join(frontend_dir, "matches.html"))


@app.get("/communities-page", include_in_schema=False)
def serve_communities():
    return FileResponse(os.path.join(frontend_dir, "communities.html"))


@app.get("/api/stats")
def get_stats():
    """Get system statistics for the dashboard."""
    db = SessionLocal()
    try:
        from app.models.user import User
        total_users = db.query(User).count()
        domains = db.query(User.domain).distinct().all()
        domain_list = [d[0] for d in domains]
        return {
            "total_users": total_users,
            "total_domains": len(domain_list),
            "domains": domain_list,
        }
    finally:
        db.close()
