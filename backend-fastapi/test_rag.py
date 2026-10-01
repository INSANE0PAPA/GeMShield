from rag_engine import retrieve_rules, rag_compliance_check
import sys

tests = [
    {
        "question": "What is the required bid validity?",
        "expected_source": "Clause 1.16.1 (Minimum 180 days)"
    },
    {
        "question": "What happens if EMD/Bid Security is missing?",
        "expected_source": "Clause 1.15.2 / 1.15.7"
    },
    {
        "question": "What is the delivery period?",
        "expected_source": "Chapter 3 / Schedule of Requirements (Within 06 months from award/PO)"
    },
    {
        "question": "What is the warranty period?",
        "expected_source": "Chapter 4, Clause 4.5 (3 years comprehensive onsite warranty)"
    },
    {
        "question": "Is Pre Dispatch Inspection applicable?",
        "expected_source": "Chapter 4, Clause 4.7 (Pre Dispatch Inspection = Not applicable)"
    },
    {
        "question": "What AMC is required?",
        "expected_source": "Chapter 4, Clause 4.8 (2-year non-comprehensive AMC after 3-year warranty)"
    },
    {
        "question": "What are the technical qualification requirements?",
        "expected_source": "Chapter 5, Clause 5.2"
    },
    {
        "question": "What manufacturer authorization is required?",
        "expected_source": "Chapter 5 / Form 02"
    },
    {
        "question": "What does the Deviation Statement require?",
        "expected_source": "Form 06"
    },
    {
        "question": "What does the final Checklist require?",
        "expected_source": "Form 18, page 73"
    }
]

print("=== RAG Retrieval & Evidence Verification ===")
for i, t in enumerate(tests):
    print(f"\nTEST {i+1}")
    print(f"QUESTION: {t['question']}")
    print(f"EXPECTED: {t['expected_source']}")
    
    results = retrieve_rules(t['question'], top_k=3)
    if not results:
        print("-> Retrieval failure: No evidence retrieved.")
    else:
        best_chunk = results[0]
        print(f"TOP RETRIEVED CHUNK DISTANCE: {best_chunk['distance']:.3f}")
        print(f"DOCUMENT NAME: {best_chunk.get('document_name', 'N/A')}")
        print(f"PAGE NUMBER (PDF Index): {best_chunk.get('page_number', 'N/A')}")
        print(f"CLAUSE / FORM: {best_chunk.get('clause_section', 'N/A')}")
        
        snippet = best_chunk['content'][:200].replace('\n', ' ')
        print(f"CONTENT EXCERPT: {snippet}...")
