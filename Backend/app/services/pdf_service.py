from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_huggingface import HuggingFaceEmbeddings
from app.db.database import vector_col

def process_pdf(path, chat_id):
    # 1. Load and Split PDF
    loader = PyPDFLoader(path)
    docs = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = splitter.split_documents(docs)

    # 2. Add chatId to metadata so we only search THIS specific PDF later
    for chunk in chunks:
        chunk.metadata["chatId"] = chat_id

    # 3. Generate Embeddings
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 4. Save directly to MongoDB Atlas
    MongoDBAtlasVectorSearch.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection=vector_col,
        index_name="default" # Matches the name in Atlas UI
    )