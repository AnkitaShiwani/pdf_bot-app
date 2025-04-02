from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
uri = os.getenv("uri")  
client = MongoClient(uri)

# Create a database reference
db = client["pdf_chatbot"]  
pdf_collection = db["pdf_texts"]  # Collection inside the database

# Insert a test document (this creates the DB & collection)
pdf_collection.insert_one({"test": "Database is now created!"})

# Verify if database now exists
print("Databases after insertion:", client.list_database_names())
print("Collections in pdf_chatbot:", db.list_collection_names())
