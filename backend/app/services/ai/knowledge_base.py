"""
AgriMap DSP — AI Knowledge Base & Semantic Search Service
Uses FAISS vector database + OpenAI embeddings for RAG (Retrieval-Augmented Generation).
Enables natural language queries over field data.

Skills used: RAG, FAISS, Embeddings, Semantic Search, Vector Database Concepts
"""
import json
import logging
import os
import uuid
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session

from app.models.field import Field
from app.models.resource import Resource
from app.models.observation import Observation

logger = logging.getLogger(__name__)

# Default knowledge base directory
KB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "knowledge_base")


class KnowledgeBase:
    """
    FAISS-powered knowledge base for semantic search over agricultural field data.
    Implements the RAG pattern: Retrieval → Augmentation → Generation.
    """

    def __init__(self, persist_dir: str = KB_DIR):
        self.persist_dir = persist_dir
        self._index = None
        self._documents: List[Dict[str, Any]] = []
        self._embeddings = None

    def _ensure_dir(self):
        os.makedirs(self.persist_dir, exist_ok=True)

    def build_index(self, db: Session, api_key: Optional[str] = None) -> Dict[str, Any]:
        """
        Build the FAISS index from all field data in the database.
        Each record becomes a document with text embedding.
        """
        documents = []

        # Index all fields
        fields = db.query(Field).all()
        for f in fields:
            doc_text = (
                f"Field: {f.name}. "
                f"Crop History: {f.crop_history_summary or 'unspecified'}. "
                f"Area: {f.calculated_area_hectares or 'unknown'} hectares. "
                f"Status: {f.verification_status}."
            )
            documents.append({
                "text": doc_text,
                "metadata": {"type": "field", "id": str(f.id), "name": f.name}
            })

        # Index all resources
        resources = db.query(Resource).all()
        for r in resources:
            doc_text = (
                f"Resource: {r.name}. "
                f"Class: {r.resource_class}. "
                f"Type: {r.resource_type}. "
                f"Attributes: {json.dumps(r.attributes) if r.attributes else 'none'}. "
                f"Status: {r.verification_status}."
            )
            documents.append({
                "text": doc_text,
                "metadata": {"type": "resource", "id": str(r.id), "name": r.name, "class": r.resource_class}
            })

        # Index all observations
        observations = db.query(Observation).all()
        for o in observations:
            doc_text = (
                f"Observation: category={o.category}. "
                f"Notes: {o.notes or 'none'}. "
                f"Status: {o.verification_status}."
            )
            documents.append({
                "text": doc_text,
                "metadata": {"type": "observation", "id": str(o.id), "category": o.category}
            })

        self._documents = documents

        # Try to build FAISS index with OpenAI embeddings
        if api_key and documents:
            try:
                return self._build_faiss_index(documents, api_key)
            except Exception as e:
                logger.warning("FAISS index build failed: %s. Using keyword search fallback.", e)

        # Save documents for keyword search fallback
        self._ensure_dir()
        doc_path = os.path.join(self.persist_dir, "documents.json")
        with open(doc_path, "w") as f:
            json.dump(documents, f, indent=2)

        return {
            "status": "built",
            "index_type": "keyword_search",
            "total_documents": len(documents),
            "fields_indexed": len(fields),
            "resources_indexed": len(resources),
            "observations_indexed": len(observations),
        }

    def _build_faiss_index(self, documents: List[Dict], api_key: str) -> Dict[str, Any]:
        """Build FAISS vector index using OpenAI embeddings."""
        try:
            from langchain_openai import OpenAIEmbeddings
            from langchain_community.vectorstores import FAISS
            from langchain.schema import Document
        except ImportError:
            raise ImportError("Install: pip install langchain-openai faiss-cpu langchain-community")

        self._embeddings = OpenAIEmbeddings(api_key=api_key)

        # Convert to LangChain documents
        lc_docs = [
            Document(page_content=doc["text"], metadata=doc["metadata"])
            for doc in documents
        ]

        # Build FAISS index
        self._index = FAISS.from_documents(lc_docs, self._embeddings)

        # Persist index
        self._ensure_dir()
        self._index.save_local(self.persist_dir)

        logger.info("FAISS index built with %d documents", len(documents))
        return {
            "status": "built",
            "index_type": "faiss_vector",
            "total_documents": len(documents),
        }

    def search(self, query: str, top_k: int = 5, api_key: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Semantic search over the knowledge base.
        Uses FAISS if available, falls back to keyword matching.
        """
        # Try FAISS search
        if self._index and self._embeddings:
            try:
                results = self._index.similarity_search_with_score(query, k=top_k)
                return [
                    {
                        "text": doc.page_content,
                        "metadata": doc.metadata,
                        "relevance_score": round(1 - score, 4),  # Convert distance to similarity
                    }
                    for doc, score in results
                ]
            except Exception as e:
                logger.warning("FAISS search failed: %s. Using keyword fallback.", e)

        # Keyword search fallback
        return self._keyword_search(query, top_k)

    def _keyword_search(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        """Simple keyword-based search as fallback when FAISS is unavailable."""
        if not self._documents:
            # Try loading from disk
            doc_path = os.path.join(self.persist_dir, "documents.json")
            if os.path.exists(doc_path):
                with open(doc_path) as f:
                    self._documents = json.load(f)

        query_words = set(query.lower().split())
        scored = []

        for doc in self._documents:
            doc_words = set(doc["text"].lower().split())
            overlap = len(query_words & doc_words)
            if overlap > 0:
                score = overlap / max(len(query_words), 1)
                scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)

        return [
            {
                "text": doc["text"],
                "metadata": doc["metadata"],
                "relevance_score": round(score, 4),
            }
            for score, doc in scored[:top_k]
        ]


def query_with_ai(
    query: str,
    db: Session,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Natural language query interface.
    Uses RAG: retrieve relevant documents → augment prompt → generate answer.
    """
    kb = KnowledgeBase()

    # Build/load index
    kb.build_index(db, api_key)

    # Search for relevant documents
    search_results = kb.search(query, top_k=5, api_key=api_key)

    context_text = "\n".join([r["text"] for r in search_results])

    # Try AI-powered answer
    if api_key:
        try:
            from langchain_openai import ChatOpenAI
            from langchain.schema import SystemMessage, HumanMessage

            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=api_key)

            messages = [
                SystemMessage(content=(
                    "You are the AgriMap DSP assistant. Answer questions about agricultural field data "
                    "based on the context provided. Be specific and cite field/resource names."
                )),
                HumanMessage(content=(
                    f"Context:\n{context_text}\n\nQuestion: {query}\n\n"
                    "Answer based on the context above. If the answer isn't in the context, say so."
                )),
            ]

            response = llm.invoke(messages)

            return {
                "query": query,
                "answer": response.content,
                "source_documents": search_results,
                "answer_type": "ai_generated",
            }
        except Exception as e:
            logger.warning("AI query failed: %s", e)

    # Fallback: return search results directly
    return {
        "query": query,
        "answer": f"Found {len(search_results)} relevant results. See source_documents for details.",
        "source_documents": search_results,
        "answer_type": "keyword_search",
    }
