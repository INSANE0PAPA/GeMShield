from sentence_transformers import SentenceTransformer
from db import engine
from models import Base, RulebookChunk
from sqlalchemy.orm import Session

RULES = [
    # --- Critical rules ---
    "Every bid must mention a valid GSTIN number.",
    "A valid PAN (Permanent Account Number) must be included in the bid document.",
    "Bid validity period must be at least 90 days.",
    "Earnest Money Deposit (EMD) or Bid Security must be mentioned and enclosed.",
    "The document must be signed by an Authorised Signatory with name and designation.",
    # --- Warning-level rules ---
    "Annual turnover of the bidder must be at least ₹5,00,000 and supported by documents.",
    "Delivery period or dispatch timeline must be clearly stated in the bid.",
    "Warranty or guarantee period and terms must be specified.",
    "OEM Authorisation Certificate is required if the bidder is a reseller.",
    "Technical specifications must match the GeM catalogue listing exactly.",
    "Relevant compliance certificates (ISO, BIS, CE, test reports) must be attached.",
    # --- Informational rules ---
    "Udyam or MSME registration number should be included if the bidder is an MSME.",
    "Make in India declaration with local content percentage should be provided if applicable.",
    "Payment terms (e.g. payment within 30 days of delivery) must be clearly defined.",
    "Evidence of past performance such as prior purchase orders or client references should be included.",
    # --- Additional contextual rules ---
    "All prices quoted must be inclusive of GST unless stated otherwise.",
    "The seller must be registered on the GeM portal before placing a bid.",
    "Product specifications must match the catalog listing exactly.",
    "Return and replacement policy must comply with GeM marketplace guidelines.",
    "Minimum order quantity restrictions must be clearly stated in the listing.",
]

print("Loading SentenceTransformer model (all-MiniLM-L6-v2) …")
model = SentenceTransformer("all-MiniLM-L6-v2")

print(f"Encoding {len(RULES)} rules …")
embeddings = model.encode(RULES)

Base.metadata.create_all(bind=engine)

with Session(engine) as session:
    # Clear old chunks so re-running doesn't duplicate
    deleted = session.query(RulebookChunk).delete()
    if deleted:
        print(f"Cleared {deleted} old rule chunks.")

    for text, vec in zip(RULES, embeddings):
        chunk = RulebookChunk(content=text, embedding=vec.tolist())
        session.add(chunk)
    session.commit()
    print(f"Inserted {len(RULES)} rule chunks into 'rulebook_chunks'.")
