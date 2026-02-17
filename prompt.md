I am a genealogist and historian. 
I am trying to match people from the 1870 US census to the 1880 US census. 

THE DATASETS {

	I have data in 2 files {
		the verified 1870 list, accessed from Google Sheets at:https://docs.google.com/spreadsheets/d/1F1v6NVQ_McESktbHSlH4MsWsUHG0QtMpMRsI_3wAleA
		the 1880 US census, accessed from  Google Sheets at:https://docs.google.com/spreadsheets/d/1K9DA3aoXkU_Yicts8Umtr92N9Hug3cdeTHcUN1gDf4E
		load them into memory.
		name the verified 1870 list the "dataVerified".
		name the 1880 US census the "data1880".
		}

	Data in dataVerified dataset {
		This list derrived the from the 1870 census. It has unique egoids for each person whuich form the basis for matching. It is used to find the matching 1870 rows in the 1880 census. Over time, rows will be added to this list as new unique people are found.

		The following columns represent information about the person in a row. Some columns may be blank. There are also the group of finding aides found in all datasets {
			1. line - A unique identifier for the row.
			2. egoid - egoid - unique person id, prefaced by county (i.e. AL3644)
			3. family - A number used by the enumerator to identify a unique family, in order of visitation.
			4. full_name - The combination of the first-name, the middle_name, and the last_name separated by spaces. If there are only two words, the first is last_name and and the second is the last_name. If there is only one word, it is only the last_name.
			5. first_name - The given name.
			6. middle_name - The middle name or initials.
			7. last_name - The surname.
			8. birth_year - The year the person was born. May be inaccurate +/- 5 years.
			9. gender - The sex of the person. Can be F for female or M for male.
			10. race - The race of the person. Can be B for Black, W for White, M for Mulatto, C for Chinese, and I for Indian.
			11. occupation - The work role of the person.
			12. birth_place - Where the person was born.
			13. death_year - The year the person died.
			14. enslavers - The egoid(s) of the person’s enslaver(s)
			15. maiden_name - The maiden name of the person.
			16. spouses - The egoid(s) of the spouse(s) of the person.
			17. mother - The egoid of the mother	
			18. father - The egoid of the father.	
			19. uncle - The egoid of the uncle	
			20. aunt - The egoid of the aunt.	
			21. grandmother - The egoid of the grandmother 
			22. grandfather - The egoid of the grandfather 
			23. siblings - A list of egoids of the siblings.
			24. niblings - A list of egoids of the nieces and nephews.
			25. cousins - A list of egoids of the cousins.
			26. children - A list of egoids of the children.
			27. grandchildren - A list of egoids of the grandchildren.
			28. norm_race - race normalized to full name to W or B
			29. norm_first_name - Abbreviation and nicknames expanded to full name
			30. nysiis_last_name - NYSIIS encoded last-name
			31. norm_occupation - Occupations clustered to 21 meta-categories.
			32. hard_evidence - high confidence in a comma-separated dbid list 
			33. soft_evidence - medium confidence in a comma-separated dbid list 
			}
	}

	Data in data1880 dataset {
		This file is a transcription of the US census for 1880 for Albemarle County Virginia. It is a table with 19 columns and 32415 rows. It was made by an enumerator person going house to house. Each row represents one person living in that household. There may be omissions, duplications, and errors in this data.

		The following columns represent information about the person in a row. Some columns may be blank. There are also the group of finding aides found in all datasets. {
			1. line - A unique identifier for the row.
			2. family - A number used by the enumerator to identify a unique family, in order of visitation.
			3. full_name - The combination of the first_name, the middle_name, and the last_name separated by spaces. If there are only two words, the first is last_name and and the second is the last_name. If there is only one word, it is only the last_name.
			4.  first_name - The given name.
			5.  middle_name - The middle name or initials.
			6.  last_name - The surname.
			7.  age - The age of the person in 1870.
			8.  birth_year - The year the person was born. May be inaccurate +/- 5 years.
			9.  gender - The sex of the person. Can be F for female or M for male.
			10. race - The race of the person. Can be B for Black, W for White, M for Mulatto, C for Chinese, and I for Indian.
			11. marital_status - The marital status of the person. Can be S for single, M for married, and D for divorced.	
			12. relation - The relationship between the person and the head of household, whose relationship is labeled Self.
			13. occupation - The work role of the person.
			14. birth_place - Where the person was born.
			15. mother_birth_place - Where the person’s mother was born.
			16. father_birth_place - Where the person’s father was born.
			17. norm_race - race normalized to full name to W or B
			18. norm_first_name - Abbreviation and nicknames expanded to full name
			19. nysiis_last_name - NYSIIS encoded last-name
			20. norm_occupation - Occupations clustered to 21 meta-categories.
			21. head - Y if this row is the head of the household.
			22. egoid - unique person id, prefaced by county (i.e. AL3644)
			}
	}

	if (st-1870 element is clicked) {
		Show interface to load CSV file.
		When CSV file is loaded put data in dataVerified array. 
		}		
	if (st-1880 element is clicked) {
		Show interface to load CSV file.
		When CSV file is loaded put data in data1880 array. 
		}		
}

