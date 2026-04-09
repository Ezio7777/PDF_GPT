import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()

def ask_ai(question, chat_id):
    # 1. Use the same embedding model used in process_pdf
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 2. Ensure the path matches exactly where process_pdf saved it
    # If you used INDEX_DIR = "vector_storage" earlier, use it here too
    index_path = f"faiss_index_{chat_id}" 
    
    if not os.path.exists(index_path):
        raise Exception(f"Index folder {index_path} not found. Did you upload the PDF successfully?")

    # 3. Load the vector store
    db = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)

    # 4. Search for context
    # Note: invoke() is the modern way, get_relevant_documents is being deprecated
    docs = db.as_retriever().invoke(question)
    context = " ".join([doc.page_content for doc in docs])

    # 5. Call Gemini
    llm = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash-lite")

    # 6. Return the text content
    response = llm.invoke(f"Answer using context: {context} Question: {question}")
    return response.content
