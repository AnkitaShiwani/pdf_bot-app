from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Connect to MongoDB
uri = os.getenv("uri")  
client = MongoClient(uri)
db = client["pdf_chatbot"]

# List all databases
print("Databases:", client.list_database_names())

# List all collections inside `pdf_chatbot`
if "pdf_chatbot" in client.list_database_names():
    print("Collections in pdf_chatbot:", db.list_collection_names())
else:
    print("Database 'pdf_chatbot' does not exist.")