APP IMPLEMENTATION:

Use papaparse to parse the csv files.
Use only plain vanilla javascript and jQuery to do this.
Do not use node.js
Load the files automatically on page load.
Add a button to start the matching process {
	- For each person in the first dataset, find the best match in the second dataset using the method described in @BlockMatchSkill.md.
	- Add 3 tabs, one for each tier of the matching strategy.
	- Here are the thresholds for each tier {
		- Tier 1 only includes matches that have a score above 90.
		- Tier 2 only includes matches that have a score between 80 and 89.
		- Tier 3 only includes matches that have a score between 60 and 79.
		}
	- List all the matches within the tier's thresholds in the appropriate tab
	- Limit those included in the preview tabs to the thresholds set.
	Show waiting icon while rendering preview.
	}
- Add a checkbox on the right side of the line with the save button to tell the matching algorithm to implement household context boosting. If checked, the matching algorithm will implement household context boosting.

- when method pulldown selects a new option, click on the start button.

Matched Pairs Panel {
	if method == "match" or method == "find-duplicates" {
		for each matched pair {
			Show all of the matched pairs along with criteria at bottom of matched pair on which the were matched and their scores.
			Show full_names of all people in family of the matched pair.
			}
		}
	else if method == "relations" {
		for each relation that is not match to itself {
			show the relations found {
				full_name of head of household.
				egoid of head of household.
				full_name of relation.
				egoid of relation.
				}
			}
	}

Census Context Panel {
	The context-panel is split into two scrollable sections, one for the 1870 census and one for the 1880 census.
	Pin the context-panel to the bottom of the screen.
	Center context-panel to screen horizontally.
	The context-panel fills the screen horizontally with 32 pixel margins.
	Each section of the context-panel can display only 3 rows at a time.
	When a match result is clicked {	
		The line number of the the result is passed to the showContext function.
		Fill the top section of the context-panel with rows extracted from the first dataset, 12 whose line numbers are above the current line number clicked and 12 below. Do not show the field names. 
		Just show the data.
		Scroll each census window down 50% when filled
		The line number of the matched result is passed to the showContext function.
		Fill the bottom section of the context-panel with rows from the second dataset in the same way as the first dataset.
		Scroll match results to top.	
		}
	}

Add a button to save to clipboard {
	When clicked {
		if matching {
			ask for cutoff score
			clear all rows of the egoid column in the 1880 list.
			for each row in the 1870 list {
				if the row has a match in the 1880 list and score  equal to or above cutoff {
					add the egoid of the 1870 row to the egoid column of the 1880 row	
					}
				}
			copy the egoid column from the 1880 list to clipboard.
			}
		else if finding duplicates {
			for each result in the Tier 1, 2, or 3 section of the matched pairs section {
				add a row to the changes list with the following values set: {
					theLine - The line number from the from the first dataset.
					theDupe - The line number from the second dataset.
					theScore - The score of the match.
					}
				}
			Make two columns: theLine, theChange 
			theLine is the line number from the census.
			theChange is the change to be made to the census.
			for each change to be made to the census
			add a row to the columns with the line number and the change to be made to the census.
			}
		else if relations {
			don't score candidates in relations.
			
			set spouses first {
				for each candidate {
					head = candidate.head.egoid.
					rel = candidate.relation.egoid.
					if (candidate.details.includes("spouse")) {
						in the dataVerified array {
						set the spouses field in the row where egoid = head to rel.
							set the spouses field in the row where egoid = rel to head.
							}
						}
					}

			for each candidate {

				head = candidate.head.egoid.
				rel = candidate.relation.egoid.
				spouse = candidate.spouses[0].egoid.

				if (candidate.details.includes("mother")) {
					if in the dataVerified array 
						add to the mother field in the row where egoid = rel to head, followed by a commma and a space.
						}
					}

				if (candidate.details.includes("father")) {
					if (in the dataVerified array) {
						add to the father field in the row where egoid = rel to head, followed by a commma and a space.
						}
					}
			
				if (candidate.details.includes("child")) {
					if (in the dataVerified array) {
						add "CHI-" + head to the children field in the row where egoid = rel to head, followed by a commma and a space.
						add head the children field in the row where egoid = spouse to rel, followed by a commma and a space.
						set the mother field in the row where egoid = rel to head.	
						set the father field in the row where egoid = rel to spouse.	
						}
					}

				if (candidate.details.includes("sibling")) {
					if (in the dataVerified array) {
						add "SIB-" + head to the siblings field in the row where egoid = rel to head, followed by a commma and a space.
						add to the siblings field in the row where egoid = rel followed by a commma and a space.
						}
					}
						
				if (candidate.details.includes("cousin")) {
					if (in the dataVerified array) {
						add "COU-" + head to the cousins field in the row where egoid = rel to head, followed by a commma and a space.
						add to the cousins field in the row where egoid = rel followed by a commma and a space.
						}
					}

				if (candidate.details.includes("nibling")) {
					if (in the dataVerified array) {
						add to the niblings field in the row where egoid = head to rel, followed by a commma and a space.
						add to the niblings field in the row where egoid = spouse to rel, followed by a commma and a space.
						}
					}

				if (candidate.details.includes("grand")) {
					if (in the dataVerified array) {
						add to the grandchildren field in the row where egoid = head to rel, followed by a commma and a space.
						add to the grandchildren field in the row where egoid = spouse to rel, followed by a commma and a space.
						}
					}
/*
				if (candidate.details.includes("brother-in-law")) {
					if (in the dataVerified array) {
						add to the siblings field in the row where egoid = rel to head, followed by a commma and a space.
						}
					}
	*/			
				}
					
			-------------------------------------------------------

			when done with all candidates {
				for each row in dataVerified {
					if the children field in the row contains "CHI-" {
						remove "CHI-" from the children field.
						get the value of the children field in that row.
						add that to the siblings field in the orginal row
						}
					if the siblings field in the row contains "SIB-" {
						remove "SIB-" from the siblings field.
						get the value of the siblings field in that row.
						add that to the siblings field in the orginal row
						}
					if the cousins field in the row contains "COU-" {
						remove "COU-" from the cousins field.
						get the value of the cousins field in that row.
						add that to the cousins field in the orginal row
						}
					}
				copy the maiden_name, spouses, mother, father, uncles, aunts, grandmother, grandfather, siblings, niblings, cousins, children, grandchildren columns from the dataVerified array to clipboard.

				Don't show popup, output a short beep to signal finished.	
				}
			}
		}
	}

	Add search box at top of matched pairs section to scroll to found string in any pair: {
		find should search in the data in the matched pairs panel
		start searching from the top. 
		ignore case. 
		clicking again finds the next match that fits the search term.
		find should find any occurance of search string in full match result.
		}

	Add a pulldwown menu setting mode {
		add the following options: {
			"Match datasets"
			"Find duplicates"
			"Find relations"
			"Make Triplets"
			}	
		perform the following action when the pulldown menu is clicked: {
			If "Match datasets" is selected follow the skill at @Maatch1870to1880.md
			If "Find relations" is selected follow the skill at @find-relations-strategy.md
			If "Make Triplets" is selected follow the skill at @Make Triplets.md
			If "Find duplicates" is selected follow the skill at @Find-Duplicates-Skill.md using @ALB_1870.csv as the dataset.
				The line number of the result is passed to the top showContext function.
				The line number of the match result is passed to the bottom showContext function.
				Tier 1 only includes matches that have a score above 150.
				Tier 2 only includes matches that have a score between 140 and 149.
				Tier 3 only includes matches that have a score between 130 and 139.
				}
			}

Show detailed steps of progress when matching in browser console only. 
Use a light UI theme.
Run on port 5500