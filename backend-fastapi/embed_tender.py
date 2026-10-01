import os
from sentence_transformers import SentenceTransformer
from db import engine
from models import Base, RulebookChunk
from sqlalchemy.orm import Session
from document_processor import extract

# PDF Path
pdf_path = "../GTERE310_compressed.pdf"
document_name = "GTERE310_compressed.pdf"
tender_id = "CSIR-NML-GTERE310"

print(f"Extracting text from {pdf_path}...")
result = extract(pdf_path)

chunks = []
# Basic chunking by page or splitting long pages
for p in result["pages"]:
    page_num = p["page"]
    text = p["text"]
    
    # We could split by double newlines to make chunks more granular
    paragraphs = text.split("\n\n")
    for para in paragraphs:
        para = para.strip()
        if len(para) > 50: # ignore very short uninformative lines
            chunks.append({
                "content": para,
                "document_name": document_name,
                "page_number": page_num,
                "tender_id": tender_id
            })

print(f"Total chunks to embed: {len(chunks)}")

print("Loading SentenceTransformer model (all-MiniLM-L6-v2) ...")
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Encoding chunks...")
texts = [c["content"] for c in chunks]
embeddings = model.encode(texts)

print("Inserting chunks into database...")
with Session(engine) as session:
    # Clear old chunks if any (though we just recreated the table)
    # deleted = session.query(RulebookChunk).delete()
    # print(f"Cleared {deleted} old rule chunks.")
    
    for c, vec in zip(chunks, embeddings):
        chunk = RulebookChunk(
            content=c["content"],
            embedding=vec.tolist(),
            document_name=c["document_name"],
            page_number=c["page_number"],
            tender_id=c["tender_id"]
        )
        session.add(chunk)
    session.commit()
    print(f"Inserted {len(chunks)} chunk records into 'rulebook_chunks'.")
