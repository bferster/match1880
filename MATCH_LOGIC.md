# Match Logic Documentation (`match.js`)

This document outlines the logic and scoring algorithms implemented in `match.js`. The file exports three main functions used for record linkage between the 1870 and 1880 census datasets (or deduplication within a dataset).

## 1. String Distance: `jaroWinkler(s1, s2)`

Calculates the Jaro-Winkler string distance between two strings.

- **Input**: Two strings (`s1`, `s2`).
- **Output**: A floating-point number between `0` (no match) and `1` (exact match).
- **Normalization**: content is trimmed and converted to lowercase.
- **Algorithm**:
  1. Calculates Jaro distance based on matching characters within a sliding window and transpositions.
  2. applies the Winkler boost for strings that share a common prefix (up to 4 characters), scaling the score for matches above `0.7`.

## 2. Blocking Strategy: `getBlockKeys(record)`

Generates high-level blocking keys to group potential matches before detailed scoring. This minimizes the number of comparisons.

- **Input**: A census record object.
- **Output**: An array of string keys.
- **Blocks Defined**:
  1. **Block 1**: `B1:{NYSIIS_Last}|{Norm_First}|{Gender}|{Race}`
  2. **Block 2**: `B2:{Norm_First}|{Birth_Year}|{Gender}|{Race}`
  3. **Block 3**: `B3:{Last_Name}|{Gender}|{Race}|{Birth_Place}`
- **Notes**:
  - `NYSIIS` is a phonetic algorithm for last names.
  - Returns keys only if required fields for that specific block are present.
  - `Birth_Place` uses the first 2 characters (State abbreviation).

## 3. Scoring Engine: `calculateScore(r1870, r1880, mode)`

Evaluates a pair of records and assigns a similarity score based on various attributes.

- **Modes**:
  - `'match'`: For linking 1870 records to 1880 records (Default).
  - `'find-duplicates'`: For finding duplicates within the 1870 dataset.

#### Input Schema (`r1870`, `r1880`)

The function normalizes specific fields from the input records into an internal comparison object (`s`).

| Field | 1870 Source | 1880 Source (Detail) | Notes |
| :--- | :--- | :--- | :--- |
| **Last Name** | `last_name` | `last_name` / `last-_name` | 1880 fallback for typos |
| **First Name** | `first_name` | `first_name` | |
| **Middle** | `middle_name` | `middle_name` | |
| **Age** | `age` | `age` | Parsed to Integer |
| **Birth Year** | `birth_year` | `birth_year` | Parsed to Integer |
| **Gender** | `gender` | `gender` | |
| **Race** | `race` | `race` | |
| **Birth Place** | `birth_place` | `birth_place` | |
| **NYSIIS Last** | `nysiis_last_name` | `nysiis_last_name` | Phonetic Key |
| **NYSIIS First**| `nysiis_first_name` | `nysiis_first_name` | Falls back to `norm_first_name` |
| **Norm Occ** | `norm_occupation` | `norm_occupation` | Normalized text |

#### Return Value
Returns an object: `{ score: Integer, details: String }`
- **score**: Cumulative score based on matches/mismatches.
- **details**: Comma-separated string of applied rules (e.g., "Gender mismatch, Exact birth year").

### Match Mode Logic (`mode === 'match'`)

This mode applies specific penalties and bonuses tailored for 10-year longitudinal linking.

#### Penalties
| Condition | Penalty | Reason |
| :--- | :--- | :--- |
| **Gender Mismatch** | `-500` | Critical mismatch |
| **Age Regression > 10** | `-100` | Birth year in 1880 is >10 years earlier than in 1870 |
| **Age Regression > 5** | `-20` | Birth year in 1880 is 6-10 years earlier than in 1870 |
| **Contradictory Birth Place**| `-50` | Different states (ignoring 'VA' as default/common) |
| **NYSIIS Last Mismatch** | `-100` | Phonetic last names do not match |
| **NYSIIS First Mismatch** | `-40` | Phonetic first names do not match |

#### Bonuses

**Birth Year:**
- **Exact Match**: `+50`
- **Difference ≤ 2 years**: `+30`
- **Difference ≤ 5 years**: `+5`

**Name Matching (Highest Priority Applied):**
1. **Full Name Identical**: `+100`
2. **Exact First & Last**: `+80`
3. **Exact Last + Norm First**: `+70`
4. **Exact Last + Fuzzy First (>0.8)**: `+60`
5. **Exact Last + First Initial**: `+40`
6. **NYSIIS Last + Norm First**: `+50`

**Other Bonuses:**
- **Fuzzy First Bonus**: `+20` if Jaro-Winkler > 0.85 (Additive)
- **Race Match**: `+10` (Exact match or both Non-White)
- **Occupation Match**: `+10` (Normalized occupation matches)

---

### Find Duplicates Mode Logic (`mode !== 'match'`)

Optimized for identifying duplicate entries within the same year (1870).

**Name Matching:**
- **Full Name Identical**: `+100`
- **Exact First & Last**: `+80`
- **Exact Last + Norm First**: `+70`
- **Exact Last + Fuzzy First (>0.8)**: `+60`
- **Exact Last + First Initial**: `+40`

**Birth Year:**
- **Exact Match**: `+50`
- **Difference > 5 years**: `-500` (Strong penalty for duplicates)

**Other:**
- **Race Match**: `+10`
- **Occupation Match**: `+10`
