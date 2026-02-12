
* The 1870 data set contains rows of people from the 1870 US census. It has children, spouse, and siblings fields.
* The 1880 dataset contains rows of people from the 1880 US census. It has an additional field, “relation” which specifies the * relationship each person has with the head of the household.
* Both datasets have a field called “egoid” that refers to the same person, and is used to link the two datasets.
* Both datasets have a field the one called “head”. If its value is “Y”, then that person is the head of the household for a number of people in the following row.
* Use the method in @block-matching-skill.md to find matching rows in the two datasets. 
* Put this code in a file called relations.js.

For each head of household in the 1880 dataset {
	- skip if the head of household does not have an egoid.
	- create a list of all rows in the 1880 dataset that have the same family field value as the head of household.
	- set variable egoHead to the egoid of head of household in 1880 household.
	- find the head of household where the egoid matches the one in the verified dataset. {
		- skip if not found.	
		- set variable ego1870 to the egoid of the head of household in the verified dataset.
		}
	make 2 lists of household members {
		each list only contains members of the same family in the dataset, indicated by having the same family field.
		list1870 contains the household members in the 1870 dataset.
		list1880 contains the household members in the 1880 dataset.
		}

	use this first-name-match strategy to match each 1870 household member to 1880 head of household {
		- relation is household member in 1870 census to match with head of household in 1880.
		- make a members list of 1870 household members with the same head of household in 1880.
		- for each member in list {
			- set member.score = 0
			- score by first name similarity {
				- If relation.first_name = member.first_name then add member.score +100 points. 
				- else if jaroWinkler score of relation.first_name and member.first_name is > .85 then +80.
				- else if relation.norm_first_name = member.norm_first_name then +60.
				- else if jaroWinkler score of relation.first_name and member.first_name is > .7 then +40.
				}
			- score by birth year similarity {
				- if relation.birth_year = member.birth_year then +100.
				- else relation.birth_year  member.birth_year are +/- 2 years  apart `then +80.
				- else relation.birth_year  member.birth_year are +/- 5 years then +40.
				}
			}
		- find member with highest score {
			- if score if above 60, return the member.
			- else return null.
			}
		}

	- show progress bar while finding relations.
	- whenever you find a relation match, using the first-name-match strategy, add it to the list of matches, when showing matched pairs.
		
	for each member of list1880  {
		if list1880’s member’s relation is “wife”  {
			find matching name in list1870 list  {
				skip if not found.
				set egoWife = egoid of wife found in list1870.
				}
			add egoWife to spouse field in row where egoid = egoHead.
			add egoHead to spouse field in row where egoid = egoWife.
			}
		}

	for each member of the list1880  {
		if list1880’s member’s relation is "mother"  {
			find matching name in list1870 list  {
				skip if not found.
				set egoMother = egoid of mother found in list1870.
				}
			add egoMother to mother field in row where egoid = egoHead.
			add egoHead to children field in row where egoid = egoMother.
			}
		if list1880’s member’s relation is "father"  {
			find matching name in list1870 list  {
				skip if not found.
				set egoFather = egoid of father found in list1870.
				}
			add egoFather to father field in row where egoid = egoHead.
			add egoHead to children field in row where egoid = egoFather.
			}	
		if list1880’s relation is “brother” or “sister” {
			find matching name in list1870  {
				skip if not found
				set egoSibling = egoid of sibling list1870
				}
			add egoSibling to siblings field in row with egoid = egoHead.
			add egoHead to siblings field in row with egoid = egoSibling.
			}
		if list1880’s member’s relation is "cousin"  {
			handle cousins in the same way as siblings.
			except {
				use "COU-" instead of "SIB-" in first pass to flag them. 
				add them to the cousins field instead of siblings in row where egoid = egoHead.
				}			
			}	
		if list1880’s relation is “wife” set egoWife = egoid of wife found in list1870.
			find matching name in list1870 list {
				- skip if not found.
				- set egoChild = egoid of child found in list1870.
				}
			add egoChild to children field in row with egoid = egoHead.
			add egoChild to children field in row with egoid = egoWife.
			add egoChild to siblings field in row with egoid = egoChild.
			}
		- if list1880’s relation is niece or “nephew” {
			- find matching name in list1870  {
				skip if not found
				set egoNibling = egoid of nibling list1870
				}
			- add egoNibling to niblings field in row with egoid = egoHead.
			- add egoHead to niblings field in row with egoid = egoNibling.
			}
		- if list1880’s relation is “brother-in-law” or “father_in_law” or “mother_in_ law” {
			- find matching name in list1870  {
				- skip if not found
				- skip if the last_name of in-law in list1870 is the same as the last_name in the egoHead row.
				- set egoMaiden = last_name of in-law in list1870.
				}
			- add egoMaiden to maiden field in row with egoid = egoWife.
			}
		- if list1880’s relation field is “sister-in-law” {
			- find matching name in list1870 {
				- skip if not found
				- skip if last_name is the same as last_name in egoHead row.
				}
			- if list1880’s marital_status is "S" {
				- set egoMaiden = last_name of in-law
				- add egoMaiden to maiden field in row with egoid = egoWife.
				}
	    	}  
	}
	
Remove egoids that match main egoid in row.

