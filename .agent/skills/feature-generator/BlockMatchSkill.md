---
name: ABE matching strategy
description: A skill to compare rows in two datasets and return a list of matched pairs.
---

The Uniqueness Test (The "Guardrail")
A match is only valid if the person is "unique" in their own time.
• In 1870: Look at a person (e.g., John Smith, born 1845). Check if there is anyone else in the 1870 file with the same nysiis_first, nysiis_last, and birth_place who was born within +/- 2 years of 1845.
• Action: If you find another "John Smith" from the same place born in 1846, you must discard this record from your matching pool. If you can't distinguish them in 1870, you won't be able to accurately link them to 1880.
2. The Matching Iterations
For every unique person in your 1870 file, search the 1880 file using this hierarchy:
• Iteration A (Exact): Search for a unique person in 1880 with the same nysiis_first, nysiis_last, gender, birth_place, and exact birth_year.
• Iteration B (+/- 1 Year): If no match is found, search 1880 for a unique person within 1 year of the birth year.
• Iteration C (+/- 2 Years): If still no match, search within 2 years.
• Rule of Multiples: If at any step you find two potential matches in 1880 (e.g., two John Smiths born in the same window), discard the link.
3. Bi-directional Verification (The "Double Check")
To achieve the high accuracy described in the paper:
1. Run the match from 1870 (Linkage Set 1).
2. Run the match from 1880 (Linkage Set 2).
3. Final Sample: Keep only the individuals who are in both sets. If 1870-Person-A points to 1880-Person-B, but 1880-Person-B points to 1870-Person-C, the link is considered unreliable and is discarded.
4. Special Considerations for your Dataset
• Tip: Be careful with the race filter. An enumerator might label someone "B" (Black) in 1870 and "M" (Mulatto) in 1880. It is often safer to allow "B" and "M" to match each other while keeping "W" (White) separate.
