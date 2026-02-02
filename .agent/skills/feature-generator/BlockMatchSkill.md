---
name: Block matching strategy
description: A skill to compare rows in two datasets and return a list of matched pairs.
---

# Block matching strategy Skill

## Purpose
This skill implements a multi-phase record linkage system:

### PHASE 1: BLOCKING (Generate Candidate Pairs)
Create three blocking strategies to reduce comparison space:

**Block 1:** nysiis_last_name + norm_first_name + gender + race
- Catches straightforward matches with spelling variations

**Block 2:** norm_first_name + birth_date_10 + gender + race  
- Catches people whose last name changed (marriage, adoption, transcription errors)

**Block 3:** last_name+ gender + race + birth_place
- Catches first name variations (nicknames) with distinctive birthplaces

### PHASE 2: SCORING (Calculate Match Quality)
For each candidate pair, calculate a weighted score:

**High-Value Exact Matches:**
- last_name exact: +15 points
- first_name exact: +15 points
- middle_name exact: +8 points
- birth_year exact: +10 points
- age difference 9-11 years: +10 points
- age difference 8-12 years: +6 points
- gender exact: +10 points
- race exact: +8 points
- birth_place exact: +12 points

**Finding Aid Matches:**
- nysiis_last_name match: +10 points
- nysiis_first_name match: +10 points
- norm_first_name match: +8 points
- birth_date_10 match: +7 points
- norm_occupation match: +5 points

**Fuzzy Matches:**
- last_name Jaro-Winkler ≥0.85: +8 points
- first_name Jaro-Winkler ≥0.85: +8 points
- birth_year within ±2 years: +7 points
- birth_year within ±5 years: +4 points
- race B/M equivalence: +6 points

**Penalties (Red Flags):**
- gender mismatch: -50 points
- age regression (1880 birth_year < 1870 birth_year): -30 points
- contradictory birth_place: -15 points

### PHASE 4: HOUSEHOLD CONTEXT BOOSTING
Use high-confidence (Tier 1) matches as "anchors" to help match their household members:

1. For each Tier 1 match, identify their household in both censuses:
   - 1870: all records with same dwelling number
   - 1880: all records with same family number

2. For unmatched members of these households, add bonus points:
   - Head of household name match: +20 points
   - Spouse match (opposite gender, similar age): +20 points
   - Child match (using 1880 relation field): +8 points per child
   - Parent match: +15 points
   - Co-residence bonus: +15 points

3. Use 1880 relation field to validate family structure:
   - "Self" = head of household
   - "Wife" = spouse
   - "Son"/"Daughter" = children
   - Other relations: Brother, Sister, Father, Mother, Uncle, Aunt, Nephew, Niece, etc.

### PHASE 5: CONFLICT RESOLUTION
Handle one-to-many scenarios:
- If multiple 1880 records match same 1870 record: keep highest score, flag others
- If multiple 1870 records match same 1880 record: keep highest score, flag others
- One person can match at most ONE person in the other census




