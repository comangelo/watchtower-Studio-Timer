from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import fitz  # PyMuPDF

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Constants
WORDS_PER_MINUTE = 180
QUESTION_ANSWER_TIME = 35  # seconds

# Define Models
class QuestionInfo(BaseModel):
    text: str
    answer_time: int = QUESTION_ANSWER_TIME

class ParagraphAnalysis(BaseModel):
    number: int
    text: str
    word_count: int
    reading_time_seconds: float
    questions: List[QuestionInfo] = []
    total_time_seconds: float

class PDFAnalysisResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    total_words: int
    total_paragraphs: int
    total_questions: int
    total_reading_time_seconds: float
    total_question_time_seconds: float
    total_time_seconds: float
    paragraphs: List[ParagraphAnalysis]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes using PyMuPDF"""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def split_into_paragraphs(text: str) -> List[str]:
    """Split text into paragraphs"""
    # Split by double newlines or multiple newlines
    paragraphs = re.split(r'\n\s*\n+', text.strip())
    # Clean up each paragraph
    paragraphs = [p.strip() for p in paragraphs if p.strip()]
    return paragraphs


def count_words(text: str) -> int:
    """Count words in text"""
    words = re.findall(r'\b\w+\b', text)
    return len(words)


def calculate_reading_time(word_count: int) -> float:
    """Calculate reading time in seconds based on 180 words per minute"""
    return (word_count / WORDS_PER_MINUTE) * 60


def detect_questions(text: str, paragraph_number: int) -> List[QuestionInfo]:
    """
    Detect questions in paragraph that start with the paragraph number.
    Questions are identified by their paragraph number at the beginning.
    Example: paragraph 5 has questions starting with "5." or "5)"
    """
    questions = []
    
    # Pattern to match questions starting with paragraph number
    # Matches patterns like "5.", "5)", "5-", "5:" followed by text ending with "?"
    pattern = rf'(?:^|\n)\s*{paragraph_number}[\.\)\-:]\s*([^\n]*\?)'
    matches = re.findall(pattern, text, re.MULTILINE | re.IGNORECASE)
    
    for match in matches:
        questions.append(QuestionInfo(
            text=match.strip(),
            answer_time=QUESTION_ANSWER_TIME
        ))
    
    # Also detect questions that just end with "?" within the paragraph
    # if they're on their own line or clearly separated
    if not questions:
        # Look for any question marks in the text
        question_sentences = re.findall(r'([^.!?\n]+\?)', text)
        for q in question_sentences:
            q = q.strip()
            if len(q) > 10:  # Filter out very short matches
                questions.append(QuestionInfo(
                    text=q,
                    answer_time=QUESTION_ANSWER_TIME
                ))
    
    return questions


def analyze_pdf_content(text: str, filename: str) -> PDFAnalysisResult:
    """Analyze PDF content and return structured analysis"""
    paragraphs = split_into_paragraphs(text)
    
    analyzed_paragraphs = []
    total_words = 0
    total_questions = 0
    total_reading_time = 0.0
    total_question_time = 0.0
    
    for i, para_text in enumerate(paragraphs, 1):
        word_count = count_words(para_text)
        reading_time = calculate_reading_time(word_count)
        questions = detect_questions(para_text, i)
        question_time = len(questions) * QUESTION_ANSWER_TIME
        
        total_words += word_count
        total_questions += len(questions)
        total_reading_time += reading_time
        total_question_time += question_time
        
        analyzed_paragraphs.append(ParagraphAnalysis(
            number=i,
            text=para_text[:500] + ("..." if len(para_text) > 500 else ""),
            word_count=word_count,
            reading_time_seconds=round(reading_time, 2),
            questions=questions,
            total_time_seconds=round(reading_time + question_time, 2)
        ))
    
    return PDFAnalysisResult(
        filename=filename,
        total_words=total_words,
        total_paragraphs=len(paragraphs),
        total_questions=total_questions,
        total_reading_time_seconds=round(total_reading_time, 2),
        total_question_time_seconds=round(total_question_time, 2),
        total_time_seconds=round(total_reading_time + total_question_time, 2),
        paragraphs=analyzed_paragraphs
    )


# Routes
@api_router.get("/")
async def root():
    return {"message": "PDF Reading Timer API"}


@api_router.post("/analyze-pdf", response_model=PDFAnalysisResult)
async def analyze_pdf(file: UploadFile = File(...)):
    """Upload and analyze a PDF file for reading time"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")
    
    try:
        pdf_bytes = await file.read()
        text = extract_text_from_pdf(pdf_bytes)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="No se pudo extraer texto del PDF")
        
        result = analyze_pdf_content(text, file.filename)
        
        # Save to database
        doc = result.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.pdf_analyses.insert_one(doc)
        
        return result
        
    except Exception as e:
        logging.error(f"Error analyzing PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar el PDF: {str(e)}")


@api_router.get("/analyses", response_model=List[PDFAnalysisResult])
async def get_analyses():
    """Get all PDF analyses"""
    analyses = await db.pdf_analyses.find(
        {}, 
        {"_id": 0}
    ).sort("timestamp", -1).to_list(50)
    for analysis in analyses:
        if isinstance(analysis.get('timestamp'), str):
            analysis['timestamp'] = datetime.fromisoformat(analysis['timestamp'])
    return analyses


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find(
        {}, 
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
