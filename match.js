

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
	const clean = (val) => (val || '').toString().trim().replace(/\s+/g, ' ').toUpperCase(); // Helper: Normalize

	const race = clean(record.race || 'U').substring(0, 1);             // Default to U if missing
	const gender = clean(record.gender || 'U');                         // Default to U if missing

	// NOTE: Removed strict check for race/gender to allow matching records with missing demographics
	// if (!race || !gender) return keys; 

	const nysiis_last = clean(record.nysiis_last_name);
	const norm_first = clean(record.norm_first_name);
	const last_name = clean(record.last_name || record['last-_name']);
	const birth_year = record.birth_year_10 || record.birth_year;
	const birth_place = clean(record.birth_place).substring(0, 2);

	// Block 1: Last Name (Phonetic) + First Name (Norm) + Gender
	// Removed Race to allow for trans-racial matches (common in census transcription errors)
	if (nysiis_last && norm_first) {
		keys.push(`B1:${nysiis_last}|${norm_first}|${gender}`);
	}

	// Block 2: First Name (Norm) + Birth Year + Gender
	// Catches Last Name changes (Marriage/Error)
	if (norm_first && birth_year) {
		keys.push(`B2:${norm_first}|${birth_year}|${gender}`);
	}

	// Block 3: Last Name + Birth Place + Gender
	// Catches First Name variations (Nicknames)
	if (last_name && birth_place) {
		keys.push(`B3:${last_name}|${gender}|${birth_place}`);
	}
	return keys;
}

export function calculateScore(set1, set2, mode = 'match')                          // SCORE CANDIDATE PAIR
{
	let score = 0;                                                                       // Init score
	const details = [];                                                                  // Init details
	const get = (r, f) => (r[f] || '').toString().trim().replace(/\s+/g, ' ').toUpperCase(); // Helper: Get value normalized
	const val = (r, f) => parseInt(r[f]) || 0;                                           // Helper: Get value as non-null int

	const s = {                                                                          // Normalize data
		full1: get(set1, 'full_name'), full2: get(set2, 'full_name'),               	 // Full Names
		last1: get(set1, 'last_name') || get(set1, 'last-_name'),
		last2: get(set2, 'last_name') || get(set2, 'last-_name'),                        // Last Names (Support Typo)
		first1: get(set1, 'first_name'), first2: get(set2, 'first_name'),                // First Names
		mid1: get(set1, 'middle_name'), mid2: get(set2, 'middle_name'),                  // Middle Names
		by1: val(set1, 'birth_year'), by2: val(set2, 'birth_year'),                      // Birth Years
		gen1: get(set1, 'gender'), gen2: get(set2, 'gender'),                            // Genders
		race1: get(set1, 'race'), race2: get(set2, 'race'),                              // Races
		bpl1: get(set1, 'birth_place'), bpl2: get(set2, 'birth_place'),                  // Birth Places
		ny_last1: get(set1, 'nysiis_last_name'), ny_last2: get(set2, 'nysiis_last_name'), // NYSIIS Last
		ny_first1: get(set1, 'nysiis_first_name') || get(set1, 'norm_first_name'),        // NYSIIS First 70
		ny_first2: get(set2, 'nysiis_first_name') || get(set2, 'norm_first_name'),        // NYSIIS First 80
		norm_occ1: get(set1, 'norm_occupation'), norm_occ2: get(set2, 'norm_occupation'), // Occupations
	};
	const jwFirst = jaroWinkler(s.first1, s.first2);                                     // Jaro First
	const absDiff = Math.abs(s.by1 - s.by2);											 // Difference in birth year

	// PENALTIES

	if (s.gen1 && s.gen2 && s.gen1 !== s.gen2) { score -= 500; details.push("Gender mismatch"); }          	// Gender
	if (s.by1 && s.by2 && (s.by2 < s.by1) && (mode == "match")) {                                         // If first is older (impossible)
		const diff = s.by1 - s.by2;                                                    	// Diff in age
		if (diff > 10) { score -= 100; details.push("Age regression > 10"); }           // Major rewind
	}
	if (s.bpl1 && s.bpl2 && s.bpl1 !== 'VA' && s.bpl2 !== 'VA' && s.bpl1 !== s.bpl2) {  // Birth Place Check
		score -= 50; details.push("Contradictory birth place");                         // Bad BPL
	}
	// BIRTH

	if (s.by1 === s.by2 && s.by1) { score += 50; details.push("Exact birth year"); }  	// Exact BY
	else if (s.by1 && s.by2 && absDiff <= 2) { score += 30; details.push("Birth year +/- 2"); }           // Close BY
	else if (s.by1 && s.by2 && absDiff <= 5) { score += 5; details.push("Birth year +/- 5"); }            // Near BY
	else if (s.by1 && s.by2 && absDiff >= 10) { score -= 200; details.push("Birth year > 10"); }           // Far

	// NAMES

	if (s.full1 === s.full2 && s.full1.length > 0) {                                  	// Identical Full
		score += 100; details.push("Exact Full");
	}
	else if (s.last1 === s.last2 && s.first1 === s.first2 && s.last1) {           		// Exact F/L
		score += 80; details.push("Exact First/Last");
	}
	else if (s.last1 === s.last2 && get(set1, 'norm_first_name') === get(set2, 'norm_first_name') && s.last1) { // Last identical, first normalized										
		score += 70; details.push("Exact Last + Norm First");                                  	// Norm First
	}
	else if (s.last1 === s.last2 && jwFirst > 0.85) {                                 	// Fuzzy First
		score += 60; details.push("Exact Last + Fuzzy First");
	}

	// RACE																				

	if ((s.race1 === s.race2 && s.race1)) {                                          	// Race Exact
		score += 10; details.push("Race Match");
	}
	else if (s.race1 !== 'W' && s.race2 !== 'W' && s.race1 && s.race2) {           		// Race Non-White
		score += 10; details.push("Non-White Match");
	}

	// OCCUPATION

	if (s.norm_occ1 === s.norm_occ2 && s.norm_occ1) {
		score += 10; details.push("Norm occupation");
	}
	return { score, details: details.join(", ") };
}