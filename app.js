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
		last80: get(r1880, 'last_name') || get(r1880, 'last-_name'), // handle typo
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

	// Penalties
	if (s.gen70 !== s.gen80) { score -= 50; details.push("Gender mismatch"); }
	if (s.age80 < s.age70) { score -= 30; details.push("Age regression"); }
	if (s.bpl70 && s.bpl80 && s.bpl70 !== 'VA' && s.bpl80 !== 'VA' && s.bpl70 !== s.bpl80) {
		score -= 15; details.push("Contradictory birth place");
	}

	// Exact Matches
	if (s.last70 === s.last80 && s.last70) { score += 15; details.push("Exact last"); }
	if (s.first70 === s.first80 && s.first70) { score += 15; details.push("Exact first"); }
	if (s.mid70 === s.mid80 && s.mid70) { score += 8; details.push("Exact middle"); }
	if (s.by70 === s.by80 && s.by70) { score += 10; details.push("Exact birth year"); }

	const ageDiff = s.age80 - s.age70;
	if (ageDiff >= 9 && ageDiff <= 11) { score += 10; details.push("Age diff 9-11"); }
	else if (ageDiff >= 8 && ageDiff <= 12) { score += 6; details.push("Age diff 8-12"); }

	if (s.gen70 === s.gen80) { score += 10; details.push("Gender match"); }
	if (s.race70 === s.race80) { score += 8; details.push("Race match"); }
	if (s.bpl70 === s.bpl80 && s.bpl70) { score += 12; details.push("Birth place match"); }

	// Finding Aides
	if (s.ny_last70 === s.ny_last80 && s.ny_last70) { score += 10; details.push("NYSIIS last"); }
	// Normal first name check (raw check)
	if (get(r1870, 'norm_first_name') === get(r1880, 'norm_first_name')) { score += 8; details.push("Norm first"); }
	if (s.by10_70 === s.by10_80 && s.by10_70) { score += 7; details.push("Birth date 10"); }
	if (s.norm_occ70 === s.norm_occ80 && s.norm_occ70) { score += 5; details.push("Occupation match"); }

	// Fuzzy
	const jwLast = jaroWinkler(s.last70, s.last80);
	if (jwLast >= 0.85 && s.last70 !== s.last80) { score += 8; details.push(`Fuzzy last ${jwLast.toFixed(2)}`); }

	const jwFirst = jaroWinkler(s.first70, s.first80);
	if (jwFirst >= 0.85 && s.first70 !== s.first80) { score += 8; details.push(`Fuzzy first ${jwFirst.toFixed(2)}`); }

	const byDiff = Math.abs(s.by70 - s.by80);
	if (byDiff > 0 && byDiff <= 2) { score += 7; details.push("Birth year ±2"); }
	else if (byDiff > 2 && byDiff <= 5) { score += 4; details.push("Birth year ±5"); }

	if ((s.race70 === 'B' && s.race80 === 'M') || (s.race70 === 'M' && s.race80 === 'B')) {
		score += 6; details.push("Race B/M");
	}

	return { score, details: details.join(", ") };
}


// ============================================================================
// APP LOGIC
// ============================================================================

const App = {
	data1870: [],
	data1880: [],
	blocks: new Map(),
	candidates: [],

	// Tiered results
	tier1: [],
	tier2: [],
	tier3: [],
	currentTab: 1,

	log: function (msg) {
		const $log = $('#log-window');
		$log.append(`<div>> ${msg}</div>`);
		$log.scrollTop($log[0].scrollHeight);
		console.log(msg);
	},

	setStatus: function (id, status, type) {
		const $el = $(`#${id}`);
		$el.text(status);
		$el.attr('class', `badge ${type}`);
	},

	progress: function (val, text) {
		$('#progress-bar').css('width', `${val}%`);
		$('#progress-text').text(`${Math.round(val)}% - ${text}`);
	},

	init: function () {
		this.log("Application initialized on port 5500.");
		this.log("Loading datasets in background...");

		Promise.all([
			this.fetchCSV('ALB_CN_1870.csv'),
			this.fetchCSV('ALB_CN_1880.csv')
		]).then(results => {
			this.data1870 = results[0];
			this.data1880 = results[1];

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
			setTimeout(() => this.startBlocking(), 100);
		});

		$('#btn-save').on('click', () => this.exportCSV());

		$('.tab-btn').on('click', (e) => {
			const t = $(e.currentTarget).data('tab');
			this.switchTab(t);
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
							if (res.score >= 35) {
								// Assign Tier
								let tier = 3;
								if (res.score >= 90) tier = 1;
								else if (res.score >= 80) tier = 2;
								else if (res.score >= 50) tier = 3;
								else tier = 0; // Below threshold

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
			this.progress(pct, `Scoring... (${processed}/${totalBlocks})`);

			if (processed < totalBlocks) {
				setTimeout(processChunk, 0);
			} else {
				this.candidates = Array.from(candidateMap.values());
				this.log(`Scored ${this.candidates.length} candidate pairs.`);
				setTimeout(() => this.startResolution(), 100);
			}
		};

		processChunk();
	},

	startResolution: function () {
		this.log("Phase 3: Resolving Conflicts...");
		this.progress(70, "Resolving conflicts");

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
			else this.tier3.push(cand);
			count++;
		}

		this.log(`Resolved to ${count} unique matches.`);
		this.log(`Tier 1: ${this.tier1.length}, Tier 2: ${this.tier2.length}, Tier 3: ${this.tier3.length}`);

		this.progress(100, "Done");

		$('#results-panel').removeClass('hidden');
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
				// Use document fragment for perf if possible, but string concat is okay for this size
				let html = '';
				data.forEach(m => {
					let cls = 'score-low';
					if (m.score >= 80) cls = 'score-high';
					else if (m.score >= 50) cls = 'score-med';

					const detailsHtml = (m.details || '').split(', ').map(d => `<span class="ev-tag">${d}</span>`).join('');

					html += `
                        <div class="match-item">
                            <div class="match-header">
                                <span class="badge ${cls}" style="font-size:1.1em">${m.score}</span>
                                <span class="evidence-list">${detailsHtml}</span>
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
                        </div>
                    `;
				});
				$list.html(html);
			}

			// Hide spinner, show list
			$spinner.addClass('hidden');
			$list.removeClass('hidden');
		}, 50);
	},

	exportCSV: function () {
		this.log("Exporting CSV...");
		// Combine all tiers
		const allMatches = [...this.tier1, ...this.tier2, ...this.tier3];

		const data = allMatches.map(m => {
			const row = {
				match_score: m.score,
				line_1870: m.r70.line,
				...this.prefixKeys(m.r70, '1870_'),
				line_1880: m.r80.line,
				...this.prefixKeys(m.r80, '1880_'),
				match_evidence: m.details
			};
			return row;
		});

		const csv = Papa.unparse(data);
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", "matched.csv");
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	},

	prefixKeys: function (obj, prefix) {
		const newObj = {};
		for (const k in obj) {
			newObj[`${prefix}${k}`] = obj[k];
		}
		return newObj;
	}
};

$(document).ready(() => App.init());
