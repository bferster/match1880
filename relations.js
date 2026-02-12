
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

	// HELPER: SCORING STRATEGY (Moved outside loop for scope)
	const findBestMatch = (member80, candidates) => {
		let best = null;
		let maxScore = -1;

		candidates.forEach(member70 => {
			let score = 0;
			// Name
			const n1 = (member70.first_name || '').toLowerCase().trim();
			const n2 = (member80.first_name || '').toLowerCase().trim();
			const nm1 = (member70.norm_first_name || '').toLowerCase().trim();
			const nm2 = (member80.norm_first_name || '').toLowerCase().trim();

			if (n1 === n2 && n1) score += 100;
			else if (jaroWinkler(n1, n2) > 0.85) score += 80;
			else if (nm1 === nm2 && nm1) score += 60;
			else if (jaroWinkler(n1, n2) > 0.7) score += 40;

			// Age
			const y1 = parseInt(member70.birth_year) || 0;
			const y2 = parseInt(member80.birth_year) || 0;
			if (y1 && y2) {
				const diff = Math.abs(y1 - y2);
				if (diff === 0) score += 100;
				else if (diff <= 2) score += 80;
				else if (diff <= 5) score += 40;
			}

			if (score > maxScore) {
				maxScore = score;
				best = member70;
			}
		});

		if (maxScore > 60) return best;
		return null;
	};

	// HELPER: ADD MATCH (Modified to take head80 as arg)
	const addMatch = (head80, r80, rRel, type, note) => {
		if (rRel.egoid === head80.egoid) return;           					// Skip self-matches
		app.candidates.push({
			head: head80,      												// Head of Household Context
			relation: rRel,    												// The relation found (1870 member)
			spouses: r80,													// The 1880 member (relation source) - ALIAS for user logic compatibility
			r70: head80,      												// Compatibility
			r80: rRel,
			details: `${type} Found`,
			tier: 1
		});
		relationsFound++;
	};


	// ASYNC PROCESSING CHUNK
	let processed = 0;
	const total = heads1880.length;
	const CHUNK_SIZE = 50;

	const processChunk = () => {
		const limit = Math.min(processed + CHUNK_SIZE, total);

		for (let i = processed; i < limit; i++) {
			const head80 = heads1880[i];
			const egoHead = head80.egoid;                                          // Get 1880 Head egoid
			const list1880 = house1880.get(head80.family) || [];                   // Get 1880 Members
			const head1870Record = app.data1870.find(r => r.egoid === egoHead);    // Get 1870 Head Record

			if (!head1870Record) continue;                                           // Skip if not found

			const list1870 = house1870.get(head1870Record.family) || [];           // Get 1870 Members

			// PROCESS MEMBERS
			list1880.forEach(member80 => {
				const rel = (member80.relation || '').toLowerCase();
				let type = '';
				let note = '';

				if (rel === 'wife') { type = 'Spouse'; note = 'Wife of Head'; }
				else if (['daughter', 'son', 'step-son', 'step-daughter'].includes(rel)) { type = 'Child'; note = 'Child of Head'; }
				else if (['grand-daughter', 'grand-son'].includes(rel)) { type = 'Grand-child'; note = 'Grand-child of Head'; }
				else if (['brother', 'sister'].includes(rel)) { type = 'Sibling'; note = 'Sibling of Head'; }
				else if (['niece', 'nephew'].includes(rel)) { type = 'Nibling'; note = 'Nibling'; }
				else if (['mother'].includes(rel)) { type = 'Mother'; note = 'Mother of Head'; }
				else if (['father'].includes(rel)) { type = 'Father'; note = 'Father of Head'; }
				else if (rel.includes('cousin')) { type = 'Cousin'; note = 'Cousin of Head'; }
				else if (['brother-in-law', 'brother_in_law'].some(x => rel.includes(x))) { type = 'Brother-in-law'; note = 'Via Brother-in-law'; }
				else if (['father_in_law', 'mother_in_law'].some(x => rel.includes(x.replace(/_/g, '-')))) {
					type = 'In-Law'; note = `Via ${rel}`;
					if ((member80.last_name || '') === head80.last_name && type === 'In-Law') type = '';
				}
				else if (rel.includes('sister') && rel.includes('law')) {
					type = 'Sister-in-law'; note = 'Via Sister-in-law';
				}

				if (type) {
					const match = findBestMatch(member80, list1870);
					if (match) {
						if (type === 'In-Law' || type === 'Sister-in-law') {
							const inLawName = match.last_name || '';
							if (inLawName === head80.last_name) return;
							if (type === 'Sister-in-law') {
								const mStat = (member80.marital || member80.marital_status || '').toUpperCase();
								if (mStat !== 'S') return;
							}
						}
						addMatch(head80, member80, match, type, note);
					}
				}
			});
		}

		processed = limit;
		if (processed % 100 === 0) {
			const pct = Math.round((processed / total) * 100);
			app.progress(pct, `Scanning relations (${processed}/${total})`);
		}

		if (processed < total) {
			setTimeout(processChunk, 0);
		} else {
			// DONE
			app.data1880.forEach(r => {                                                // FILTER SELF FROM DATA
				const myId = r.egoid;                                                  // Get Egoid
				if (!myId) return;                                                     // Skip if none
			});

			app.log(`Relations found: ${relationsFound}`);                             // LOG TOTAL
			app.finalizeResults();                                                     // FINALIZE
		}
	};

	setTimeout(processChunk, 0);
}
