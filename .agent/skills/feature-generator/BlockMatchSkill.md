---
name: Block matching strategy
description: A skill to compare rows in two datasets and return a list of matched pairs including blocking, scoring, and context boosting.
---

# Block matching strategy Skill

## Purpose
This skill implements a multi-phase record linkage system to match records between two datasets (e.g., 1870 and 1880 Census) or find duplicates within a single dataset.

## Phase 1: Blocking (Candidate Generation)
Create blocking keys to reduce the comparison space. A pair is a candidate if it shares at least one blocking key.

**Block 1: Phonetic & Demographic**
- Keys: `nysiis_last_name` + `norm_first_name` + `gender` + `race`
- Purpose: Catches straightforward matches with spelling variations.

**Block 2: First Name & Age**
- Keys: `norm_first_name` + `birth_year` (or `birth_year_10`) + `gender` + `race`
- Purpose: Catches people whose last name changed (marriage, adoption, errors).

**Block 3: Last Name & Birth Place**
- Keys: `last_name` + `gender` + `race` + `birth_place` (first 2 chars)
- Purpose: Catches first name variations with distinctive birthplaces.

## Phase 2: Scoring (Match Quality)
Calculate a weighted score for each candidate pair.

### Base Matches
1. **Name Match (Max one applied):**
   - **+100 points**: Identical `full_name`.
   - **+80 points**: Identical `last_name` AND Identical `first_name`.
   - **+70 points**: Identical `last_name` AND Identical `norm_first_name`.
   - **+60 points**: Identical `last_name` AND `first_name` Jaro-Winkler score > 0.85.

2. **Birth Year Match (Max one applied):**
   - **+50 points**: Identical `birth_year`.
   - **+30 points**: Difference ≤ 2 years.
   - **+5 points**: Difference ≤ 5 years.
   - **-200 points**: Difference ≥ 10 years.

3. **Demographics:**
   - **+10 points**: Identical `race`.
   - **+10 points**: Both races are Non-White (and not identical 'W').
   - **+10 points**: Identical `norm_occupation`.

### Penalties (Red Flags)
- **-500 points**: Gender mismatch.
- **-100 points**: Age regression > 10 years (Target year is earlier than Source year by > 10 years) [Match Mode Only].
- **-50 points**: Contradictory `birth_place` (Both present, not 'VA', and different).

## Phase 3: Classification (Tiers)
Classify matches based on score and mode.

### Match Mode (1870 to 1880)
- **Tier 1**: Score > 90
- **Tier 2**: Score 80 - 90
- **Tier 3**: Score 60 - 79

### Deduplication Mode (Find Duplicates)
- **Tier 1**: Score > 150
- **Tier 2**: Score 140 - 150
- **Tier 3**: Score 130 - 140

Matches below the lowest threshold are discarded.

## Phase 4: Conflict Resolution
Handle one-to-many scenarios to ensure unique assignments.
1. Sort all candidates by Score (Descending).
2. Iterate through candidates:
   - If Record A and Record B are both available, accept match.
   - Mark Record A and Record B as "used".
   - If either is already used, skip (Priority is given to higher scores).

## Phase 5: Household Context Boosting (Optional)
Use high-confidence (Tier 1) matches as "anchors" to validate other household members.

1. **Identify Anchors**: Use Tier 1 matches from Phase 4.
2. **Scan Households**: Look at all members in Anchor A's household and Anchor B's household.
3. **Score Members**: Compare unmatched members using standard scoring.
4. **Apply Bonuses** (if Base Score > 20):
   - **+20 points**: Head of Household match (Name Jaro-Winkler > 0.9).
   - **+10 points**: Spouse match (Opposite gender).
   - **+10 points**: Child match (Target relation is Child, Age > 10).
   - **+10 points**: Parent match (Target relation is Parent).
   - **+5 points**: Co-residence bonus (Generic bonus for being in matched house).

If the boosted score moves the match into a valid Tier, it is added to the results.
