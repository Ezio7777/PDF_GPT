from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from app.db.database import vector_col

# Module-level cache — model loads once on first use, not at import time
_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings


def ask_ai(question, chat_id):
    embeddings = get_embeddings()   # ← cached, won't re-download

    vector_store = MongoDBAtlasVectorSearch(
        collection=vector_col,
        embedding=embeddings,
        index_name="default"
    )

    docs = vector_store.similarity_search(
        question,
        k=4,
        pre_filter={"chatId": {"$eq": chat_id}}
    )

    context = " ".join([doc.page_content for doc in docs])

    llm = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash-lite")
    response = llm.invoke(f"Answer using context: {context} Question: {question}")

    return response.content