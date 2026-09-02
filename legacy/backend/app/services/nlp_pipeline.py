"""
NLP Preprocessing Pipeline for LikeMinded+.
Handles text cleaning, tokenization, stopword removal, and lemmatization.
"""
import re
import string
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Download required NLTK data (runs once)
for pkg in ["punkt", "punkt_tab", "stopwords", "wordnet", "omw-1.4"]:
    nltk.download(pkg, quiet=True)

_stop_words = set(stopwords.words("english"))
_lemmatizer = WordNetLemmatizer()


def clean_text(text: str) -> str:
    """Lowercase, remove URLs/emails/punctuation, normalize whitespace."""
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", "", text)
    text = re.sub(r"\S+@\S+", "", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> list:
    return word_tokenize(text)


def remove_stopwords(tokens: list) -> list:
    return [t for t in tokens if t not in _stop_words and len(t) > 1]


def lemmatize(tokens: list) -> list:
    return [_lemmatizer.lemmatize(t) for t in tokens]


def preprocess(text: str) -> str:
    """Full pipeline: clean -> tokenize -> stopwords -> lemmatize -> rejoin."""
    cleaned = clean_text(text)
    tokens = tokenize(cleaned)
    tokens = remove_stopwords(tokens)
    tokens = lemmatize(tokens)
    return " ".join(tokens)


def combine_user_fields(user: dict) -> str:
    """Combine user fields into a single weighted document for vectorization."""
    parts = [
        user.get("domain", ""), user.get("domain", ""),
        user.get("role", ""), user.get("role", ""),
        user.get("interests", ""), user.get("interests", ""),
        user.get("goals", ""),
        user.get("bio", ""),
    ]
    return preprocess(" ".join(parts))


def extract_keywords(text: str, top_n: int = 10) -> list:
    """Extract top-N keywords from text based on word frequency."""
    tokens = preprocess(text).split()
    freq = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    sorted_tokens = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [t[0] for t in sorted_tokens[:top_n]]
