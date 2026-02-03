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
12. relation - The relationship between the person and the head of household, whose relationship is labeled Self. This includes: Husband, Wife, Son, Cousin, Father, Mother, Niece, Nephew, Brother, Sister, Uncle, Aunt, Daughter, GDau (grand-daughter), GSon (grand-son), GNephew (grand-nephew),  Gniece (grand-niece), GGDau (great-grand-daughter), GGSon (great-grand-son), DauL (daughter in-law), SonL (son in-law), SisterL (sister in-law), BrotherL (brother-in-law), FatherL (father-in-law), MotherL (mother-in-law),SSon (step son), SDaun (step daughter), Smother (step-mother), Sfather (step-father), Hbrother (half-brother), Hsister (half-sister),Adopted, or Other.
13. occupation - The work role of the person.
14. birth_place - Where the person was born.
15. mother_birth_place - Where the person’s mother was born.
16. father_birth_place - Where the person’s father was born.
}

I have these finding aides are additional columns added to primary source datasets that synthesize data from other columns to make matching easier. These fields are appended as columns in a primary source datasets where applicable.
Results are always in uppercase. NYSIIS is a soundex-like encoding algorithm, used to roughly compare names. The dates are rounded +/- 5 years with this formula: floor((year+5)/10)*10.
* date_10 - year rounded down by +/- 5 years
* birth_date_10 - rounded
* norm_first_name - Abbreviation and nicknames expanded to full name
* nysiis_last_name - NYSIIS encoded last-name
* nysiis_first_name - NYSIIS encoded first-name
* norm_occupation - Occupations clustered to 21 meta-categories.

APP IMPLEMENTATION:

Use papaparse to parse the csv files.
Use only plain vanilla javascript and jQuery to do this.
Do not use node.js
Load the files automatically on page load.
Add a button to start the matching process {
	- For each person in the 1870 file, find the best match in the 1880 file using the method described in the "Block" matching strategy skill.
	Add 3 tabs, one for each tier of the matching strategy.
	Here are the thresholds for each tier {
		Tier 1 only includes matches that have a score above 89.
		Tier 2 only includes matches that have a score between 70 and 89.
		Tier 3 only includes matches that have a score below 69.
		}
	-List all the matches within the tier's thresholds in the appropriate tab
	Limit those included in the preview tabs to the thresholds set.
	Show waiting icon while rendering preview.
	}
Show all of the matched pairs along with criteria at bottom of matched pair on which the were matched and their scores.

Census Context Panel {
	- The context-panel is split into two scrollable sections, one for the 1870 census and one for the 1880 census.
	- Pin the context-panel to the bottom of the screen.
	- Center context-panel to screen horizontally.
	- The context-panel fills the screen horizontally with 32 pixel margins.
	- Each section of the context-panel can display only 3 rows at a time.
	-When a match result is clicked {	
		- The line number of the 1870 match result is passed to the showContext function.
		- Fill the top section of the context-panel with rows extracted from the 1870 census, 12 whose line numbers are above the current line number clicked, and 12 below. Do not show the field names. Just show the data.
		Scroll each census window down 50% when filled
		- The line number of the 1880 match result is passed to the showContext function.
		-Fill the bottom section of the context-panel with rows from the 1880 census in the same way as the 1870 census.
		}
	}

Add a button to save a csv file with the matched pairs to a new file called "matched.csv".
Each row in the matched.csv file should have the following columns {
	match_score - The match score from the 1880 file.
	line_1870 - The line number from the 1870 file.
	All of the columns from the 1870 file.
	line_1880 - The line number from the 1880 file.
	All of the columns from the 1880 file.
	match_evidence - The match evidence from the 1880 file.
	}
Show detailed steps of progress when matching in browser console only. 
Use a light UI theme.
Run on port 5500