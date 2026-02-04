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

**Block 3:** last_name + gender + race + birth_place
- Catches first name variations (nicknames) with distinctive birthplaces

### PHASE 2: SCORING (Calculate Match Quality)
For each candidate pair, calculate a weighted score:

**Name match** 
	If full_name is identical in both datasets then add 100 points
	else if last_name is identical in both datasets and first_name is identical in both datasets {
		If there is no middle_name in both datasets then add 100 points
		else then add 80 points
		}
	else if last_name is identical in both datasets and norm_name is identical in both datasets then add 70 points
	else if last_name is identical in both datasets then add 50 points
	else if nysiis_last_name is Identical in both datasets and norm_first_name is identical in both datasets then add 50 points

**Birth Year Matches:**
- if birth_year is identical in both datasets then add 50 points
- else if birth_year +/-2 match in both datasets then add 33 points
- else if birth_year +/-5 match in both datasets then add 20 points
if the difference between birth_year in both datasets is greater than 20 years then subtract 100 points

**Occupation Matches:**
- if norm_occupation match in both datasets then add 10 points

**Race Match:**
- if race is identical in both datasets then add 10 points
- else if race is B or M in both datasets then add 10 points

**Occupation Match:**
- if norm_occupation match in both datasets then add 10 points

**Penalties (Red Flags):**
- gender mismatch: -500 points
- age regression (1880 birth_year < 1870 birth_year): -200 points
- contradictory birth_place: -50 points

### PHASE 4: CONFLICT RESOLUTION
Handle one-to-many scenarios:
- If multiple 1880 records match same 1870 record: keep highest score, flag others
- If multiple 1870 records match same 1880 record: keep highest score, flag others
- One person can match at most ONE person in the other census

### PHASE 5: HOUSEHOLD CONTEXT BOOSTING
Use high-confidence (Tier 1) matches as "anchors" to help match their household members:

1. For each Tier 1 match, identify their household in both censuses:
   - 1870: all records with same dwelling number
   - 1880: all records with same family number

2. For unmatched members of these households, add bonus points:
   - Head of household name match: +20 points
   - Spouse match (opposite gender, similar age): +20 points
   - Child match (using 1880 relation field): +10 points per child
   - Parent match: +15 points
   - Co-residence bonus: +15 points

3. Use 1880 relation field to validate family structure:
   - "Self" = head of household
   - "Wife" = spouse
   - "Son"/"Daughter" = children
   - Other relations: Brother, Sister, Father, Mother, Uncle, Aunt, Nephew, Niece, etc.


<!--
**Fuzzy Matches:**
- last_name Jaro-Winkler ≥0.85: +8 points
- first_name Jaro-Winkler ≥0.85: +8 points
-->


