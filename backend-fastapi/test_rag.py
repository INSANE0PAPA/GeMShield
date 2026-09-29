from rag_engine import find_relevant_rules
query = "Vendor has not provided GSTIN"
print(f"Query: {query}\n")
results = find_relevant_rules(query)
for i, match in enumerate(results, 1):
    print(f"  {i}. [dist={match['distance']:.4f}] {match['content']}")
