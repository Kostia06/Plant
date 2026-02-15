from enum import Enum
from typing import Optional

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    url: str
    user_id: Optional[str] = None


class JobStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"


class Claim(BaseModel):
    claim: str = ""
    type: str = "spoken"
    timestamp: Optional[str] = None
    verdict: str = "unverified"
    confidence: float = 0.0
    explanation: str = ""
    evidence_for: list[str] = []
    evidence_against: list[str] = []
    sources: list[str] = []


class MisleadingVisual(BaseModel):
    timestamp: str = ""
    description: str = ""


class BiasAnalysis(BaseModel):
    overall_bias: str = "none"
    manipulation_tactics: list[str] = []
    misleading_visuals: list[MisleadingVisual] = []


class Perspectives(BaseModel):
    left: str = ""
    center: str = ""
    right: str = ""


class AnalysisResult(BaseModel):
    title: str = ""
    platform: str = ""
    duration_seconds: Optional[int] = None
    summary: str = ""
    transcript: str = ""
    claims: list[Claim] = []
    perspectives: Perspectives = Perspectives()
    bias_analysis: BiasAnalysis = BiasAnalysis()
    points_awarded: int = 5


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus


class StatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    results: Optional[AnalysisResult] = None
    error: Optional[str] = None
