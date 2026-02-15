import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import TEMP_DIR
from routes import analyze, health, social

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Mind Bloom Truth Seeker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(health.router)
app.include_router(social.router)


@app.on_event("startup")
def startup():
    os.makedirs(TEMP_DIR, exist_ok=True)


@app.get("/")
def root():
    return {"message": "Welcome to Mind Bloom Truth Seeker API", "docs": "/docs"}
