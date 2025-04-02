from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import google.generativeai as genai
import pdfplumber
import os
from dotenv import load_dotenv
from datetime import datetime
from database import pdf_collection, summary_collection, qa_collection, db

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("⚠️ GEMINI_API_KEY is missing! Please check your .env file.")

# Configure Gemini AI
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.0-flash")  # ✅ Reuse the model instance

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

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-Powered PDF Chatbot API! (Now using Gemini 2.0 Flash)"}

# ✅ Upload & Extract Text from PDF
@app.post("/upload_pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as f:
            f.write(file.file.read())
        
        text = extract_text_from_pdf(file_path)
        pdf_collection.insert_one({"filename": file.filename, "text": text, "timestamp": datetime.utcnow()})
        return {"filename": file.filename, "extracted_text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def extract_text_from_pdf(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        return ''.join([page.extract_text() for page in pdf.pages if page.extract_text()]) or "No text found."

# ✅ AI-Based Summarization
class TextRequest(BaseModel):
    text: str

@app.post("/summarize/")
async def summarize_text(request: TextRequest):
    try:
        summary = await process_gemini_request(f"Summarize this text briefly:\n{request.text}")
        summary_collection.insert_one({"original_text": request.text, "summary": summary, "timestamp": datetime.utcnow()})
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ AI-Powered Translation (No Order Restriction)
class TranslateRequest(BaseModel):
    text: str
    target_lang: str

SUPPORTED_LANGUAGES = {"en": "English", "fr": "French", "es": "Spanish", "de": "German", "ar": "Arabic", "ru": "Russian", "zh": "Chinese", "ja": "Japanese", "ko": "Korean", "hi": "Hindi", "it": "Italian", "kn":"Kannada", "te": "Telugu", "ta": "Tamil", "po": "Portuguese", "nl": "Dutch"}

@app.post("/translate/")
async def translate_text(request: TranslateRequest):
    if request.target_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported language")
    try:
        prompt = f"Translate this text to {SUPPORTED_LANGUAGES[request.target_lang]}:\n{request.text}"
        translated_text = await process_gemini_request(prompt)
        db["translations"].insert_one({"original_text": request.text, "translated_text": translated_text, "target_language": request.target_lang, "timestamp": datetime.utcnow()})
        return {"translated_text": translated_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ AI-Powered Q/A (No Order Restriction)
class QARequest(BaseModel):
    question: str
    context: str

@app.post("/ask_question/")
async def ask_question(request: QARequest):
    try:
        prompt = f"Context: {request.context}\nQuestion: {request.question}"
        answer = await process_gemini_request(prompt)
        qa_collection.insert_one({"question": request.question, "context": request.context, "answer": answer, "timestamp": datetime.utcnow()})
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
