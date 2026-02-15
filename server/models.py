from pydantic import BaseModel, HttpUrl


class AnalyzeRequest(BaseModel):
    url: HttpUrl


class AnalyzeResponse(BaseModel):
    job_id: str
    status: str


class MisleadingVisual(BaseModel):
    timestamp: str = ""
    description: str = ""


class Claim(BaseModel):
    claim: str = ""
    type: str = "spoken"
    timestamp: str = ""
    verdict: str = "unverified"
    confidence: float = 0.0
    explanation: str = ""
    evidence_for: list[str] = []
    evidence_against: list[str] = []
    sources: list[str] = []


class Perspectives(BaseModel):
    left: str = ""
    center: str = ""
    right: str = ""


class BiasAnalysis(BaseModel):
    overall_bias: str = "center"
    manipulation_tactics: list[str] = []
    misleading_visuals: list[MisleadingVisual] = []


class VideoAnalysis(BaseModel):
    title: str = ""
    platform: str = ""
    duration_seconds: float = 0
    summary: str = ""
    transcript: str = ""
    claims: list[Claim] = []
    perspectives: Perspectives = Perspectives()
    bias_analysis: BiasAnalysis = BiasAnalysis()


class JobStatusResponse(BaseModel):
    status: str
    results: VideoAnalysis | None = None
    error: str | None = None


class HealthResponse(BaseModel):
    status: str = "ok"
