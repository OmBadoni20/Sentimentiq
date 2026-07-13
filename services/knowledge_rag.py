# ============================================================
# KNOWLEDGE BASE RAG MODULE
# Implements Retrieval-Augmented Generation over the
# knowledge base files using LangChain + Chroma.
#
# Instead of injecting the ENTIRE knowledge base into every
# prompt, this splits the knowledge into chunks, embeds them,
# and retrieves only the most relevant sections for each query.
#
# Uses HuggingFace embeddings (free, local, no API cost).
#
# Setup (one time):
#   pip install langchain-community chromadb sentence-transformers
# ============================================================

import os

# Knowledge base files
KB_DIR = os.path.join(os.path.dirname(__file__), '..', 'knowledge_base')
KB_FILES = {
    'ticket':    'ticket_routing.txt',
    'sentiment': 'sentiment_guide.txt',
    'report':    'report_guide.txt',
}

# Globals — built once on startup
_VECTORSTORE = None
_RAG_AVAILABLE = False


def _load_file(filename: str) -> str:
    path = os.path.join(KB_DIR, filename)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"[RAG] Could not load {filename}: {e}")
        return ""


def build_vectorstore():
    """
    Builds the vector store from all knowledge base files.
    Called once on startup. Returns True if successful.
    """
    global _VECTORSTORE, _RAG_AVAILABLE

    try:
        from langchain_community.vectorstores import Chroma
        from langchain_community.embeddings import HuggingFaceEmbeddings
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_core.documents import Document
    except ImportError as e:
        print(f"[RAG] Libraries not installed — RAG disabled. ({e})")
        print("[RAG] To enable: pip install langchain-community "
              "chromadb sentence-transformers")
        _RAG_AVAILABLE = False
        return False

    try:
        # Load each file and tag its chunks with the source agent
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=700,
            chunk_overlap=120,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

        all_docs = []
        for agent_key, filename in KB_FILES.items():
            text = _load_file(filename)
            if not text.strip():
                continue
            chunks = splitter.split_text(text)
            for chunk in chunks:
                all_docs.append(Document(
                    page_content=chunk,
                    metadata={"agent": agent_key, "source": filename},
                ))

        if not all_docs:
            print("[RAG] No knowledge base content found.")
            _RAG_AVAILABLE = False
            return False

        # Free, local embeddings — no API key needed
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
        )

        _VECTORSTORE = Chroma.from_documents(
            documents=all_docs,
            embedding=embeddings,
            collection_name="sentimentiq_kb",
        )

        _RAG_AVAILABLE = True
        print(f"[RAG] Vector store built — {len(all_docs)} chunks indexed "
              f"from {len(KB_FILES)} files.")
        return True

    except Exception as e:
        print(f"[RAG] Build failed: {e}")
        _RAG_AVAILABLE = False
        return False


def retrieve(query: str, agent: str = None, k: int = 3) -> str:
    """
    Retrieves the k most relevant knowledge chunks for a query.
    Optionally filters to a specific agent's knowledge.
    Returns the chunks joined as a string.

    If RAG is unavailable, returns empty string (caller should
    fall back to full knowledge base loading).
    """
    if not _RAG_AVAILABLE or _VECTORSTORE is None:
        return ""

    try:
        if agent:
            docs = _VECTORSTORE.similarity_search(
                query, k=k, filter={"agent": agent}
            )
        else:
            docs = _VECTORSTORE.similarity_search(query, k=k)

        return "\n\n".join(d.page_content for d in docs)
    except Exception as e:
        print(f"[RAG] Retrieval error: {e}")
        return ""


def is_available() -> bool:
    return _RAG_AVAILABLE