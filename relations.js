
import { jaroWinkler } from './match.js';

export function findRelations(app)                                             // FIND RELATIONS STRATEGY
{
	app.log("Starting Relation Finder...");                                    // LOG START
	app.progress(0, "Initializing Relations");                                 // PROGRESS 0%
	const isNameMatch = (n1, n2) => jaroWinkler(n1, n2) > 0.85;                // HELPER: FUZZY MATCH

	const house1880 = new Map();                                               // MAP: FAMILY ID -> ROWS
	const house1870 = new Map();                                               // MAP: FAMILY ID -> ROWS
	const heads1880 = [];                                                      // LIST: HEADS OF HOUSEHOLD

	app.data1880.forEach(r => {                                                // LOOP 1880 DATA
		const fid = r.family;                                                  // Get Family ID
		if (!house1880.has(fid)) house1880.set(fid, []);                       // Init Array
		house1880.get(fid).push(r);                                            // Add Member
		if (r.head === 'Y') heads1880.push(r);                                 // IF HEAD MARKER
	});

	app.data1870.forEach(r => {                                                // LOOP 1870 DATA
		const fid = r.family;                             	                   // Get Family ID
		if (!house1870.has(fid)) house1870.set(fid, []);                       // Init Array
		house1870.get(fid).push(r);                                            // Add Member
	});

	app.log(`Found ${heads1880.length} households in 1880.`);                  // LOG 1880 COUNT
	app.log(`Found ${house1870.size} households in 1870.`);                    // LOG 1870 COUNT

	let relationsFound = 0;                                                    // COUNTER

	app.candidates = []; // Clear existing candidates

	heads1880.forEach(head80 => {                                              // LOOP 1880 HEADS
		const egoHead = head80.egoid;                                          // Get 1880 Head egoid
		const list1880 = house1880.get(head80.family) || [];                   // Get 1880 Members
		const head1870Record = app.data1870.find(r => r.egoid === egoHead);    // Get 1870 Head Record
		if (!head1870Record) return;                                           // Skip if not found

		const list1870 = house1870.get(head1870Record.family) || [];           // Get 1870 Members

		const findIn1870 = (criteriaFn) => {                           			// HELPER: FIND IN 1870
			return list1870.find(v => criteriaFn(v));
		};

		// Helper to push candidate
		const addMatch = (r80, rRel, type, note) => {
			app.candidates.push({
				head: head80,      // Head of Household Context
				relation: rRel,    // The relation found
				r70: head80,      	 // Compatibility
				r80: rRel,
				details: `${type} Found`,
				tier: 1
			});
			relationsFound++;
		};

		// WIFE PROCESSING		
		list1880.forEach(member80 => {                                         	// LOOP MEMBERS
			const rel = (member80.relation || '').toLowerCase();               	// Get Relation
			if (rel === 'wife') {                                              	// IF WIFE
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name)); // find matching name in list1870 list
				if (match) {                                                   	// IF MATCH FOUND
					console.log(`WIFE ${match.full_name} -> ${head80.full_name} ${match.egoid}/${head80.egoid}`);
					addMatch(member80, match, 'Spouse', `Wife of Head`);
				}
			}
		});

		// CHILD / SIBLING / IN-LAW PROCESSING
		list1880.forEach(member80 => {                                         // LOOP MEMBERS
			const rel = (member80.relation || '').toLowerCase();               // Get Relation

			// CHILDREN
			if (['daughter', 'son', 'step-son', 'step-daughter'].includes(rel)) {
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {                                                   // IF MATCH FOUND
					console.log(`CHILD ${match.full_name} -> ${head80.full_name} ${match.egoid}/${head80.egoid}`);
					addMatch(member80, match, 'Child', `Child of Head`);
				}
			}

			// SIBLINGS
			if (['brother', 'sister'].includes(rel)) {                         // IF SIBLING
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {                                                   // IF MATCH FOUND
					console.log(`SIBLING ${match.full_name} -> ${head80.full_name} ${match.egoid}/${head80.egoid}`);
					addMatch(member80, match, 'Sibling', `Sibling of Head`);
				}
			}

			// IN-LAWS
			if (['brother-in-law', 'father_in_law', 'mother_in_law', 'brother-in-law'].some(x => rel.includes(x.replace(/_/g, '-')))) {
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {                                                   // IF MATCH FOUND
					const inLawName = match.last_name || '';                   // Get Name
					if (inLawName !== head80.last_name) {                      // If Not Same Last Name
						addMatch(member80, match, 'Maiden Name', `Via ${rel}`);
						console.log(`IN-LAW ${match.full_name} -> ${head80.full_name} ${match.egoid}/${head80.egoid}`);
					}
				}
			}

			// SISTER-IN-LAW
			if (rel.includes('sister') && rel.includes('law')) {               // IF SIS IN LAW
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {                                                   // IF MATCH FOUND
					const inLawName = match.last_name || '';                   // Get Name
					if (inLawName !== head80.last_name) {                      // If Not Same Last Name
						const mStat = (member80.marital || member80.marital_status || '').toUpperCase();
						if (mStat === 'S') {                                   // If Single
							addMatch(member80, match, 'Maiden Name', `Via Sister-in-law`);
							console.log(`SISTER ${match.full_name} -> ${head80.full_name} ${match.egoid}/${head80.egoid}`);
						}
					}
				}
			}
		});
	});

	// Cleanup
	app.data1880.forEach(r => {                                                // FILTER SELF FROM DATA
		const myId = r.egoid;                                                  // Get Egoid
		if (!myId) return;                                                     // Skip if none
	});

	app.log(`Relations found: ${relationsFound}`);                             // LOG TOTAL
	app.finalizeResults();                                                     // FINALIZE
}
