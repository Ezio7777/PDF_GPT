from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from app.db.database import vector_col

_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
       _embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    return _embeddings


def ask_ai(question, chat_id):
    try:
        embeddings = get_embeddings()
        print("✅ Embeddings loaded")

        vector_store = MongoDBAtlasVectorSearch(
            collection=vector_col,
            embedding=embeddings,
            index_name="default"
        )
        print("✅ Vector store connected")

        docs = vector_store.similarity_search(
            question,
            k=4,
            pre_filter={"chatId": {"$eq": chat_id}}
        )
        print(f"✅ Docs found: {len(docs)}")

        context = " ".join([doc.page_content for doc in docs])

        llm = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash-lite")
        print("✅ LLM loaded")

        response = llm.invoke(f"Answer using context: {context} Question: {question}")
        print("✅ Response received")

        return response.content

    except Exception as e:
        print(f"❌ REAL ERROR: {str(e)}")
        raise