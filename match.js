
// ============================================================================
// UTILITIES
// ============================================================================

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

// ============================================================================
// PHASE 1: SCORING w/ FREQUENCY COMPENSATION
// ============================================================================

export function buildNameFrequencies(dataset)                                  // BUILD NAME FREQ MAPS
{
	const firstNameFreq = new Map();
	const lastNameFreq = new Map();

	dataset.forEach(p => {
		const f = (p.first_name || '').toLowerCase().trim();
		const l = (p.last_name || p['last-_name'] || '').toLowerCase().trim();

		if (f) firstNameFreq.set(f, (firstNameFreq.get(f) || 0) + 1);
		if (l) lastNameFreq.set(l, (lastNameFreq.get(l) || 0) + 1);
	});

	return { firstNameFreq, lastNameFreq };
}

export function getNameWeightModifier(name, freqMap)                           // GET RARITY MODIFIER
{
	if (!name || !freqMap) return 0;
	const n = name.toLowerCase().trim();
	const count = freqMap.get(n) || 0;

	if (count === 0) return 0;                                           // Missing/Not in map
	if (count <= 5) return 15;                                           // Very Rare
	if (count <= 20) return 5;                                           // Uncommon
	if (count >= 21 && count <= 100) return 0;                           // Average (Wait, spec said 21-100 is 0, so explicit return 0)
	if (count > 500) return -15;                                         // Extremely Common
	if (count > 100) return -5;                                          // Common

	return 0; // Fallback
}

export function calculateScore(set1, set2, mode = 'match', freqMaps = null)      // SCORE CANDIDATE PAIR
{
	let score = 0;
	const details = [];
	const get = (r, f) => (r[f] || '').toString().trim().replace(/\s+/g, ' ').toUpperCase();
	const val = (r, f) => parseInt(r[f]) || 0;

	// Normalize data helper
	const norm = (str) => (str || '').toLowerCase().trim();

	const s = {
		full1: norm(set1.full_name), full2: norm(set2.full_name),
		last1: norm(set1.last_name || set1['last-_name']),
		last2: norm(set2.last_name || set2['last-_name']),
		first1: norm(set1.first_name), first2: norm(set2.first_name),
		mid1: norm(set1.middle_name), mid2: norm(set2.middle_name),
		norm1: norm(set1.norm_first_name), norm2: norm(set2.norm_first_name),
		by1: val(set1, 'birth_year'), by2: val(set2, 'birth_year'),
		gen1: get(set1, 'gender'), gen2: get(set2, 'gender'),
		race1: get(set1, 'race'), race2: get(set2, 'race'),
		bpl1: get(set1, 'birth_place'), bpl2: get(set2, 'birth_place'),
		nysiis_last1: get(set1, 'nysiis_last_name'), nysiis_last2: get(set2, 'nysiis_last_name'),
		nysiis_first1: get(set1, 'nysiis_first_name'), nysiis_first2: get(set2, 'nysiis_first_name'),
		norm_occ1: get(set1, 'norm_occupation'), norm_occ2: get(set2, 'norm_occupation'),
	};

	let nameMatched = false;

	// --- NAME MATCH ---

	if (s.full1 === s.full2 && s.full1) {
		score += 100; details.push("Exact Full");
		nameMatched = true;
	}
	else if (s.last1 === s.last2 && s.first1 === s.first2 && s.last1) {
		// Exact Last & Exact First
		if (!s.mid1 && !s.mid2) {
			score += 80; details.push("Exact First/Last (No Mid)");
		} else {
			score += 80; details.push("Exact First/Last");
		}
		nameMatched = true;
	}
	else if (s.last1 === s.last2 && s.norm1 === s.norm2 && s.last1) {
		score += 70; details.push("Exact Last + Norm First");
		nameMatched = true;
	}
	else if (s.last1 === s.last2 && s.last1) {
		const jwFirst = jaroWinkler(s.first1, s.first2);
		if (jwFirst > 0.8) {
			score += 60; details.push(`Exact Last + Fuzzy First (${jwFirst.toFixed(2)})`);
			nameMatched = true;
		}
		else if (s.first1.charAt(0) === s.first2.charAt(0) && s.first1) {
			score += 40; details.push("Exact Last + First Initial");
			// Initial match is partial, maybe not full weight for freq mod
		}
	}
	else {
		const jwFirst = jaroWinkler(s.first1, s.first2);
		if (jwFirst >= 0.85) {
			score += 20; details.push(`Fuzzy First Only (${jwFirst.toFixed(2)})`);
		}
	}

	// --- COMMON NAME COMPENSATION ---
	// "If the first_name is matched in the Name_match phase..."
	// We'll apply if we have a decided 'nameMatched' OR high fuzzy first match
	// Simplification: Apply if we added positive score for name

	if (freqMaps) {
		// Only apply modifiers if we have some name match foundation
		if (score > 0) {
			const modF = getNameWeightModifier(s.first1, freqMaps.firstNameFreq);
			if (modF !== 0) { score += modF; details.push(`Freq-first:${modF}`); }

			const modL = getNameWeightModifier(s.last1, freqMaps.lastNameFreq);
			if (modL !== 0) { score += modL; details.push(`Freq-last:${modL}`); }
		}
	}

	// --- BIRTH YEAR ---

	const byDiff = Math.abs(s.by1 - s.by2);
	if (s.by1 === s.by2 && s.by1) { score += 50; details.push("Exact BY"); }
	else if (s.by1 && s.by2 && byDiff <= 2) { score += 30; details.push("BY +/- 2"); }
	else if (s.by1 && s.by2 && byDiff <= 5) { score += 5; details.push("BY +/- 5"); }

	// --- OCCUPATION ---

	if (s.norm_occ1 === s.norm_occ2 && s.norm_occ1) { score += 10; details.push("Occupation Match"); }

	// --- RACE ---

	if (s.race1 === s.race2 && s.race1) { score += 10; details.push("Exact Race"); }
	else if ((s.race1 === 'B' && s.race2 === 'M') || (s.race1 === 'M' && s.race2 === 'B')) {
		score += 10; details.push("Race B/M");
	}

	// --- PENALTIES ---

	if (s.gen1 !== s.gen2 && s.gen1 && s.gen2) { score -= 500; details.push("Gender Mismatch"); }

	if (s.by1 && s.by2 && s.by2 < s.by1 && mode === 'match') { // 1880 < 1870
		const diff = s.by1 - s.by2;
		if (diff > 10) { score -= 100; details.push("Age Regress > 10"); }
		else if (diff > 5) { score -= 20; details.push("Age Regress > 5"); }
	}

	if (s.bpl1 !== s.bpl2 && s.bpl1 !== 'VA' && s.bpl2 !== 'VA' && s.bpl1 && s.bpl2) {
		score -= 50; details.push("Contradictory BPL");
	}

	if (s.nysiis_last1 !== s.nysiis_last2 && s.nysiis_last1) { score -= 100; details.push("NYSIIS Last Mismatch"); }
	if (s.nysiis_first1 !== s.nysiis_first2 && s.nysiis_first1) { score -= 40; details.push("NYSIIS First Mismatch"); }


	return { score, details: details.join(", ") };
}