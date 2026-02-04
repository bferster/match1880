# Line/Change pair saving Skill

## Purpose
This skill makes a list of changes needing to be made and consists of two columns: theLine and theChange. This is used to save changes to a dataset in a CSV formatted file. The changes are made to the dataset in the order they are listed in the file.

<!-- USE THIS TO IMPLEMENT THE PROCESS IN THE SPREADSHEET
	Add 3 columns to the spreadsheet.
	Column X -> 1st new column, theLine.
	Column Y -> 2nd new column, theChange.
	Column Z is blank.
	Paste the formula in 3rd new column and copy down.
	if setting:
		=IF(COUNTIF($X:$X,A2)>0,INDEX($Y:$Y,MATCH(A2,$X:$X,0)),"") 
	if appending:
		Column C is the column that currently holds the data that you want to change.
		=TEXTJOIN(",",TRUE,C2,IF(COUNTIF($X:$X,A2)>0,INDEX($Y:$Y,MATCH(A2,$X:$X,0)),""))
	Copy Z (CTRL-Shift-V)to the column to replace the old data.
-->

## Process

	Make two columns: theLine, theChange:
	- theLine is the line number from the census.
	- theChange is the change to be made to the census.
	-for each change to be made to the census
		- add a row to the  columns with the line number and the change to be made to the census.
	- save the file as a csv file called changes.csv
