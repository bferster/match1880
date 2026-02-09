I am a genealogist and historian. 
I am trying to match people from the 1870 US census to the 1880 US census. 

THE DATASETS:

I have transcribed data in two files:

From named ALB_CN_1870.csv from the 1870 US census {

This file is a transcription of the US census for 1870 for Albemarle County Virginia. It is a table with 26 columns and 25472 rows. It was made by an enumerator person going house to house. Each row represents one person living in that household. It is the first census to list non-white people by name. There may be omissions, duplications, and errors in this data.
Field names and descriptions:

The following columns represent information about the person in a row. Some columns may be blank. There are also the group of finding aides found in all datasets.
1. line - A unique identifier for the row.
2. dwelling - A number used by the enumerator to identify a unique household, in order of visitation.
3. family - A number used by the enumerator to identify a unique family, in order of visitation.
4. full_name - The combination of the first-name, the middle_name, and the last_name separated by spaces. If there are only two words, the first is last_name and and the second is the last_name. If there is only one word, it is only the last_name.
5. first_name - The given name.
6. middle_name - The middle name or initials.
7. last_name - The surname.
8. first_name - The given name.
9. age - The age of the person in 1870.
10. birth-year - The year the person was born. May be inaccurate +/- 5 years.
11. gender - The sex of the person. Can be F for female or M for male.
12. race - The race of the person. Can be B for Black, W for White, M for Mulatto, C for Chinese, and I for Indian.
13. occupation - The work role of the person.
14. birth_place - Where the person was born.
15. re_value - The value of the person’s real-estate owned.
16. pe_value - The value of the person’s personal property owned.
17. marry_month - Month they were married, if in that year.
18. school - Y if they attended school
19. read - Y if they can read
20. write - Y if they can write 
21. condition - Whether deaf and dumb, blind, insane, or idiotic.
22. m21- Male citizen of the U.S. of 21 years or older.
23. vote - Right to vote is denied or abridged on other grounds than rebellion or other crime
}

And a second file named ALB_CN_1880.csv from the 1880 US census {

This file is a transcription of the US census for 1880 for Albemarle County Virginia. It is a table with 19 columns and 32415 rows. It was made by an enumerator person going house to house. Each row represents one person living in that household. There may be omissions, duplications, and errors in this data.

File names and descriptions:
The following columns represent information about the person in a row. Some columns may be blank. There are also the group of finding aides found in all datasets.
1. line - A unique identifier for the row.
2. family - A number used by the enumerator to identify a unique family, in order of visitation.
3. full_name - The combination of the first_name, the middle_name, and the last_name separated by spaces. If there are only two words, the first is last_name and and the second is the last_name. If there is only one word, it is only the last_name.
4. first_name - The given name.
5. middle_name - The middle name or initials.
6. last_name - The surname.
7. first-name - The given name.
8. age - The age of the person in 1870.
9. birth_year - The year the person was born. May be inaccurate +/- 5 years.
10. gender - The sex of the person. Can be F for female or M for male.
11. race - The race of the person. Can be B for Black, W for White, M for Mulatto, C for Chinese, and I for Indian.
12. relation - The relationship between the person and the head of household, whose relationship is labeled Self.
13. occupation - The work role of the person.
14. birth_place - Where the person was born.
15. mother_birth_place - Where the person’s mother was born.
16. father_birth_place - Where the person’s father was born.
}

I have these finding aides are additional columns added to primary source datasets that synthesize data from other columns to make matching easier. These fields are appended as columns in a primary source datasets where applicable.
Results are always in uppercase. NYSIIS is a soundex-like encoding algorithm, used to roughly compare names. 

* date_10 - year rounded down by +/- 5 years
* birth_date_10 - rounded
* norm_first_name - Abbreviation and nicknames expanded to full name
* nysiis_last_name - NYSIIS encoded last-name
* nysiis_first_name - NYSIIS encoded first-name
* norm_occupation - Occupations clustered to 21 meta-categories.

There is a third file called ALB_VER.csv which is a list of all the names in the 1870 census that were verified to be correct. The egoid the unique identifier for each person verified. Load this file as well. After it has been loaded set the variable name "nextEgoId" to the next egoid in the file.

