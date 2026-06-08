import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter
import requests
from bs4 import BeautifulSoup
import pypdf
import docx
import os
import uuid
from typing import List, Dict, Tuple
from core.config import settings

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(
    path=settings.chroma_persist_dir,
    settings=ChromaSettings(anonymized_telemetry=False)
)

# Collection for Paysys knowledge
collection = chroma_client.get_or_create_collection(
    name="paysys_knowledge",
    metadata={"hnsw:space": "cosine"}
)

# Embedding model - runs locally, no API cost
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Text splitter
splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", ". ", " ", ""]
)

def embed_texts(texts: List[str]) -> List[List[float]]:
    return embedding_model.encode(texts, show_progress_bar=False).tolist()

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for page in reader.pages:
            text += page.extract_text() + "\n"
    return text

def extract_text_from_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])

def extract_text_from_url(url: str) -> Tuple[str, str]:
    """Returns (title, content)"""
    headers = {"User-Agent": "Mozilla/5.0 (compatible; PaysysBot/1.0)"}
    response = requests.get(url, headers=headers, timeout=15)
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Remove nav, footer, scripts
    for tag in soup(["nav", "footer", "script", "style", "header"]):
        tag.decompose()
    
    title = soup.find("title")
    title_text = title.get_text(strip=True) if title else url
    
    # Get main content
    main = soup.find("main") or soup.find("article") or soup.find("body")
    content = main.get_text(separator="\n", strip=True) if main else ""
    
    # Clean up excessive whitespace
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    return title_text, "\n".join(lines)

def add_to_knowledge_base(
    text: str,
    source_id: str,
    source_name: str,
    source_type: str,
    metadata: dict = {}
) -> int:
    """Chunks text and adds to ChromaDB. Returns chunk count."""
    chunks = splitter.split_text(text)
    if not chunks:
        return 0
    
    embeddings = embed_texts(chunks)
    
    ids = [f"{source_id}_{i}" for i in range(len(chunks))]
    metadatas = [{
        "source_id": source_id,
        "source_name": source_name,
        "source_type": source_type,
        "chunk_index": i,
        **metadata
    } for i in range(len(chunks))]
    
    # Add in batches of 100
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        collection.add(
            ids=ids[i:i+batch_size],
            embeddings=embeddings[i:i+batch_size],
            documents=chunks[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size]
        )
    
    return len(chunks)

def remove_from_knowledge_base(source_id: str):
    """Remove all chunks for a source"""
    results = collection.get(where={"source_id": source_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])

def search_knowledge_base(query: str, n_results: int = 5) -> List[Dict]:
    """Search and return relevant chunks"""
    query_embedding = embed_texts([query])[0]
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count() or 1),
        include=["documents", "metadatas", "distances"]
    )
    
    if not results["documents"][0]:
        return []
    
    return [
        {
            "content": doc,
            "source_name": meta.get("source_name", ""),
            "source_type": meta.get("source_type", ""),
            "relevance": round(1 - dist, 3)
        }
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        )
        if (1 - dist) > 0.3  # minimum relevance threshold
    ]

def get_knowledge_stats() -> dict:
    count = collection.count()
    return {"total_chunks": count}
