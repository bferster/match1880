///////////////////////////////////////////////////////////////////////////////
// LOGIC: MATCHING STRATEGY (Ported from Block Matching Skill)
///////////////////////////////////////////////////////////////////////////////

export function jaroWinkler(s1, s2)                                            // CALCULATE STRING DISTANCE
{
	if (!s1 || !s2) return 0;                                            // Return 0 if empty

	s1 = s1.toLowerCase().trim();                                        // Normalize 1
	s2 = s2.toLowerCase().trim();                                        // Normalize 2

	if (s1 === s2) return 1;                                             // Exact match

	const len1 = s1.length;
	const len2 = s2.length;
	const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;      // Calc window

	const hash_s1 = new Array(len1).fill(false);
	const hash_s2 = new Array(len2).fill(false);

	let matches = 0;

	for (let i = 0; i < len1; i++) {
		const start = Math.max(0, i - matchDistance);
		const end = Math.min(i + matchDistance + 1, len2);

		for (let j = start; j < end; j++) {
			if (s1[i] === s2[j] && !hash_s2[j]) {                        // Found match
				hash_s1[i] = true;
				hash_s2[j] = true;
				matches++;
				break;
			}
		}
	}

	if (matches === 0) return 0;                                         // No matches

	let t = 0;
	let point = 0;

	for (let i = 0; i < len1; i++) {
		if (hash_s1[i]) {
			while (!hash_s2[point]) point++;
			if (s1[i] !== s2[point]) t++;                                // Transposition check
			point++;
		}
	}
	t /= 2;

	let dist = ((matches / len1) + (matches / len2) + ((matches - t) / matches)) / 3;

	// Winkler Boost
	let prefix = 0;
	for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
		if (s1[i] === s2[i]) prefix++;                                   // Count prefix
		else break;
	}

	if (dist > 0.7) {
		dist += prefix * 0.1 * (1 - dist);                               // Apply boost
	}

	return dist;
}

export function getBlockKeys(record)                                    // GENERATE BLOCKING KEYS
{
	const keys = [];
	const race = (record.race || '').substring(0, 1).toUpperCase();
	const gender = (record.gender || '').toUpperCase();

	if (!race || !gender) return keys;                                   // Skip if missing core

	const nysiis_last = (record.nysiis_last_name || '').toUpperCase();
	const norm_first = (record.norm_first_name || '').toUpperCase();
	// Handle typo from 1880 file if present
	const last_name = (record.last_name || record.last_name_ || record['last-_name'] || '').toUpperCase();
	const birth_year = record.birth_year_10 || record.birth_year;
	const birth_place = (record.birth_place || '').toUpperCase().substring(0, 2);

	if (nysiis_last && norm_first) {
		keys.push(`B1:${nysiis_last}|${norm_first}|${gender}|${race}`); // Block 1
	}
	if (norm_first && birth_year) {
		keys.push(`B2:${norm_first}|${birth_year}|${gender}|${race}`);  // Block 2
	}
	if (last_name && birth_place) {
		keys.push(`B3:${last_name}|${gender}|${race}|${birth_place}`);  // Block 3
	}

	return keys;
}

