# Match Logic Documentation (`match.js`)

This document outlines the logic and scoring algorithms implemented in `match.js`.

## 1. String Distance: `jaroWinkler(s1, s2)`
Calculates the Jaro-Winkler string distance between two strings with a prefix boost for distinctiveness.

## 2. Blocking Strategy: `getBlockKeys(record)`
Generates blocking keys to reduce the comparison space.
- **Block 1**: `nysiis_last|norm_first|gender|race`
- **Block 2**: `norm_first|birth_year|gender|race` (Handles last name changes)
- **Block 3**: `last_name|gender|race|birth_place` (Handles first name variations)

## 3. Scoring Engine: `calculateScore(set1, set2, mode)`

### Match Mode (`mode='match'`)

**Penalties:**
- **Gender Mismatch**: -500
- **Age Regression (>10 years)**: -100
- **Contradictory Birth Place**: -50
- **Birth Year Diff ≥ 10**: -200

**Bonuses:**
- **Exact Full Name**: +100
- **Exact First & Last**: +80
- **Exact Last + Norm First**: +70
- **Exact Last + Fuzzy First (>0.85)**: +60
- **Exact Birth Year**: +50
- **Birth Year ±2**: +30
- **Birth Year ±5**: +5
- **Race Match (or both Non-White)**: +10
- **Occupation Match**: +10

### Deduplication Mode (`mode='dedup'`)
Logic is shared but typically runs with higher tier thresholds in `app.js`:
- Tier 1: > 150
- Tier 2: 140-149
- Tier 3: 130-139

(Note: Self-matches and reverse-duplicates are filtered in `app.js` loop).
