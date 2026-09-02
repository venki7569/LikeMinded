# LikeMinded+ : AI-Based User Matching & Automatic Community Generation

A final-year AIML project that matches users based on interests and goals, and automatically generates communities using NLP, vectorization, and clustering.

## 🏗️ Architecture

```
User Profile → NLP Preprocessing → Vectorization (TF-IDF / BERT)
    → Cosine Similarity → Top Matches + Explanations
    → Clustering (DBSCAN / K-Means / Rule-based) → Communities
```

## 📁 Project Structure

```
likeminded-plus/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings
│   │   ├── database.py          # SQLite + SQLAlchemy
│   │   ├── models/user.py       # User model
│   │   ├── routes/
│   │   │   ├── users.py         # CRUD endpoints
│   │   │   ├── matching.py      # Matching endpoints
│   │   │   └── communities.py   # Community endpoints
│   │   ├── services/
│   │   │   ├── nlp_pipeline.py  # Text preprocessing
│   │   │   ├── vectorizer.py    # TF-IDF + BERT
│   │   │   ├── similarity.py    # Cosine similarity
│   │   │   ├── clustering.py    # DBSCAN / K-Means / Rules
│   │   │   └── explainer.py     # Match explanations
│   │   └── utils/seed_data.py   # Sample data seeder
│   ├── data/sample_users.json   # 50 sample profiles
│   ├── requirements.txt
│   └── run.py                   # Server launcher
├── frontend/
│   ├── index.html               # Dashboard
│   ├── register.html            # Registration
│   ├── matches.html             # Match explorer
│   ├── communities.html         # Community browser
│   ├── css/styles.css           # Design system
│   └── js/                      # Page scripts
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip

### Installation

```bash
cd backend
pip install -r requirements.txt
python run.py
```

The server starts at **http://127.0.0.1:8000**

- **Dashboard**: http://127.0.0.1:8000/
- **API Docs**: http://127.0.0.1:8000/docs
- **Register**: http://127.0.0.1:8000/register
- **Matches**: http://127.0.0.1:8000/matches
- **Communities**: http://127.0.0.1:8000/communities-page

## 🧠 AI/ML Components

### 1. NLP Preprocessing (`nlp_pipeline.py`)
- Tokenization using NLTK `word_tokenize`
- Text cleaning (lowercase, remove punctuation/URLs)
- Stopword removal
- Lemmatization using WordNet

### 2. Vectorization (`vectorizer.py`)
- **TF-IDF**: Scikit-learn TfidfVectorizer with bigrams
- **BERT**: Sentence-transformers `all-MiniLM-L6-v2` (auto-downloads)

### 3. Similarity (`similarity.py`)
- Cosine similarity matrix computation
- Top-N match retrieval

### 4. Clustering (`clustering.py`)
- **Rule-Based**: Groups by domain, tracks role diversity
- **DBSCAN**: Density-based, no predefined K needed
- **K-Means**: User-specified number of clusters

### 5. Explainability (`explainer.py`)
- Match explanations (shared interests, domain overlap, complementary roles)
- Community explanations (dominant domain, role diversity, common themes)

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | System statistics |
| GET | `/api/users` | List all users |
| POST | `/api/users` | Register user |
| GET | `/api/users/{id}` | Get user details |
| DELETE | `/api/users/{id}` | Delete user |
| GET | `/api/match/{id}?method=tfidf&top_n=10` | Find matches |
| GET | `/api/match/matrix/full?method=tfidf` | Similarity matrix |
| GET | `/api/communities?method=rule` | Generate communities |
| GET | `/api/communities/explain/{id}` | Explain community |

## 🎨 Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **ML/NLP**: NLTK, Scikit-learn, Sentence-Transformers
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Algorithms**: TF-IDF, BERT, Cosine Similarity, DBSCAN, K-Means
