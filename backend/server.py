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
    is_final_question: bool = False  # Questions that precede "¿QUÉ RESPONDERÍAS?"

class ParagraphAnalysis(BaseModel):
    number: int
    text: str
    word_count: int
    reading_time_seconds: float
    questions: List[QuestionInfo] = []
    total_time_seconds: float
    cumulative_time_seconds: float = 0  # Time from start to end of this paragraph

class PDFAnalysisResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    total_words: int
    total_paragraphs: int
    total_questions: int
    total_reading_time_seconds: float
    total_question_time_seconds: float
    total_time_seconds: float = 3600  # Always 60 minutes (3600 seconds)
    fixed_duration: bool = True  # Indicates duration is fixed at 60 min
    final_questions_start_time: float = 0  # When final questions section starts
    final_questions: List[QuestionInfo] = []  # Questions after "¿QUÉ RESPONDERÍAS?"
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
    """
    Split text into paragraphs based on paragraph numbers at the start of lines.
    Paragraphs are identified by a number at the beginning (e.g., "1 Texto..." or "2 Texto...")
    """
    paragraphs = []
    
    # First, try to split by paragraph numbers at the start of lines
    # Pattern: number followed by space and text (not a question mark immediately)
    lines = text.split('\n')
    current_paragraph = []
    current_number = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if line starts with a number followed by space (paragraph marker)
        match = re.match(r'^(\d+)\s+(.+)$', line)
        if match:
            num = int(match.group(1))
            content = match.group(2)
            
            # Check if this is a question line (contains ¿ or ends with ?)
            is_question = '¿' in content or content.endswith('?')
            
            if is_question:
                # This is a question, add to current paragraph
                if current_paragraph:
                    current_paragraph.append(line)
            else:
                # This is a new paragraph
                if current_paragraph:
                    paragraphs.append('\n'.join(current_paragraph))
                current_paragraph = [line]
                current_number = num
        else:
            # Continue current paragraph
            if current_paragraph:
                current_paragraph.append(line)
            else:
                current_paragraph = [line]
    
    # Add the last paragraph
    if current_paragraph:
        paragraphs.append('\n'.join(current_paragraph))
    
    # If no numbered paragraphs found, fall back to double newline split
    if len(paragraphs) <= 1 and '\n\n' in text:
        paragraphs = re.split(r'\n\s*\n+', text.strip())
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
    
    return paragraphs if paragraphs else [text.strip()]


def count_words(text: str) -> int:
    """Count words in text"""
    words = re.findall(r'\b\w+\b', text)
    return len(words)


def calculate_reading_time(word_count: int) -> float:
    """Calculate reading time in seconds based on 180 words per minute"""
    return (word_count / WORDS_PER_MINUTE) * 60


def detect_questions(text: str, paragraph_number: int, is_final_question: bool = False) -> List[QuestionInfo]:
    """
    Detect questions in paragraph that start with the paragraph number followed by a period.
    Format: "6. ¿Cómo podría...?" or "6. ¿Cuál es...?"
    Ignores "¿QUÉ RESPONDERÍAS?"
    """
    questions = []
    
    # Questions to ignore (case-insensitive)
    IGNORED_PATTERNS = [
        "qué responderías",
        "que responderias",
        "qué responderías?",
        "que responderias?",
    ]
    
    def is_ignored_question(q_text: str) -> bool:
        """Check if question should be ignored"""
        q_lower = q_text.lower().strip()
        # Remove ¿ and ? for comparison
        q_clean = q_lower.replace('¿', '').replace('?', '').strip()
        for ignored in IGNORED_PATTERNS:
            ignored_clean = ignored.replace('¿', '').replace('?', '').strip()
            if ignored_clean in q_clean or q_clean in ignored_clean:
                return True
        return False
    
    # Split text into lines to find question lines
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Primary Pattern: "6. ¿pregunta?" - number followed by period and question
        # This is the main format: número + punto + pregunta
        pattern_with_period = rf'^{paragraph_number}\.\s*([¿].*\?|.*\?)$'
        
        # Secondary patterns for flexibility
        pattern_with_space = rf'^{paragraph_number}\s+([¿].*\?)$'
        pattern_with_other = rf'^{paragraph_number}[\)\-:\s]+([¿].*\?)$'
        
        match = re.match(pattern_with_period, line, re.IGNORECASE)
        if not match:
            match = re.match(pattern_with_space, line, re.IGNORECASE)
        if not match:
            match = re.match(pattern_with_other, line, re.IGNORECASE)
        
        if match:
            question_text = match.group(1).strip()
            # Skip ignored questions like "¿QUÉ RESPONDERÍAS?"
            if is_ignored_question(question_text):
                continue
            if len(question_text) > 5:
                questions.append(QuestionInfo(
                    text=question_text,
                    answer_time=QUESTION_ANSWER_TIME,
                    is_final_question=is_final_question
                ))
    
    return questions


