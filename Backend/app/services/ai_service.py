from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from app.db.database import vector_col

def ask_ai(question, chat_id):
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 1. Connect to the existing Vector Store in Atlas
    vector_store = MongoDBAtlasVectorSearch(
        collection=vector_col,
        embedding=embeddings,
        index_name="default"
    )

    # 2. Search only within the specific Chat ID
    # This prevents the AI from reading other users' PDFs
    docs = vector_store.similarity_search(
        question, 
        k=4, 
        pre_filter={"chatId": {"$eq": chat_id}}
    )
    
    context = " ".join([doc.page_content for doc in docs])

    # 3. Standard Gemini Call
    llm = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash-lite")
    response = llm.invoke(f"Answer using context: {context} Question: {question}")
    
    return response.content