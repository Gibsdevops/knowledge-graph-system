from fastapi import APIRouter, UploadFile, File
import pandas as pd
import io
from services.gnn_service import predict_dataframe
from services.neo4j_service import save_predictions_to_neo4j
from services.explanation_service import get_tree_explanation

router = APIRouter(prefix="/api", tags=["Upload"])

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))

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

    result_df = predict_dataframe(df)

    save_predictions_to_neo4j(result_df)

    return {
        "message": "Prediction completed and saved to Neo4j",
        "rows": len(result_df),
        "predictions": result_df.to_dict(orient="records"),
    }
    
    
@router.get("/tree/{tree_id}/explanation")
async def tree_explanation(tree_id: str):
    result = get_tree_explanation(tree_id)

    if not result:
        return {"message": "Tree not found"}

    return result