def extract_final_questions(text: str) -> List[QuestionInfo]:
    """
    Extract questions that appear AFTER "¿QUÉ RESPONDERÍAS?" in the text.
    These are the final discussion questions.
    """
    final_questions = []
    
    # Find the position of "¿QUÉ RESPONDERÍAS?"
    text_lower = text.lower()
    marker_patterns = [
        "¿qué responderías?",
        "que responderias?",
        "¿qué responderías",
        "que responderias"
    ]
    
    marker_pos = -1
    for pattern in marker_patterns:
        pos = text_lower.find(pattern)
        if pos != -1:
            marker_pos = pos
            break
    
    if marker_pos == -1:
        return final_questions
    
    # Get text after the marker
    # Find the end of the "¿QUÉ RESPONDERÍAS?" line
    after_marker = text[marker_pos:]
    newline_pos = after_marker.find('\n')
    if newline_pos != -1:
        text_after = after_marker[newline_pos + 1:]
    else:
        text_after = ""
    
    if not text_after.strip():
        return final_questions
    
    # Find all questions in the text after the marker
    # Pattern: number followed by period and question
    lines = text_after.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Pattern: "número. ¿pregunta?" 
        match = re.match(r'^(\d+)\.\s*([¿].*\?)$', line, re.IGNORECASE)
        if match:
            question_text = match.group(2).strip()
            if len(question_text) > 5:
                final_questions.append(QuestionInfo(
                    text=question_text,
                    answer_time=QUESTION_ANSWER_TIME,
                    is_final_question=True
                ))
    
    return final_questions


def analyze_pdf_content(text: str, filename: str) -> PDFAnalysisResult:
    """Analyze PDF content and return structured analysis"""
    paragraphs = split_into_paragraphs(text)
    
    # Extract final questions (those after "¿QUÉ RESPONDERÍAS?")
    final_questions = extract_final_questions(text)
    
    # Check if text contains "¿QUÉ RESPONDERÍAS?" 
    text_lower = text.lower()
    has_que_responderias = "qué responderías" in text_lower or "que responderias" in text_lower
    
    # Find the paragraph that contains "¿QUÉ RESPONDERÍAS?"
    que_responderias_paragraph = -1
    if has_que_responderias:
        for idx, para in enumerate(paragraphs):
            para_lower = para.lower()
            if "qué responderías" in para_lower or "que responderias" in para_lower:
                que_responderias_paragraph = idx
                break
    
    analyzed_paragraphs = []
    total_words = 0
    total_questions = 0
    total_reading_time = 0.0
    total_question_time = 0.0
    cumulative_time = 0.0
    final_questions_start_time = 0.0
    
    for i, para_text in enumerate(paragraphs, 1):
        # Skip paragraphs that are after "¿QUÉ RESPONDERÍAS?" (final questions section)
        if que_responderias_paragraph >= 0 and (i - 1) > que_responderias_paragraph:
            continue
            
        word_count = count_words(para_text)
        reading_time = calculate_reading_time(word_count)
        
        # Detect questions for this paragraph
        questions = detect_questions(para_text, i, False)
        question_time = len(questions) * QUESTION_ANSWER_TIME
        
        total_words += word_count
        total_questions += len(questions)
        total_reading_time += reading_time
        total_question_time += question_time
        
        # Calculate cumulative time
        cumulative_time += reading_time + question_time
        
        analyzed_paragraphs.append(ParagraphAnalysis(
            number=i,
            text=para_text[:500] + ("..." if len(para_text) > 500 else ""),
            word_count=word_count,
            reading_time_seconds=round(reading_time, 2),
            questions=questions,
            total_time_seconds=round(reading_time + question_time, 2),
            cumulative_time_seconds=round(cumulative_time, 2)
        ))
    
    # Calculate when final questions start (after all paragraphs)
    final_questions_start_time = cumulative_time
    
    # Add final questions time to totals
    final_questions_time = len(final_questions) * QUESTION_ANSWER_TIME
    total_questions += len(final_questions)
    total_question_time += final_questions_time
    
    # Total time is ALWAYS 60 minutes (3600 seconds)
    FIXED_TOTAL_TIME = 3600  # 60 minutes in seconds
    
    return PDFAnalysisResult(
        filename=filename,
        total_words=total_words,
        total_paragraphs=len(analyzed_paragraphs),
        total_questions=total_questions,
        total_reading_time_seconds=round(total_reading_time, 2),
        total_question_time_seconds=round(total_question_time, 2),
        total_time_seconds=FIXED_TOTAL_TIME,
        fixed_duration=True,
        final_questions_start_time=round(final_questions_start_time, 2),
        final_questions=final_questions,
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


@app.on_event("startup")
async def startup_db_client():
    """Create database indexes on startup"""
    await db.pdf_analyses.create_index([("timestamp", -1)])
    await db.status_checks.create_index([("timestamp", -1)])
    logger.info("Database indexes created successfully")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
