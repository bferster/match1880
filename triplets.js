
/**
 * Triplets Generator
 * Implements "Make Triplets" skill to generate RDF Semantic Graph.
 */

export function generateTriplets(dataset) {
	console.log("[Triplets] Starting generation for " + dataset.length + " records.");
	const output = [];

	// 1. PREFIXES
	const prefixes = [
		'@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
		'@prefix owl: <http://www.w3.org/2002/07/owl#> .',
		'@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
		'@prefix foaf: <http://xmlns.com/foaf/0.1/> .',
		'@prefix rel: <http://purl.org/vocab/relationship/> .',
		'@prefix cen: <http://albemarle-census.org/ontology#> .',
		'@prefix person: <http://albemarle-census.org/person/> .',
		'@prefix household: <http://albemarle-census.org/household/> .',
		'@prefix dwelling: <http://albemarle-census.org/dwelling/> .'
	];
	output.push(prefixes.join('\n'));
	output.push(''); // newline

	// Helper to escape strings
	const esc = (val) => {
		if (val === undefined || val === null || val === '') return '';
		return val.toString().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	};

	// 2. GENERATE TRIPLES
	dataset.forEach(p => {
		// Subject URI
		const subj = `person:${p.egoid || p.id || p.line}`;

		// Build properties block
		const props = [];

		// Type
		props.push(`rdf:type foaf:Person`);

		// Mapping table
		// first_name maps to foaf:givenName "value"^^xsd:string
		if (p.first_name) props.push(`foaf:givenName "${esc(p.first_name)}"^^xsd:string`);
		if (p.full_name) props.push(`foaf:fullName "${esc(p.full_name)}"^^xsd:string`);
		if (p.last_name) props.push(`foaf:familyName "${esc(p.last_name)}"^^xsd:string`);
		if (p.gender) props.push(`foaf:gender "${esc(p.gender)}"^^xsd:string`);
		if (p.birth_year) props.push(`cen:birthYear "${esc(p.birth_year)}"^^xsd:integer`);
		if (p.race) props.push(`cen:race "${esc(p.race)}"^^xsd:string`);
		if (p.egoid) props.push(`cen:egoid "${esc(p.egoid)}"^^xsd:string`);
		if (p.occupation) props.push(`cen:occupation "${esc(p.occupation)}"^^xsd:string`);
		if (p.birth_place) props.push(`cen:birthPlace "${esc(p.birth_place)}"^^xsd:string`);
		if (p.head) props.push(`cen:isHeadOfHousehold "${esc(p.head)}"^^xsd:boolean`);	// head might be string "true"/"false" or boolean

		// Step 3: Map Structural Links
		if (p.family) props.push(`cen:memberOfFamily household:${esc(p.family)}`);
		if (p.dwelling) props.push(`cen:livesInDwelling dwelling:${esc(p.dwelling)}`);

		// Step 4: Map Family Relationship Object Properties
		// Assuming p.spouse, p.children etc are arrays of IDs.
		// NOTE: The dataset must be enriched! If raw CSV, these might be strings or missing.
		// We'll handle both arrays and comma-separated strings if present.

		const processRel = (field, predicate, objPrefix = 'person:') => {
			let list = p[field];
			if (!list) return;
			if (typeof list === 'string') list = list.split(',').filter(x => x.trim());
			if (Array.isArray(list)) {
				list.forEach(id => {
					id = id.toString().trim();
					if (id) props.push(`${predicate} ${objPrefix}${id}`);
				});
			}
		};

		processRel('spouse', 'rel:spouseOf');
		processRel('children', 'rel:parentOf');
		processRel('parent', 'rel:childOf');
		processRel('siblings', 'rel:siblingOf');
		processRel('aunts_uncles', 'cen:nephewNieceOf');

		// Close block
		if (props.length > 0) {
			output.push(`${subj} ${props.join(' ;\n    ')} .`);
		}
	});

	const finalOutput = output.join('\n');
	return finalOutput;
}
