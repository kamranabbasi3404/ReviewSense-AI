import os
import re
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Determine paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_DIR = os.path.join(BASE_DIR, "bert_sentiment_model")

# Device configuration
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

tokenizer = None
model = None

def init_model():
    global tokenizer, model
    if tokenizer is None or model is None:
        if not os.path.exists(MODEL_DIR):
            raise FileNotFoundError(f"BERT model files not found at: {MODEL_DIR}")
        
        print(f"Loading BERT Sentiment Model onto {device} from {MODEL_DIR}...")
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
        model.to(device)
        model.eval()
        print("BERT Sentiment Model Loaded Successfully!")

def clean_text(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""
    # Remove HTML tags
    text = re.sub(r"<[^>]*>", " ", text)
    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    # Remove extra whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text

def predict_sentiment_batch(texts: list[str]) -> list[dict]:
    """
    Run batch inference on a list of reviews.
    Returns a list of dicts with 'prediction' and 'confidence'.
    """
    init_model()
    
    cleaned_texts = [clean_text(t) for t in texts]
    # Filter empty texts but keep track of indices or map back
    # To keep simple, we process even if empty, returning neutral or fallback
    
    results = []
    
    # Process in batches of 32/64 to avoid OOM
    batch_size = 64
    for i in range(0, len(cleaned_texts), batch_size):
        batch = cleaned_texts[i:i + batch_size]
        
        # Handle case where all batch texts might be empty
        batch_inputs = [b if b else "Neutral review" for b in batch]
        
        inputs = tokenizer(
            batch_inputs,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256
        )
        
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
            
        probabilities = torch.softmax(outputs.logits, dim=1)
        confidences, predictions = torch.max(probabilities, dim=1)
        
        for idx in range(len(batch)):
            pred_idx = predictions[idx].item()
            conf_val = confidences[idx].item() * 100
            sentiment = "Positive" if pred_idx == 1 else "Negative"
            results.append({
                "prediction": sentiment,
                "confidence": round(conf_val, 2)
            })
            
    return results
