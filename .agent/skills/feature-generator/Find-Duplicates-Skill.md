---
name: Find duplicate rows
description: A skill to find duplicate rows in a dataset.
---

# Find duplicate rows Skill

## Purpose
This skill Looks art records in a dataset and returns a list of duplicate rows.

## Input
- dataset - The dataset to search for duplicate rows, specified in prompt.md

## Method

**Name match** 
	- If full_name is identical in both datasets then +100 points
	else if last_name is identical in both datasets and first_name is identical in both datasets {
		If there is no middle_name in both datasets then +80 points
		else then +80 points
		}
	else if last_name is identical in both datasets and norm_name is identical in both datasets then +70 points
	else if last_name is identical AND first_name Jaro-Winkler > 0.8 then +60 points
	else if last_name is Identical in both datasets and the first initial of first_name is identical in both datasets then +40 points

**Birth Year Matches:**
	- if birth_year is identical in both datasets then +50 points
	- else if birth_year are more than 5 in both datasets then -500nts

**Occupation Matches:**
	- if norm_occupation match in both datasets then +10 points

**Race Match:**
	- if race is identical in both datasets then +10 points
	- else if race is W both datasets then +10 points
	- else if race does not equal W in both datasets then +10 points
	
**Occupation Match:**
	- if norm_occupation match in both datasets then +10 points

## Output
- A list of duplicate rows, shown in Census Context Panel.
- Show only one match for each duplicate row. Remove from list the second match.
		