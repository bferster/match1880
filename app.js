// Imports removed to rely on Global CDN scripts (Vanilla JS/jQuery compatible)

// ============================================================================
// LOGIC: MATCHING STRATEGY (Ported from Block Matching Skill)
// ============================================================================

function jaroWinkler(s1, s2) {
	if (!s1 || !s2) return 0;

	s1 = s1.toLowerCase().trim();
	s2 = s2.toLowerCase().trim();

	if (s1 === s2) return 1;

	const len1 = s1.length;
	const len2 = s2.length;
	const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

	const hash_s1 = new Array(len1).fill(false);
	const hash_s2 = new Array(len2).fill(false);

	let matches = 0;

	for (let i = 0; i < len1; i++) {
		const start = Math.max(0, i - matchDistance);
		const end = Math.min(i + matchDistance + 1, len2);

		for (let j = start; j < end; j++) {
			if (s1[i] === s2[j] && !hash_s2[j]) {
				hash_s1[i] = true;
				hash_s2[j] = true;
				matches++;
				break;
			}
		}
	}

	if (matches === 0) return 0;

	let t = 0;
	let point = 0;

	for (let i = 0; i < len1; i++) {
		if (hash_s1[i]) {
			while (!hash_s2[point]) point++;
			if (s1[i] !== s2[point]) t++;
			point++;
		}
	}
	t /= 2;

	let dist = ((matches / len1) + (matches / len2) + ((matches - t) / matches)) / 3;

	// Winkler Boost
	let prefix = 0;
	for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
		if (s1[i] === s2[i]) prefix++;
		else break;
	}

	if (dist > 0.7) {
		dist += prefix * 0.1 * (1 - dist);
	}

	return dist;
}

function getBlockKeys(record) {
	const keys = [];
	const race = (record.race || '').substring(0, 1).toUpperCase();
	const gender = (record.gender || '').toUpperCase();

	if (!race || !gender) return keys;

	const nysiis_last = (record.nysiis_last_name || '').toUpperCase();
	const norm_first = (record.norm_first_name || '').toUpperCase();
	// Handle typo from 1880 file if present
	const last_name = (record.last_name || record.last_name_ || record['last-_name'] || '').toUpperCase();
	const birth_year = record.birth_year_10 || record.birth_year;
	const birth_place = (record.birth_place || '').toUpperCase().substring(0, 2);

	if (nysiis_last && norm_first) {
		keys.push(`B1:${nysiis_last}|${norm_first}|${gender}|${race}`);
	}
	if (norm_first && birth_year) {
		keys.push(`B2:${norm_first}|${birth_year}|${gender}|${race}`);
	}
	if (last_name && birth_place) {
		keys.push(`B3:${last_name}|${gender}|${race}|${birth_place}`);
	}

	return keys;
}

