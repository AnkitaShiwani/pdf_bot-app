import os
import certifi
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Fetch MongoDB URI from .env
uri = os.getenv("uri")  

if not uri:
    raise ValueError("MongoDB URI is not set in .env file")

try:
    # Connect to MongoDB
    client = MongoClient(uri)
    db = client["pdf_chatbot"]

    # Define Collections
    pdf_collection = db["pdf_texts"]  # Stores extracted text from PDFs
    summary_collection = db["summaries"]  # Stores AI-generated summaries
    qa_collection = db["qa_interactions"]  # Stores questions and answers

    # Insert test data if collections are empty
    if summary_collection.count_documents({}) == 0:
        summary_collection.insert_one({
            "pdf_name": "sample.pdf",
            "summary": "This is a sample summary.",
            "timestamp": "2025-03-28T12:30:00Z"
        })

    if qa_collection.count_documents({}) == 0:
        qa_collection.insert_one({
            "question": "What is MongoDB?",
            "answer": "MongoDB is a NoSQL database.",
            "timestamp": "2025-03-28T12:45:00Z"
        })

    print("✅ Connected to MongoDB successfully and inserted sample data!")
except Exception as e:
    print("❌ Failed to connect to MongoDB:", str(e))

