A JavaScript script that converts my enriched 1870 historical census dataset into a complete Semantic Web Knowledge Graph using RDF Triples in Turtle (.ttl) format.

**Context:** 
	I have an array of JavaScript objects representing the 1870 census.
	Each object contains standard 1870 properties: egoid (unique identifier), full_name, first_name, last_name, birth_year, gender, race, occupation, birth_place, dwelling, family, and head  (head of household indicator).
	It also contains inferred relational arrays generated from previous linkage steps: spouse, children, siblings, aunts_uncles, and parent. These arrays contain the ids of the related individuals.

**Step 1: Setup and Ontologies:**

	Write a script to write to a file named 1870_census_graph.ttl.
	First, output these exact standard ontology prefixes to the top of the file {
		@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
		@prefix owl: <http://www.w3.org/2002/07/owl#> .
		@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
		@prefix foaf: <http://xmlns.com/foaf/0.1/> .
		@prefix rel: <http://purl.org/vocab/relationship/> .
		@prefix cen: <http://albemarle-census.org/ontology#> .
		@prefix person: <http://albemarle-census.org/person/> .
		@prefix household: <http://albemarle-census.org/household/> .
		@prefix dwelling: <http://albemarle-census.org/dwelling/> .
	}

**Step 2: Generate Triples for Every Person:**

	Iterate through the 1870 dataset array. For each person, construct an RDF block using their id as the Subject URI (e.g., person:1024). 
	Map the Demographic Literal Properties (skip if the value is null or empty) {
	Type definition: person:{id} rdf:type foaf:Person ;
	first_name maps to foaf:givenName "value"^^xsd:string ;
	full_name maps to foaf:fullName "value"^^xsd:string ;
	last_name maps to foaf:familyName "value"^^xsd:string ;
	gender maps to foaf:gender "value"^^xsd:string ;
	birth_year maps to cen:birthYear "value"^^xsd:integer ;
	race maps to cen:race "value"^^xsd:string ;
	egoid maps to cen:egoid "value"^^xsd:string ;
	occupation maps to cen:occupation "value"^^xsd:string ;
	birth_place maps to cen:birthPlace "value"^^xsd:string ;
	head maps to cen:isHeadOfHousehold "value"^^xsd:boolean ;
}

**Step 3: Map Structural Links**

Link the person to their family: cen:memberOfFamily household:{family} ;
Link the person to their physical dwelling: cen:livesInDwelling dwelling:{dwelling} ;

**Step 4: Map Family Relationship Object Properties**

	Check the relational arrays (spouse, children, siblings, parent, aunts_uncles). 
	If they contain IDs, append the following Object Properties to the person's RDF block {
		For each ID in spouse: rel:spouseOf person:{id} ;
		For each ID in children: rel:parentOf person:{id} ;
		For each ID in parent: rel:childOf person:{id} ;
		For each ID in siblings: rel:siblingOf person:{id} ;
		For each ID in aunts_uncles: cen:nephewNieceOf person:{id} ;
		}

**Step 5: Formatting and Syntax**

	Ensure strict Turtle syntax {
		Use semicolons (;) between properties for the same subject, and correctly close each person's block with a period (.). 
		Ensure string values are escaped properly (e.g., removing unescaped quotes from occupations).
		}

Automatically download the generated RDF graph as 1870_census_graph.ttl