function calculateScore(r1870, r1880) {
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
		norm_occ70: get(r1870, 'norm_occupation'), norm_occ80: get(r1880, 'norm_occupation'),
		by10_70: r1870.birth_year_10, by10_80: r1880.birth_year_10
	};

	// --- PHASE 2: SCORING ---

	// Penalties (Red Flags) - MATCHING SKILL
	if (s.gen70 !== s.gen80) { score -= 500; details.push("Gender mismatch"); }
	// Birth year regression (1880 birth_year < 1870 birth_year): -30 points
	if (s.by80 < s.by70) { score -= 30; details.push("Birth year regression"); }

	if (s.bpl70 && s.bpl80 && s.bpl70 !== 'VA' && s.bpl80 !== 'VA' && s.bpl70 !== s.bpl80) {
		score -= 50; details.push("Contradictory birth place");
	}

	// Name Match Logic (Already implemented above - no change needed there)
	const full70 = (s.first70 + ' ' + (s.mid70 ? s.mid70 + ' ' : '') + s.last70).trim();
	const full80 = (s.first80 + ' ' + (s.mid80 ? s.mid80 + ' ' : '') + s.last80).trim();

	if (full70 === full80 && full70.length > 0) {
		score += 100; details.push("Full name identical");
	} else if (s.last70 === s.last80 && s.first70 === s.first80 && s.last70) {
		if (!s.mid70 && !s.mid80) {
			score += 100; details.push("Exact First/Last (No Middle)");
		} else {
			score += 80; details.push("Exact First/Last");
		}
	} else if (s.last70 === s.last80 && get(r1870, 'norm_first_name') === get(r1880, 'norm_first_name') && s.last70) {
		score += 70; details.push("Exact Last + Norm First");
	} else if (s.last70 === s.last80 && s.last70) {
		score += 50; details.push("Exact Last");
	} else if (s.ny_last70 === s.ny_last80 && get(r1870, 'norm_first_name') === get(r1880, 'norm_first_name') && s.ny_last70) {
		score += 50; details.push("NYSIIS Last + Norm First");
	}

	// Birth Year Matches
	const byDiff = Math.abs(s.by70 - s.by80);
	if (s.by70 === s.by80 && s.by70) { score += 50; details.push("Exact birth year"); }
	else if (byDiff <= 2) { score += 33; details.push("Birth year +/- 2"); }
	else if (byDiff <= 5) { score += 20; details.push("Birth year +/- 5"); }

	// Race Match
	if ((s.race70 === s.race80 && s.race70) ||
		((s.race70 === 'B' && s.race80 === 'M') || (s.race70 === 'M' && s.race80 === 'B'))) {
		score += 10; details.push("Race Match");
	}

	// Occupation Match
	if (s.norm_occ70 === s.norm_occ80 && s.norm_occ70) { score += 10; details.push("Norm occupation"); }

	// Fuzzy Matches (Remains Commented Out in Skill)
	/*
	const jwLast = jaroWinkler(s.last70, s.last80);
	if (jwLast >= 0.85 && s.last70 !== s.last80) { score += 8; details.push(`Fuzzy last ${jwLast.toFixed(2)}`); }

	const jwFirst = jaroWinkler(s.first70, s.first80);
	if (jwFirst >= 0.85 && s.first70 !== s.first80) { score += 8; details.push(`Fuzzy first ${jwFirst.toFixed(2)}`); }
	*/


	return { score, details: details.join(", ") };
}


// ============================================================================
// APP LOGIC
// ============================================================================