APP IMPLEMENTATION:

Use papaparse to parse the csv files.
Use only plain vanilla javascript and jQuery to do this.
Do not use node.js
Load the files automatically on page load.
Add a button to start the matching process {
	- For each person in the first dataset, find the best match in the second dataset using the method described in @BlockMatchSkill.md.
	Add 3 tabs, one for each tier of the matching strategy.
	Here are the thresholds for each tier {
		- Tier 1 only includes matches that have a score above 90.
		- Tier 2 only includes matches that have a score between 80 and 89.
		- Tier 3 only includes matches that have a score between 60 and 79.
		}
	-List all the matches within the tier's thresholds in the appropriate tab
	- Limit those included in the preview tabs to the thresholds set.
	Show waiting icon while rendering preview.
	}
	- Add a checkbox on the right side of the line with the save button to tell the matching algorithm to implement household context boosting. If checked, the matching algorithm will implement household context boosting.

Matched Pairs Panel {
	- for each matched pair {
		- Show all of the matched pairs along with criteria at bottom of matched pair on which the were matched and their scores.
		- Show full_names of all people in family of the matched pair.
		}
	}


Census Context Panel {
	- The context-panel is split into two scrollable sections, one for the 1870 census and one for the 1880 census.
	- Pin the context-panel to the bottom of the screen.
	- Center context-panel to screen horizontally.
	- The context-panel fills the screen horizontally with 32 pixel margins.
	- Each section of the context-panel can display only 3 rows at a time.
	-When a match result is clicked {	
		- The line number of the the result is passed to the showContext function.
		- Fill the top section of the context-panel with rows extracted from the first dataset, 12 whose line numbers are above the current line number clicked and 12 below. Do not show the field names. 
		- Just show the data.
		- Scroll each census window down 50% when filled
		- The line number of the matched result is passed to the showContext function.
		- Fill the bottom section of the context-panel with rows from the second dataset in the same way as the first dataset.
		- Scroll match results to top.	
		}
	}

Add a button to save a csv file {
	When clicked {
		- if matching {
					- for each result in the Tier 1, 2, or 3 section of the matched pairs section {
						- add a row to the changes list with the following values set: {
							- theLine - The line number from the 1870 file.
							- theChange - The line number from the 1880 file.
							- theScore - The score of the match.
							}
					}
			}
			- else if finding duplicates {
				- for each result in the Tier 1, 2, or 3 section of the matched pairs section {
					- add a row to the changes list with the following values set: {
						- theLine - The line number from the from the first dataset.
						- theDupe - The line number from the second dataset.
						- theScore - The score of the match.
						}
					}
			}
		}
		- Use the @SaveChanges.md skill to save the changes.
	}

	Add search box at top of matched pairs section to scroll to found string in any pair: {
		- Start searching from the top. 
		- Ignore case. 
		- Clicking again finds the next match that fits the search term.
		- Find should find any occurance of search string in full match result.
		}

	Add a pulldwown menu with the following options: {
		- "Match datasets"
		- "Find duplicates"
		- "Find relations"	
		}	
	perform the following action when the pulldown menu is clicked: {
		- If "Match datasets" is selected {
			- follow the skill at @Block-matching-strategy.md
			}
		- If "Find relations" is selected {
			- follow the skill at @find-relations-strategy.md
			}
		- If "Find duplicates" is selected {
			- follow the skill at @Find-Duplicates-Skill.md using @ALB_1870.csv as the dataset.
			- The line number of the result is passed to the top showContext function.
			- The line number of the match result is passed to the bottom showContext function.
			- Tier 1 only includes matches that have a score above 150.
			- Tier 2 only includes matches that have a score between 140 and 149.
			- Tier 3 only includes matches that have a score between 130 and 139.
		}
	}
	if (st-1870 element is clicked) {
		Show interface to load CSV file.
		When CSV file is loaded put data in 1870 
		}		
	if (st-1880 element is clicked) {
		Show interface to load CSV file.
		When CSV file is loaded put data in 1880 
		}		

		


		
Show detailed steps of progress when matching in browser console only. 
Use a light UI theme.
Run on port 5500