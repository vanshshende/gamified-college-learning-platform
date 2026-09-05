from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal
import os

from quiz_generator import generate_quiz

app = FastAPI(title="Gamified Learning Platform - AI Quiz Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("BACKEND_URL", "http://localhost:5000")],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateQuizRequest(BaseModel):
    topic_or_text: str = Field(..., min_length=10, description="Course notes/text to generate questions from")
    num_questions: int = Field(5, ge=1, le=20)
    difficulty: Literal["easy", "medium", "hard", "auto"] = "medium"


class Question(BaseModel):
    questionText: str
    options: List[str]
    correctIndex: int
    difficulty: str


class GenerateQuizResponse(BaseModel):
    questions: List[Question]
    mode: str


@app.get("/")
def health():
    return {"status": "AI quiz service running", "gemini_configured": bool(os.environ.get("GEMINI_API_KEY"))}


@app.post("/generate-quiz", response_model=GenerateQuizResponse)
def generate_quiz_endpoint(req: GenerateQuizRequest):
    try:
        questions = generate_quiz(req.topic_or_text, req.num_questions, req.difficulty)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {e}")

    mode = "gemini" if os.environ.get("GEMINI_API_KEY") else "rule-based"
    return {"questions": questions, "mode": mode}
