from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import google.generativeai as genai
import pdfplumber
import os
from dotenv import load_dotenv
from datetime import datetime
import pymongo
import bcrypt
from bson import ObjectId
import json

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("⚠️ GEMINI_API_KEY is missing! Please check your .env file.")

# Configure Gemini AI
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-2.0-flash')

# Connect to MongoDB
uri = os.getenv("MONGO_URI")
mongo_client = pymongo.MongoClient(uri)
db = mongo_client["pdf_chatbot_db"]
users_collection = db["users"]
summaries_collection = db["summaries"]

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure 'uploads' directory exists
os.makedirs("uploads", exist_ok=True)

# Model classes
class TextRequest(BaseModel):
    text: str

class TranslateRequest(BaseModel):
    text: str
    target_lang: str

class QARequest(BaseModel):
    question: str
    context: str

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str

class SummaryCreate(BaseModel):
    user_id: str
    text: str
    summary: str

# Helper function for JSON serialization of MongoDB ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(MongoJSONEncoder, self).default(obj)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-Powered PDF Chatbot API! (Now using Gemini 2.0 Flash)"}

# User Registration
@app.post("/register/")
async def register_user(user: UserCreate):
    # Check if username already exists
    if users_collection.find_one({"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already exists")

    # Hash the password
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    
    # Create new user
    user_data = {
        "username": user.username,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    
    result = users_collection.insert_one(user_data)
    
    return {
        "id": str(result.inserted_id),
        "username": user.username
    }

# User Login
@app.post("/login/")
async def login_user(user: UserLogin):
    # Find user by username
    db_user = users_collection.find_one({"username": user.username})
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    if not bcrypt.checkpw(user.password.encode('utf-8'), db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return {
        "id": str(db_user["_id"]),
        "username": db_user["username"]
    }

# Get user's summary history
@app.get("/user/{user_id}/summaries")
async def get_user_summaries(user_id: str):
    try:
        # Convert string ID to ObjectId
        obj_id = ObjectId(user_id)
        
        # Find summaries for this user
        summaries = list(summaries_collection.find({"user_id": obj_id}))
        
        # Convert ObjectId to string for JSON serialization
        for summary in summaries:
            summary["_id"] = str(summary["_id"])
            summary["user_id"] = str(summary["user_id"])
        
        return summaries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ Upload & Extract Text from PDF
@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(file.file.read())
        
        text = extract_text_from_pdf(file_path)
        return {"filename": file.filename, "extracted_text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def extract_text_from_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        return ''.join([page.extract_text() for page in pdf.pages if page.extract_text()]) or "No text found."

# ✅ AI-Based Summarization
@app.post("/summarize/")
async def summarize_text(request: TextRequest, user_id: str = None):
    try:
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
            
        if len(request.text) > 10000:  # Limiting text length to prevent API issues
            raise HTTPException(status_code=400, detail="Text is too long. Maximum length is 10000 characters")
            
        summary = await process_gemini_request(f"Summarize this text briefly:\n{request.text}")
        if not summary:
            raise HTTPException(status_code=500, detail="Failed to generate summary")
        
        # Save summary to database if user_id is provided
        if user_id:
            try:
                # Convert string ID to ObjectId
                obj_id = ObjectId(user_id)
                
                # Save to database
                summaries_collection.insert_one({
                    "user_id": obj_id,
                    "original_text": request.text,
                    "summary": summary,
                    "created_at": datetime.utcnow()
                })
            except Exception as e:
                print(f"Error saving summary: {str(e)}")
                # Don't fail the request if saving fails
            
        return {"summary": summary}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error in summarize_text: {str(e)}")  # Add logging
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while summarizing the text: {str(e)}"
        )

# ✅ AI-Powered Translation (No Order Restriction)
SUPPORTED_LANGUAGES = {"en": "English", "fr": "French", "es": "Spanish", "de": "German", "ar": "Arabic", "ru": "Russian", "zh": "Chinese", "ja": "Japanese", "ko": "Korean", "hi": "Hindi", "it": "Italian", "kn":"Kannada", "te": "Telugu", "ta": "Tamil", "po": "Portuguese", "nl": "Dutch"}

@app.post("/translate/")
async def translate_text(request: TranslateRequest):
    if request.target_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported language")
    try:
        prompt = f"Translate this text to {SUPPORTED_LANGUAGES[request.target_lang]}:\n{request.text}"
        translated_text = await process_gemini_request(prompt)
        return {"translated_text": translated_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ AI-Powered Q/A (No Order Restriction)
@app.post("/ask_question/")
async def ask_question(request: QARequest):
    try:
        prompt = f"Context: {request.context}\nQuestion: {request.question}"
        answer = await process_gemini_request(prompt)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ Process Gemini AI Requests (Handles All Requests Efficiently)
async def process_gemini_request(prompt):
    try:
        response = gemini_model.generate_content(prompt)
        return response.text if hasattr(response, "text") else "No response received."
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

# ✅ Serve Static Audio Files (No Order Restriction)
@app.get("/static/{filename}")
async def get_audio_file(filename: str):
    file_path = f"uploads/{filename}"
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg")
    raise HTTPException(status_code=404, detail="File not found")
