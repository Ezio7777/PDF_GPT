from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from app.db.database import vector_col

_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    return _embeddings


def ask_ai(question, chat_id):
    embeddings = get_embeddings()

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