const App = {
	data1870: [],
	data1880: [],
	// Maps to quickly find index by line number if needed, though we can assume arrays are roughly ordered or just search.
	// For millions of records, map is better. For standard census files, lines might be sequential.
	// We will build an index map on load.
	map1870: new Map(),
	map1880: new Map(),

	nextEgoId: 1, // Default start if no file loaded

	blocks: new Map(),
	candidates: [],

	// Tiered results
	tier1: [],
	tier2: [],
	tier3: [],
	tier2: [],
	tier3: [],
	currentTab: 1,

	searchIndex: -1,
	searchTerm: '',

	log: function (msg) {
		// Console only log as requested
		console.log(`[App] ${msg}`);
	},

	setStatus: function (id, status, type) {
		const $el = $(`#${id}`);
		$el.text(status);
		$el.attr('class', `badge ${type}`);
	},

	progress: function (val, text) {
		$('#progress-bar').css('width', `${val}%`);
		$('#progress-text').text(`${Math.round(val)}% - ${text}`);
		console.log(`[Progress] ${Math.round(val)}% - ${text}`);
	},

	init: function () {
		this.log("Application initialized on port 5500.");
		this.log("Loading datasets in background...");

		Promise.all([
			this.fetchCSV('ALB_CN_1870.csv'),
			this.fetchCSV('ALB_CN_1880.csv'),
			this.fetchCSV('ALB_VER.csv')
		]).then(results => {
			this.data1870 = results[0];
			this.data1880 = results[1];
			const verData = results[2];

			// Calculate nextEgoId
			let maxId = 0;
			if (verData && verData.length > 0) {
				verData.forEach(row => {
					const id = parseInt(row.egoid);
					if (!isNaN(id) && id > maxId) maxId = id;
				});
			}
			this.nextEgoId = maxId + 1;
			this.log(`Loaded Verified Data. Next Ego ID: ${this.nextEgoId}`);

			// Build Index Maps
			// Ensure line is string for consistency as CSV parsing might vary
			// But PapaParse header:true usually returns strings.
			// Let's force string keys.
			this.data1870.forEach((r, i) => this.map1870.set(String(r.line), i));
			this.data1880.forEach((r, i) => this.map1880.set(String(r.line), i));

			this.setStatus('st-1870', `Loaded (${this.data1870.length})`, 'ready');
			this.setStatus('st-1880', `Loaded (${this.data1880.length})`, 'ready');
			this.log("Data loaded. Ready to start.");

			$('#btn-run').prop('disabled', false);

		}).catch(err => {
			this.log("Error loading data: " + err);
		});

		$('#btn-run').on('click', () => {
			$('#btn-run').prop('disabled', true);
			$('#progress-container').removeClass('hidden');
			// Hide previous results if any
			$('#results-panel').addClass('hidden');
			$('#context-panel').addClass('hidden');

			setTimeout(() => this.startBlocking(), 100);
		});

		$('#btn-save').on('click', () => this.exportCSV());

		$('.tab-btn').on('click', (e) => {
			const t = $(e.currentTarget).data('tab');
			this.switchTab(t);
		});

		$('#btn-search').on('click', () => this.findNext());
		$('#inp-search').on('keypress', (e) => {
			if (e.which === 13) this.findNext();
		});


		// Delegation for match item clicks
		$(document).on('click', '.match-item', (e) => {
			// Visual feedback
			$('.match-item').removeClass('active-match'); // Add style if we want specifically
			$(e.currentTarget).css('background-color', '#eff6ff');

			// Get original lines
			const l70 = parseInt($(e.currentTarget).data('l70'));
			const l80 = parseInt($(e.currentTarget).data('l80'));

			// No shift as requested
			const l70_shift = l70;
			const l80_shift = l80;

			// Log to console 
			console.log(`[Context] 1870 Match Line: ${l70}`);
			console.log(`[Context] 1880 Match Line: ${l80}`);

			this.showContext(l70_shift, l80_shift);
		});
	},

	fetchCSV: function (url) {
		return new Promise((resolve, reject) => {
			Papa.parse(url, {
				download: true,
				header: true,
				skipEmptyLines: true,
				complete: (results) => resolve(results.data),
				error: (err) => reject(err)
			});
		});
	},

	startBlocking: function () {
		this.log("Phase 1: Blocking...");
		this.progress(10, "Generating blocks");

		// Blocking is fast enough relative to scoring
		this.blocks = new Map();

		// 1870
		this.data1870.forEach(row => {
			const keys = getBlockKeys(row);
			keys.forEach(k => this.addToBlock(k, row, 70));
		});

		// 1880
		this.data1880.forEach(row => {
			const keys = getBlockKeys(row);
			keys.forEach(k => this.addToBlock(k, row, 80));
		});

		this.log(`Generated ${this.blocks.size} blocks.`);
		setTimeout(() => this.startScoring(), 100);
	},

	addToBlock: function (key, record, type) {
		if (!this.blocks.has(key)) this.blocks.set(key, { list70: [], list80: [] });
		const b = this.blocks.get(key);
		if (type === 70) b.list70.push(record);
		else b.list80.push(record);
	},

	startScoring: function () {
		this.log("Phase 2: Scoring Candidates...");
		this.progress(30, "Scoring candidates");

		const blockKeys = Array.from(this.blocks.keys());
		const totalBlocks = blockKeys.length;
		const candidateMap = new Map();

		let processed = 0;
		const CHUNK_SIZE = 1000;

		const processChunk = () => {
			const limit = Math.min(processed + CHUNK_SIZE, totalBlocks);

			for (let i = processed; i < limit; i++) {
				const key = blockKeys[i];
				const block = this.blocks.get(key);

				if (block.list70.length > 0 && block.list80.length > 0) {
					for (const r70 of block.list70) {
						for (const r80 of block.list80) {
							const pairId = `${r70.line}-${r80.line}`;
							if (candidateMap.has(pairId)) continue;

							const res = calculateScore(r70, r80);
							// Min threshold 60 as per Tier 3
							if (res.score >= 60) {
								// Assign Tier
								let tier = 0;
								if (res.score > 90) tier = 1;
								else if (res.score >= 80) tier = 2; // 80-90
								else tier = 3; // 60-79

								if (tier > 0) {
									candidateMap.set(pairId, {
										r70, r80, score: res.score, details: res.details, tier
									});
								}
							}
						}
					}
				}
			}

			processed = limit;
			const pct = 30 + (processed / totalBlocks) * 40;
			if (processed % 5000 === 0) this.progress(pct, `Scoring... (${processed}/${totalBlocks})`);

			if (processed < totalBlocks) {
				setTimeout(processChunk, 0);
			} else {
				this.candidates = Array.from(candidateMap.values());
				this.log(`Scored ${this.candidates.length} candidate pairs.`);
				// Household Boosting Commented out in Skill. Proceed to Resolution directly.
				setTimeout(() => this.startResolution(), 100);
			}
		};

		processChunk();
	},


	startResolution: function () {
		this.log("Phase 4: Resolving Conflicts & Identifying Anchors...");
		this.progress(60, "Resolving conflicts");

		// Sort by score descending
		this.candidates.sort((a, b) => b.score - a.score);

		const used70 = new Set();
		const used80 = new Set();

		// Temporary containers for identification
		this.tier1 = [];

		for (const cand of this.candidates) {
			const id70 = cand.r70.line;
			const id80 = cand.r80.line;

			// One person can match at most ONE person in the other census
			if (used70.has(id70) || used80.has(id80)) continue;

			used70.add(id70);
			used80.add(id80);

			if (cand.tier === 1) this.tier1.push(cand);
		}

		this.log(`Phase 4 Resolved: ${this.tier1.length} Tier 1 anchors identified.`);

		if ($('#chk-boost').is(':checked')) {
			setTimeout(() => this.startHouseholdBoosting(), 100);
		} else {
			this.log("Skipping Household Context Boosting (User opt-out).");
			setTimeout(() => this.finalizeResults(), 100);
		}
	},

	startHouseholdBoosting: function () {
		this.log("Phase 5: Household Context Boosting...");
		this.progress(80, "Context boosting");

		// 1. Index Households
		const house70 = new Map();
		const house80 = new Map();

		this.data1870.forEach(r => {
			const famKey = r.family_number || r.family || r.dwelling;
			if (famKey) {
				if (!house70.has(famKey)) house70.set(famKey, []);
				house70.get(famKey).push(r);
			}
		});

		this.data1880.forEach(r => {
			if (r.family) {
				if (!house80.has(r.family)) house80.set(r.family, []);
				house80.get(r.family).push(r);
			}
		});

		// 2. Use Tier 1 matches from Phase 4 as Anchors
		const anchors = this.tier1;

		// Map to track all candidates
		const candidateMap = new Map();
		this.candidates.forEach(c => candidateMap.set(`${c.r70.line}-${c.r80.line}`, c));

		let boosted = 0;

		anchors.forEach(anchor => {
			const key70 = anchor.r70.family_number || anchor.r70.family || anchor.r70.dwelling;
			const h70 = house70.get(key70) || [];
			const h80 = house80.get(anchor.r80.family) || [];

			h70.forEach(member70 => {
				if (member70.line === anchor.r70.line) return;

				h80.forEach(member80 => {
					if (member80.line === anchor.r80.line) return;

					const pairId = `${member70.line}-${member80.line}`;
					let candidate = candidateMap.get(pairId);

					if (!candidate) {
						const res = calculateScore(member70, member80);
						if (res.score > 20) {
							candidate = { r70: member70, r80: member80, score: res.score, details: res.details, tier: 0 };
						} else {
							return;
						}
					}

					let bonus = 0;
					let reasons = [];

					// Head of household name match: +20 points
					const rel80 = (member80.relation || '').toLowerCase();
					if (rel80 === 'self' || rel80 === 'head') {
						if (jaroWinkler(member70.full_name, member80.full_name) > 0.9) {
							bonus += 20;
							reasons.push("Head Match");
						}
					}

					// Spouse match (opposite gender, similar age): +20 points
					if (member70.gender !== member80.gender) {
						bonus += 20;
						reasons.push("Spouse/Context");
					}

					// Child match (using 1880 relation field): +8 points per child
					if (rel80.includes('son') || rel80.includes('dau') || rel80.includes('child')) {
						bonus += 8;
						reasons.push("Child Context");
					}

					// Parent match: +15 points
					if (rel80.includes('father') || rel80.includes('mother')) {
						bonus += 15;
						reasons.push("Parent Context");
					}

					// Co-residence bonus: +15 points
					bonus += 15;
					reasons.push("Co-residence");

					// Update Score
					if (bonus > 0) {
						candidate.score += bonus;
						candidate.details += (candidate.details ? ", " : "") + reasons.join(", ");

						// Re-Tier
						let newTier = 0;
						if (candidate.score > 90) newTier = 1;
						else if (candidate.score >= 80) newTier = 2;
						else if (candidate.score >= 60) newTier = 3;
						else newTier = 0;

						if (newTier > 0) {
							if (candidate.tier === 0 || newTier < candidate.tier) {
								candidate.tier = newTier;
								candidateMap.set(pairId, candidate);
								boosted++;
							}
						}
					}
				});
			});
		});

		this.log(`Boosted ${boosted} candidates via household context.`);
		this.candidates = Array.from(candidateMap.values());

		setTimeout(() => this.finalizeResults(), 100);
	},

	finalizeResults: function () {
		this.log("Finalizing Matches...");
		this.progress(90, "Finalizing");

		this.candidates.sort((a, b) => b.score - a.score);

		const used70 = new Set();
		const used80 = new Set();

		this.tier1 = [];
		this.tier2 = [];
		this.tier3 = [];

		let count = 0;
		for (const cand of this.candidates) {
			const id70 = cand.r70.line;
			const id80 = cand.r80.line;

			if (used70.has(id70) || used80.has(id80)) continue;

			used70.add(id70);
			used80.add(id80);

			if (cand.tier === 1) this.tier1.push(cand);
			else if (cand.tier === 2) this.tier2.push(cand);
			else if (cand.tier === 3) this.tier3.push(cand);
			count++;
		}

		this.log(`Final count: ${count} unique matches.`);
		this.log(`Tier 1: ${this.tier1.length}, Tier 2: ${this.tier2.length}, Tier 3: ${this.tier3.length}`);

		this.progress(100, "Done");

		$('#results-panel').removeClass('hidden');
		$('#context-panel').removeClass('hidden');
		$('#btn-save').removeClass('hidden');
		$('#btn-run').prop('disabled', false);

		// Update counts
		$('#cnt-1').text(this.tier1.length);
		$('#cnt-2').text(this.tier2.length);
		$('#cnt-3').text(this.tier3.length);

		this.switchTab(1);
	},

	switchTab: function (t) {
		this.currentTab = parseInt(t);
		$('.tab-btn').removeClass('active');
		$(`.tab-btn[data-tab="${t}"]`).addClass('active');
		this.renderMatches();
	},


	renderMatches: function () {
		const $list = $('#matches-list');
		const $spinner = $('#loading-overlay');

		// Show spinner, hide list
		$list.addClass('hidden');
		$spinner.removeClass('hidden');

		let data = [];
		if (this.currentTab === 1) data = this.tier1;
		else if (this.currentTab === 2) data = this.tier2;
		else data = this.tier3;

		// Async render to allow UI paint
		setTimeout(() => {
			$list.empty();

			if (data.length === 0) {
				$list.html('<div style="padding:20px; text-align:center; color:#666">No matches in this tier.</div>');
			} else {
				// Show ALL matches (User requested)
				let html = '';
				data.forEach(m => {
					let cls = 'score-low';
					if (m.score > 90) cls = 'score-high';
					else if (m.score >= 80) cls = 'score-med';

					const detailsHtml = (m.details || '').split(', ').map(d => `<span class="ev-tag">${d}</span>`).join('');

					html += `
                        <div class="match-item" data-l70="${m.r70.line}" data-l80="${m.r80.line}">
                            <div class="match-header">
                                <span class="badge ${cls}" style="font-size:1.1em">${m.score}</span>
                            </div>
                            <div class="match-grid">
                                <div class="rec">
                                    <span>1870 (Line ${m.r70.line})</span>
                                    <strong>${m.r70.full_name}</strong>
                                    <span>Age: ${m.r70.age} | Born: ${m.r70.birth_year} | ${m.r70.birth_place} | ${m.r70.race}/${m.r70.gender}</span>
                                    <span>Occ: ${m.r70.occupation}</span>
                                </div>
                                <div class="rec">
                                    <span>1880 (Line ${m.r80.line})</span>
                                    <strong>${m.r80.full_name}</strong>
                                    <span>Age: ${m.r80.age} | Born: ${m.r80.birth_year} | ${m.r80.birth_place} | ${m.r80.race}/${m.r80.gender}</span>
                                    <span>Occ: ${m.r80.occupation}</span>
                                </div>
                            </div>
                            <div class="evidence-list">
                                ${detailsHtml}
                            </div>
                        </div>
                    `;
				});
				$list.html(html);
			}

			// Hide spinner, show list
			$spinner.addClass('hidden');
			$list.removeClass('hidden');
			$list.scrollTop(0);
		}, 50);
	},

	showContext: function (l70, l80) {
		const renderBox = (data, map, line, containerId) => {
			const $box = $(containerId);
			// Convert line to string for lookup as map keys are strings
			const lineKey = String(line);

			if (!line || !map.has(lineKey)) {
				$box.text(`Row not found for line: ${line} (Key: ${lineKey})`);
				return;
			}

			const centerIdx = map.get(lineKey);
			// 12 rows above, 12 rows below
			const start = Math.max(0, centerIdx - 12);
			const end = Math.min(data.length, centerIdx + 12 + 1); // +1 because slice is exclusive

			const rows = data.slice(start, end);

			const lines = rows.map(r => {
				// Simple formatting: Line number + Values
				// Or just values. Prompt: "Do not show the field names. Just show the data."
				// We'll format it as pipe-separated values for compactness
				// mark the center row
				const isCenter = (r.line == line);
				const marker = isCenter ? '>> ' : '   ';

				// Extract values, filter out empty
				const vals = Object.values(r).join(' | ');
				return `${marker}${vals}`;
			});

			$box.text(lines.join('\n'));

			// Scroll roughly to center (child index 12)
			// 4.5em height, each line is ~1.5em?
			// Actually scrollTop is in pixels.
			// If we assume roughly equal line height, we can try to center it.
			// But since 'text' replaces all content, it's just one text block.
			// We can't scroll to element. User can scroll. 
			// We put '>> ' marker to help.

			// Auto-scroll to center (50% of content - half of viewport)
			// Small delay to ensure render
			setTimeout(() => {
				const scrollHeight = $box[0].scrollHeight;
				const clientHeight = $box.innerHeight();
				$box.scrollTop((scrollHeight / 2) - (clientHeight / 2));
			}, 0);
		};

		renderBox(this.data1870, this.map1870, l70, '#context-1870');
		renderBox(this.data1880, this.map1880, l80, '#context-1880');
	},

	exportCSV: function () {
		this.log("Exporting Changes CSV...");

		const changes = [];
		// Only Tier 1 for changes as per request
		this.tier1.forEach(m => {
			changes.push({
				theLine: m.r70.line,
				theChange: this.nextEgoId
			});
			this.nextEgoId++;
		});

		const csv = Papa.unparse(changes);
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", "changes.csv");
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		this.log(`Exported ${changes.length} changes. Next EgoID is now ${this.nextEgoId}`);
	},

	prefixKeys: function (obj, prefix) {
		const newObj = {};
		for (const k in obj) {
			newObj[`${prefix}${k}`] = obj[k];
		}
		return newObj;
	},

	findNext: function () {
		const term = $('#inp-search').val().trim().toLowerCase();
		if (!term) return;

		// New term reset
		if (term !== this.searchTerm) {
			this.searchTerm = term;
			this.searchIndex = -1;
		}

		let data = [];
		if (this.currentTab === 1) data = this.tier1;
		else if (this.currentTab === 2) data = this.tier2;
		else data = this.tier3;

		if (data.length === 0) return;

		let found = false;
		let start = this.searchIndex + 1;

		if (start >= data.length) {
			if (confirm("End of list reached. Continue from top?")) {
				start = 0;
			} else {
				return;
			}
		}

		for (let i = start; i < data.length; i++) {
			const item = data[i];
			// Search in full match result (data object)
			// usage of JSON.stringify to catch all field values
			const content = JSON.stringify(item).toLowerCase();

			if (content.includes(term)) {
				this.searchIndex = i;
				const $el = $('#matches-list .match-item').eq(i);
				this.scrollToMatch($el);
				found = true;
				break;
			}
		}

		if (!found) {
			if (start > 0) {
				if (confirm("Reached end. Continue from top?")) {
					this.searchIndex = -1;
					this.findNext();
					return;
				}
			} else {
				alert("No matches found.");
			}
		}
	},

	scrollToMatch: function ($el) {
		// Highlight
		$('.match-item').removeClass('search-highlight');
		$el.addClass('search-highlight');

		// Scroll
		$el[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
};

$(document).ready(() => App.init());