export function calculateScore(r1870, r1880, mode = 'match')                          // SCORE CANDIDATE PAIR
{
	let score = 0;
	const details = [];

	// Helper to safety get fields
	const get = (r, f) => (r[f] || '').toUpperCase();
	const val = (r, f) => parseInt(r[f]) || 0;

	const s = {
		last70: get(r1870, 'last_name'),
		last80: get(r1880, 'last_name') || get(r1880, 'last-_name'),
		first70: get(r1870, 'first_name'), first80: get(r1880, 'first_name'),
		mid70: get(r1870, 'middle_name'), mid80: get(r1880, 'middle_name'),
		age70: val(r1870, 'age'), age80: val(r1880, 'age'),
		by70: val(r1870, 'birth_year'), by80: val(r1880, 'birth_year'),
		gen70: get(r1870, 'gender'), gen80: get(r1880, 'gender'),
		race70: get(r1870, 'race'), race80: get(r1880, 'race'),
		bpl70: get(r1870, 'birth_place'), bpl80: get(r1880, 'birth_place'),
		ny_last70: get(r1870, 'nysiis_last_name'), ny_last80: get(r1880, 'nysiis_last_name'),
		ny_first70: get(r1870, 'nysiis_first_name') || get(r1870, 'norm_first_name'), // Fallback if nysiis_first missing
		ny_first80: get(r1880, 'nysiis_first_name') || get(r1880, 'norm_first_name'),
		norm_occ70: get(r1870, 'norm_occupation'), norm_occ80: get(r1880, 'norm_occupation'),
	};

	/////////////////////////////////////////////////////////////////////////////////////////////////
	// LOGIC BRANCHING
	/////////////////////////////////////////////////////////////////////////////////////////////////

	if (mode === 'match') {
		// --- BLOCK MATCH SKILL LOGIC ---

		// Penalties
		if (s.gen70 !== s.gen80) { score -= 500; details.push("Gender mismatch"); }

		const byDiff = s.by70 - s.by80; // 1870(older) - 1880(younger)? logic implies birth year.
		// age regression: 1880 birth year < 1870 birth year. 
		// i.e. Person born 1850 in 1870 record. In 1880 record, birth year is 1840. That's fine?
		// "age regression (1880 birth_year < 1870 birth_year)" -> born EARLIER in 1880 than 1870?
		// Usually 1880 record should have BY around 1870 BY. 
		// If 1880 BY is SIGNIFICANTLY smaller, it means they got OLDER faster?
		// Let's stick to simple diff logic from prompt: "1880 birth_year < 1870 birth_year"
		if (s.by80 < s.by70) {
			const diff = s.by70 - s.by80;
			if (diff > 10) { score -= 100; details.push("Age regression > 10"); }
			else if (diff > 5) { score -= 20; details.push("Age regression > 5"); }
		}

		if (s.bpl70 && s.bpl80 && s.bpl70 !== 'VA' && s.bpl80 !== 'VA' && s.bpl70 !== s.bpl80) {
			score -= 50; details.push("Contradictory birth place");
		}

		if (s.ny_last70 && s.ny_last80 && s.ny_last70 !== s.ny_last80) {
			score -= 100; details.push("NYSIIS Last mismatch");
		}

		// Note: nysiis_first might not be in dataset, if so skip penalty or use norm
		if (s.ny_first70 && s.ny_first80 && s.ny_first70 !== s.ny_first80) {
			score -= 40; details.push("NYSIIS First mismatch");
		}

		// Birth Year Bonus
		const absDiff = Math.abs(s.by70 - s.by80);
		if (s.by70 === s.by80 && s.by70) { score += 50; details.push("Exact birth year"); }
		else if (absDiff <= 2) { score += 30; details.push("Birth year +/- 2"); }
		else if (absDiff <= 5) { score += 5; details.push("Birth year +/- 5"); }

	} else {
		// --- FIND DUPLICATES SKILL LOGIC ---

		// Birth Year Matches
		if (s.by70 === s.by80 && s.by70) {
			score += 50; details.push("Exact birth year");
		} else if (Math.abs(s.by70 - s.by80) > 5) {
			score -= 500; details.push("Birth year > 5 diff");
		}
	}


	// --- COMMON / SHARED SCORING (NAME & RACE & OCC) ---
	// (Unless specifically divergent, but Skills list same Name/Race/Occ logic mostly)

	// Name Match Logic
	const full70 = (s.first70 + ' ' + (s.mid70 ? s.mid70 + ' ' : '') + s.last70).trim();
	const full80 = (s.first80 + ' ' + (s.mid80 ? s.mid80 + ' ' : '') + s.last80).trim();
	const jwFirst = jaroWinkler(s.first70, s.first80);

	if (full70 === full80 && full70.length > 0) {
		score += 100; details.push("Full name identical");
	} else if (s.last70 === s.last80 && s.first70 === s.first80 && s.last70) {
		score += 80; details.push("Exact First/Last"); // Middle name logic effectively maps here
	} else if (s.last70 === s.last80 && get(r1870, 'norm_first_name') === get(r1880, 'norm_first_name') && s.last70) {
		score += 70; details.push("Exact Last + Norm First");
	} else if (s.last70 === s.last80 && jwFirst > 0.8) {
		score += 60; details.push("Exact Last + Fuzzy First");
	} else if (s.last70 === s.last80 && s.first70 && s.first80 && s.first70[0] === s.first80[0]) {
		score += 40; details.push("Exact Last + First Initial");
	}
	// NYSIIS Last + Norm First is in BlockMatch but NOT FindDuplicates. 
	// To be safe, include only if match mode? Or assume helpful for both? 
	// FindDuplicates text provided was explicit list. I will exclude for dedup if strict.
	else if (mode === 'match' && s.ny_last70 === s.ny_last80 && get(r1870, 'norm_first_name') === get(r1880, 'norm_first_name') && s.ny_last70) {
		score += 50; details.push("NYSIIS Last + Norm First");
	}

	if (mode === 'match' && jwFirst >= 0.85) { score += 20; details.push("Fuzzy First Bonus"); }

	// Race Match
	// Identical (+10) OR Both W (+10) OR Both !W (+10)
	// Effectively: If (RaceA == RaceB) OR (RaceA != W AND RaceB != W)
	if ((s.race70 === s.race80 && s.race70)) {
		score += 10; details.push("Race Match");
	} else if (s.race70 !== 'W' && s.race80 !== 'W' && s.race70 && s.race80) {
		score += 10; details.push("Non-White Match");
	}

	// Occupation Match
	if (s.norm_occ70 === s.norm_occ80 && s.norm_occ70) { score += 10; details.push("Norm occupation"); }

	return { score, details: details.join(", ") };
}
