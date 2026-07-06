import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# -----------------------------
# Device
# -----------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using Device: {device}")

# -----------------------------
# Load Tokenizer
# -----------------------------
tokenizer = AutoTokenizer.from_pretrained("./bert_sentiment_model")
assert tokenizer is not None

# -----------------------------
# Load Model
# -----------------------------
model = AutoModelForSequenceClassification.from_pretrained(
    "./bert_sentiment_model"
)

model.to(device)
model.eval()

print("Model Loaded Successfully!\n")

# -----------------------------
# Prediction Function
# -----------------------------
def predict_sentiment(text):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=256
    )

    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)

    probabilities = torch.softmax(outputs.logits, dim=1)

    confidence, prediction = torch.max(probabilities, dim=1)

    sentiment = "Positive 😊" if prediction.item() == 1 else "Negative 😞"

    return sentiment, confidence.item() * 100


# -----------------------------
# Main Loop
# -----------------------------
while True:

    review = input("\nEnter Review (type 'exit' to quit):\n\n")

    if review.lower() == "exit":
        print("\nGoodbye!")
        break

    sentiment, confidence = predict_sentiment(review)

    print("\n-----------------------------")
    print("Prediction :", sentiment)
    print(f"Confidence : {confidence:.2f}%")
    print("-----------------------------")