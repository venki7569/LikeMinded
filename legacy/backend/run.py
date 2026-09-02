"""
LikeMinded+ Server Launcher.
"""
import uvicorn
from app.config import HOST, PORT

if __name__ == "__main__":
    print(f"""
    ╔══════════════════════════════════════════════╗
    ║           LikeMinded+ Server                 ║
    ║   AI-Based User Matching & Community Gen     ║
    ╚══════════════════════════════════════════════╝
    
    Starting server at http://{HOST}:{PORT}
    API docs at http://{HOST}:{PORT}/docs
    """)
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
