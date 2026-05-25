#main.py

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Orchard GNN API running"}

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()

    df = pd.read_csv(io.BytesIO(contents))

    # Rename columns to clean names
    df.columns = [
        "no",
        "tree_no",
        "latitude",
        "longitude",
        "image",
        "mango_id",
        "damage_severity",
        "damage_cause",
    ]

    return {
        "message": "CSV uploaded successfully",
        "rows": len(df),
        "columns": list(df.columns),
        "preview": df.head().to_dict(orient="records"),
    }