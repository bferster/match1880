
import { jaroWinkler } from './match.js';

export function findRelations(app)                                             // FIND RELATIONS STRATEGY
{
	app.log("Starting Relation Finder...");                                    // LOG START
	app.progress(0, "Initializing Relations");                                 // PROGRESS 0%

	// Helper: Normalized Jaro-Winkler Check
	const isNameMatch = (n1, n2) => jaroWinkler(n1, n2) > 0.85;                // HELPER: FUZZY MATCH

	// 1. Index 1880 Households by Family ID
	const house1880 = new Map();                                               // MAP: FAMILY ID -> ROWS
	const heads1880 = [];                                                      // LIST: HEADS OF HOUSEHOLD

	app.data1880.forEach(r => {                                                // LOOP 1880 DATA
		const fid = r.family;                                                  // Get Family ID
		if (!house1880.has(fid)) house1880.set(fid, []);                       // Init Array
		house1880.get(fid).push(r);                                            // Add Member

		if (r.head === 'Y') {                                                  // IF HEAD MARKER
			heads1880.push(r);                                                 // Add to Heads List
		}
	});

	app.log(`Found ${heads1880.length} households in 1880.`);                  // LOG COUNT

	// NO MAPS FOR 1870 DATA (Direct Search)

	let relationsFound = 0;                                                    // COUNTER
	const updates = [];                                                        // TRACK UPDATES

	heads1880.forEach(head80 => {                                              // LOOP 1880 HEADS
		const egoHead = head80.egoid;                                          // Get Head Egoid
		const list1880 = house1880.get(head80.family) || [];                   // Get 1880 Members

		if (!app.data1870) return;

		const head1870Record = app.data1870.find(r => r.egoid === egoHead);

		if (!head1870Record) return;                                           // Skip if not found
		const ego1870 = head1870Record.egoid;

		// GET 1870 MEMBERS (Filter by Family)
		const fid1870 = head1870Record.family || head1870Record.family_id || head1870Record.dwelling;
		// Optimization: This filter is O(N) inside a loop. 
		// With large datasets this will be slow. But requested "Direct Search".
		const list1870 = app.data1870.filter(r => (r.family || r.family_id || r.dwelling) === fid1870);

		// show the results in the console.
		console.log(`[Relation] Match Found: Head 1880: ${head80.full_name} (Ego: ${egoHead}) matched 1870 Head (Ego: ${ego1870})`);
		console.log(`           1880 Family Members: ${list1880.length} | 1870 Family Members: ${list1870.length}`);

		// For UI feedback, let's add the head match to updates so user sees something happening
		updates.push({
			r1880: head80,
			type: 'Head',
			linkedTo: '1870',
			note: `Head ${head80.full_name} (Ego ${egoHead}) matched 1870 Family`
		});
		relationsFound++;

		// Helper to find match in 1870 list
		const findIn1870 = (criteriaFn) => {                                 // HELPER: FIND IN 1870
			return list1870.find(v => criteriaFn(v));
		};

		// -------------------------------------------------------------
		// WIFE PROCESSING
		// -------------------------------------------------------------
		list1880.forEach(member80 => {
			const rel = (member80.relation || '').toLowerCase();              // Get Relation

			// if list1880’s member’s relation is “wife”
			if (rel === 'wife') {
				// find matching name in list1870 list
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {
					// set egoWife = egoid of wife found in list1870.
					const egoWife = match.egoid;

					// add egoWife to spouse field in row where egoid = egoHead.
					head80.spouse = egoWife;

					// add egoHead to spouse field in row where egoid = egoWife.
					member80.spouse = egoHead;

					updates.push({ r1880: member80, type: 'Spouse', linkedTo: egoHead, note: `Wife of Head` });
					relationsFound++;
				}
			}
		});

		// -------------------------------------------------------------
		// CHILD / SIBLING / IN-LAW PROCESSING
		// -------------------------------------------------------------
		list1880.forEach(member80 => {
			const rel = (member80.relation || '').toLowerCase();              // Get Relation
			const mStat = (member80.marital || member80.marital_status || '').toUpperCase();

			// CHILDREN
			if (['daughter', 'son', 'step-son', 'step-daughter'].includes(rel)) {
				// find matching name in list1870 list
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {
					const egoChild = match.egoid;

					// add egoChild to children field in row with egoid = egoHead.
					head80.children = (head80.children ? head80.children + ',' : '') + egoChild;

					// add egoChild to children field in row with egoid = egoWife.
					const wife80 = list1880.find(m => (m.relation || '').toLowerCase() === 'wife');
					if (wife80 && wife80.spouse === egoHead) {
						wife80.children = (wife80.children ? wife80.children + ',' : '') + egoChild;
					}

					// add egoChild to siblings field in row with egoid = egoChild.
					member80.siblings = (member80.siblings ? member80.siblings + ',' : '') + egoChild;

					updates.push({ r1880: member80, type: 'Child', linkedTo: egoHead, note: `Child of Head` });
					relationsFound++;
				}
			}

			// SIBLINGS
			if (['brother', 'sister'].includes(rel)) {
				// find matching name in list1870
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {
					const egoSibling = match.egoid;

					// add egoSibling to siblings field in row with egoid = egoHead.
					head80.siblings = (head80.siblings ? head80.siblings + ',' : '') + egoSibling;

					// add egoHead to siblings field in row with egoid = egoSibling.
					member80.siblings = (member80.siblings ? member80.siblings + ',' : '') + egoHead;

					updates.push({ r1880: member80, type: 'Sibling', linkedTo: egoHead, note: `Sibling of Head` });
					relationsFound++;
				}
			}

			// IN-LAWS
			if (['brother-in-law', 'father_in_law', 'mother_in_law', 'brother-in-law'].some(x => rel.includes(x.replace(/_/g, '-')))) {
				// find matching name in list1870
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {
					const inLawName = match.last_name || '';
					if (inLawName !== head80.last_name) {
						const egoMaiden = inLawName;

						// add egoMaiden to maiden field in row with egoid = egoWife.
						const wife80 = list1880.find(m => (m.relation || '').toLowerCase() === 'wife');
						if (wife80) {
							wife80.maiden = egoMaiden;
							updates.push({ r1880: wife80, type: 'Maiden Name', linkedTo: egoMaiden, note: `Via ${rel}` });
						}
					}
				}
			}

			// SISTER-IN-LAW
			if (rel.includes('sister') && rel.includes('law')) {
				// find matching name in list1870
				const match = findIn1870(v => isNameMatch(v.first_name, member80.first_name));
				if (match) {
					const inLawName = match.last_name || '';
					if (inLawName !== head80.last_name) {
						if (mStat === 'S') {
							const egoMaiden = inLawName;

							// add egoMaiden to maiden field in row with egoid = egoWife.
							const wife80 = list1880.find(m => (m.relation || '').toLowerCase() === 'wife');
							if (wife80) {
								wife80.maiden = egoMaiden;
								updates.push({ r1880: wife80, type: 'Maiden Name', linkedTo: egoMaiden, note: `Via Sister-in-law` });
							}
						}
					}
				}
			}
		});
	});

	// Cleanup
	app.data1880.forEach(r => {                                                // FILTER SELF
		const myId = r.egoid;
		if (!myId) return;

		if (r.children) {
			r.children = r.children.split(',')
				.filter(id => id !== myId && id !== "SIBLINGS_TODO")
				.join(',');
		}
		if (r.siblings) {
			r.siblings = r.siblings.split(',')
				.filter(id => id !== myId && id !== "SIBLINGS_TODO")
				.join(',');
		}
	});

	app.log(`Relations found: ${relationsFound}`);                             // LOG TOTAL

	// Populate Results for Display
	app.candidates = updates.map(u => ({                                       // MAP TO CANDIDATES
		r70: {
			line: '0',
			full_name: `[${u.type}] Linked: ${u.linkedTo}`,
			birth_year: '-', age: '-', gender: '-', race: '-', occupation: u.note
		},
		r80: u.r1880,
		score: 100,                                                            // SYNTHETIC SCORE
		details: `${u.type} Found`,                                            // DETAILS
		tier: 1                                                                // TIER 1
	}));

	app.finalizeResults();                                                     // FINALIZE
}
