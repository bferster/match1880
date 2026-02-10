// Imports removed to rely on Global CDN scripts (Vanilla JS/jQuery compatible)

import { jaroWinkler, getBlockKeys, calculateScore } from './match.js';
import { findRelations } from './relations.js';

///////////////////////////////////////////////////////////////////////////////
// APP LOGIC
///////////////////////////////////////////////////////////////////////////////

const App = {
	data1870: [],
	data1880: [],
	verData: [],

	map1870: new Map(),
	map1880: new Map(),

	nextEgoId: 1,

	blocks: new Map(),
	candidates: [],

	// Tiered results
	tier1: [],
	tier2: [],
	tier3: [],
	currentTab: 1,

	mode: 'match',
	dsA: [], dsB: [],
	mapA: null, mapB: null,

	searchIndex: -1,
	searchTerm: '',

	log: function (msg)                                                            // LOG
	{
		// Console only log as requested
		console.log(`[App] ${msg}`);
	},

	setStatus: function (id, status, type)                                         // SET UI BADGE
	{
		const $el = $(`#${id}`);
		$el.text(status);
		$el.attr('class', `badge ${type}`);
	},

	progress: function (val, text)                                                 // SET PROGRESS
	{
		$('#progress-bar').css('width', `${val}%`);
		$('#progress-text').text(`${Math.round(val)}% - ${text}`);
		console.log(`[Progress] ${Math.round(val)}% - ${text}`);
	},

	init: function ()                                                              // INITIALIZE
	{
		app = this;
		this.log("Application initialized on port 5500.");
		this.log("Loading datasets in background...");

		Promise.all([
			this.fetchCSV('ALB_CN_1870.csv'),
			this.fetchCSV('ALB_CN_1880.csv'),
			this.fetchCSV('ALB_VER.csv')
		]).then(results => {
			this.data1870 = results[0];
			this.data1880 = results[1];
			this.verData = results[2];                                             // STORE VERIFIED DATA

			// Calculate nextEgoId
			let maxId = 0;
			if (this.verData && this.verData.length > 0) {
				this.verData.forEach(row => {
					const id = parseInt(row.egoid);
					if (!isNaN(id) && id > maxId) maxId = id;
				});
			}
			this.nextEgoId = maxId + 1;
			this.log(`Loaded Verified Data. Next Ego ID: ${this.nextEgoId}`);

			// Build Index Maps
			// Ensure line is string for consistency as CSV parsing might vary
			this.data1870.forEach((r, i) => this.map1870.set(String(r.line), i));
			this.data1880.forEach((r, i) => this.map1880.set(String(r.line), i));

			this.setStatus('st-1870', `Loaded (${this.data1870.length})`, 'ready');
			this.setStatus('st-1880', `Loaded (${this.data1880.length})`, 'ready');
			this.log("Data loaded. Ready to start.");

			$('#btn-run').prop('disabled', false);                                 // Enable run

		}).catch(err => {
			this.log("Error loading data: " + err);
		});


		$('#btn-run').on('click', () => {                                          // HANDLER: RUN
			$('#btn-run').prop('disabled', true);
			$('#sel-mode').prop('disabled', true);

			this.mode = $('#sel-mode').val();
			this.log(`Starting process in mode: ${this.mode}`);

			$('#progress-container').removeClass('hidden');
			// Hide previous results if any
			$('#results-panel').addClass('hidden');
			$('#context-panel').addClass('hidden');

			// Update UI Labels based on mode
			if (this.mode === 'dedup') {
				$('#ctx-head-top').text('1870 Record A (±12 Rows)');
				$('#ctx-head-btm').text('1870 Record B (±12 Rows)');
			} else if (this.mode === 'relations') {
				$('#ctx-head-top').text('Relation Details');
				$('#ctx-head-btm').text('1880 Record');
			} else {
				$('#ctx-head-top').text('1870 Census Context (±12 Rows)');
				$('#ctx-head-btm').text('1880 Census Context (±12 Rows)');
			}

			setTimeout(() => this.startBlocking(), 100);
		});

		$('#btn-save').on('click', () => this.exportCSV());                        // HANDLER: SAVE

		$('.tab-btn').on('click', (e) => {                                         // HANDLER: TAB
			const t = $(e.currentTarget).data('tab');
			this.switchTab(t);
		});

		$('#btn-search').on('click', () => this.findNext());                       // HANDLER: SEARCH
		$('#inp-search').on('keypress', (e) => {
			if (e.which === 13) this.findNext();
		});



		// Delegation for match item clicks
		$('#st-1870').on('click', () => $('#file-1870').trigger('click'));         // CLICK 1870
		$('#st-1880').on('click', () => $('#file-1880').trigger('click'));         // CLICK 1880

		$('#file-1870').on('change', (e) => this.loadLocalFile(e, 1870));          // LOAD 1870
		$('#file-1880').on('change', (e) => this.loadLocalFile(e, 1880));          // LOAD 1880

		$(document).on('click', '.match-item', (e) => {                            // HANDLER: MATCH CLICK
			// Visual feedback
			$('.match-item').removeClass('active-match');
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

	loadLocalFile: function (e, year)                                              // LOAD LOCAL FILE
	{
		const file = e.target.files[0];
		if (!file) return;

		this.setStatus(`st-${year}`, "Parsing...", "score-med");

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				const data = results.data;
				if (year === 1870) {
					this.data1870 = data;
					this.map1870 = new Map();
					this.data1870.forEach((r, i) => this.map1870.set(String(r.line), i));
				} else {
					this.data1880 = data;
					this.map1880 = new Map();
					this.data1880.forEach((r, i) => this.map1880.set(String(r.line), i));
				}

				this.setStatus(`st-${year}`, `Loaded (${data.length})`, 'ready');
				this.log(`Loaded ${year} data from file: ${file.name} (${data.length} records)`);

				// Reset existing search/results state if needed?
				// For now, allow re-run.
				$('#btn-run').prop('disabled', false);
			}
		});
	},

	fetchCSV: function (url)                                                       // LOAD CSV
	{
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

	startBlocking: function ()                                                     // PHASE 1: GENERATE BLOCKS
	{
		if (this.mode === 'relations') {
			findRelations(this);
			return;
		}

		this.log("Phase 1: Blocking...");
		this.progress(10, "Generating blocks");

		// Set active datasets
		if (this.mode === 'dedup') {
			this.dsA = this.data1870;
			this.dsB = this.data1870;                                              // Self match
			this.mapA = this.map1870;
			this.mapB = this.map1870;
		} else {
			this.dsA = this.data1870;
			this.dsB = this.data1880;
			this.mapA = this.map1870;
			this.mapB = this.map1880;
		}

		// Blocking is fast enough relative to scoring
		this.blocks = new Map();

		// Dataset A
		this.dsA.forEach(row => {
			const keys = getBlockKeys(row);
			keys.forEach(k => this.addToBlock(k, row, 70));                        // Using 70 as "List A"
		});

		// Dataset B
		// In dedup mode, we scan same data again for B list. 
		// Yes, we will have every item in both lists.
		this.dsB.forEach(row => {
			const keys = getBlockKeys(row);
			keys.forEach(k => this.addToBlock(k, row, 80));                        // Using 80 as "List B"
		});

		this.log(`Generated ${this.blocks.size} blocks.`);
		setTimeout(() => this.startScoring(), 100);
	},

	addToBlock: function (key, record, type)                                       // ADD TO BLOCK MAP
	{
		if (!this.blocks.has(key)) this.blocks.set(key, { list70: [], list80: [] });
		const b = this.blocks.get(key);
		if (type === 70) b.list70.push(record);
		else b.list80.push(record);
	},

	startScoring: function ()                                                      // PHASE 2: SCORE PAIRS
	{
		this.log("Phase 2: Scoring Candidates...");
		this.progress(30, "Scoring candidates");

		const blockKeys = Array.from(this.blocks.keys());
		const totalBlocks = blockKeys.length;
		const candidateMap = new Map();

		let processed = 0;
		const CHUNK_SIZE = 1000;                                                   // Process in chunks

		const processChunk = () => {
			const limit = Math.min(processed + CHUNK_SIZE, totalBlocks);

			for (let i = processed; i < limit; i++) {
				const key = blockKeys[i];
				const block = this.blocks.get(key);

				if (block.list70.length > 0 && block.list80.length > 0) {
					for (const r70 of block.list70) {
						for (const r80 of block.list80) {
							// If Deduping, skip self-matches and duplicates (A-B vs B-A)
							// We only want r70.line < r80.line
							if (this.mode === 'dedup') {
								if (parseInt(r70.line) >= parseInt(r80.line)) continue;
							}

							const pairId = `${r70.line}-${r80.line}`;
							if (candidateMap.has(pairId)) continue;                // Skip duplicates

							const res = calculateScore(r70, r80, this.mode);

							let tier = 0;
							if (this.mode === 'dedup') {
								// Dedup Tiers: >150 (T1), 140-149 (T2), 130-139 (T3)
								if (res.score > 150) tier = 1;
								else if (res.score >= 140) tier = 2;
								else if (res.score >= 130) tier = 3;
							} else {
								// Match Tiers: >90 (T1), 80-90 (T2), 60-79 (T3)
								if (res.score > 90) tier = 1;
								else if (res.score >= 80) tier = 2;
								else if (res.score >= 60) tier = 3;
							}

							if (tier > 0) {
								candidateMap.set(pairId, {
									r70, r80, score: res.score, details: res.details, tier
								});
							}
						}
					}
				}
			}

			processed = limit;
			const pct = 30 + (processed / totalBlocks) * 40;
			if (processed % 5000 === 0) this.progress(pct, `Scoring... (${processed}/${totalBlocks})`);

			if (processed < totalBlocks) {
				setTimeout(processChunk, 0);                                       // Yield
			} else {
				this.candidates = Array.from(candidateMap.values());
				this.log(`Scored ${this.candidates.length} candidate pairs.`);
				// Household Boosting Commented out in Skill. Proceed to Resolution directly.
				setTimeout(() => this.startResolution(), 100);
			}
		};

		processChunk();
	},


	startResolution: function ()                                                   // PHASE 4: RESOLVE
	{
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
			// In dedup mode, we also want unique pairings. 
			if (used70.has(id70) || used80.has(id80)) continue;                    // Skip duplicates

			used70.add(id70);
			used80.add(id80);

			if (cand.tier === 1) this.tier1.push(cand);
		}

		this.log(`Phase 4 Resolved: ${this.tier1.length} Tier 1 anchors identified.`);

		// Household boosting only for cross-census match usually, but prompt didn't exclude it.
		// However, for duplicates within same dataset, household boosting might be valid (whole family duplicated).
		if ($('#chk-boost').is(':checked') && this.mode !== 'dedup') {
			setTimeout(() => this.startHouseholdBoosting(), 100);
		} else {
			this.log("Skipping Household Context Boosting.");
			setTimeout(() => this.finalizeResults(), 100);
		}
	},

	startHouseholdBoosting: function ()                                            // PHASE 5: HOUSEHOLD BOOST
	{
		this.log("Phase 5: Household Context Boosting...");
		this.progress(80, "Context boosting");

		// 1. Index Households
		const houseA = new Map();
		const houseB = new Map();

		// Generic Family Key Helper
		const getFamKey = (r) => r.family;

		this.dsA.forEach(r => {
			const k = getFamKey(r);
			if (k) {
				if (!houseA.has(k)) houseA.set(k, []);
				houseA.get(k).push(r);
			}
		});

		this.dsB.forEach(r => {
			const k = getFamKey(r);
			if (k) {
				if (!houseB.has(k)) houseB.set(k, []);
				houseB.get(k).push(r);
			}
		});

		// 2. Use Tier 1 matches from Phase 4 as Anchors
		const anchors = this.tier1;

		// Map to track all candidates
		const candidateMap = new Map();
		this.candidates.forEach(c => candidateMap.set(`${c.r70.line}-${c.r80.line}`, c));

		let boosted = 0;

		anchors.forEach(anchor => {
			const kA = getFamKey(anchor.r70);
			const kB = getFamKey(anchor.r80);

			const hA = houseA.get(kA) || [];
			const hB = houseB.get(kB) || [];

			hA.forEach(memberA => {
				if (memberA.line === anchor.r70.line) return;

				hB.forEach(memberB => {
					if (memberB.line === anchor.r80.line) return;

					// In dedup mode, skip self/reverse
					if (this.mode === 'dedup' && parseInt(memberA.line) >= parseInt(memberB.line)) return;

					const pairId = `${memberA.line}-${memberB.line}`;
					let candidate = candidateMap.get(pairId);

					if (!candidate) {
						const res = calculateScore(memberA, memberB, this.mode);
						if (res.score > 20) {
							candidate = { r70: memberA, r80: memberB, score: res.score, details: res.details, tier: 0 };
						} else {
							return;
						}
					}

					let bonus = 0;
					let reasons = [];

					// Head of household name match: +20 points
					// Normalize relation checks
					const relB = (memberB.relation || '').toLowerCase();
					if (relB === 'self' || relB === 'head') {
						if (jaroWinkler(memberA.full_name, memberB.full_name) > 0.9) {
							bonus += 20;
							reasons.push("Head Match");
						}
					}

					// Spouse match (opposite gender, similar age): +10 points
					if (memberA.gender !== memberB.gender) {
						bonus += 10;
						reasons.push("Spouse/Context");
					}

					// Child match (using 1880 relation field logic, or generic parent/child logic if available)
					// In dedup (1870-1870), relation fields might not be 'son/dau' standard if 1870 data is different.
					// But we use 'relation' field.
					if (relB.includes('son') || relB.includes('dau') || relB.includes('child')) {
						const childAge = parseInt(memberB.age) || 0;
						if (childAge > 10) {
							bonus += 10;
							reasons.push("Child Context");
						}
					}

					// Parent match: +10 points
					if (relB.includes('father') || relB.includes('mother')) {
						bonus += 10;
						reasons.push("Parent Context");
					}

					// Co-residence bonus: +5 points
					bonus += 5;
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

	finalizeResults: function ()                                                   // RESULTS
	{
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

			if (this.mode === 'dedup') {
				// Dedup: ID space is shared. Ensure unique row usage globally.
				if (used70.has(id70) || used70.has(id80)) continue;
			}
			else if (this.mode === 'match') {
				// Match: Distinct ID spaces.
				if (used70.has(id70) || used80.has(id80)) continue;
			}
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
		$('#sel-mode').prop('disabled', false);

		// Update counts
		$('#cnt-1').text(this.tier1.length);
		$('#cnt-2').text(this.tier2.length);
		$('#cnt-3').text(this.tier3.length);

		this.switchTab(1);
	},

	switchTab: function (t)                                                        // SWITCH TAB
	{
		this.currentTab = parseInt(t);
		$('.tab-btn').removeClass('active');
		$(`.tab-btn[data-tab="${t}"]`).addClass('active');
		this.renderMatches();
	},


	getHouseholdMembers: function (record, dataset)                                // GET HOUSEHOLD
	{
		const famKey = record.family;
		if (!famKey) return '(No Family ID)';
		// Identify Map
		let map = this.map1870;
		if (dataset === this.data1880) map = this.map1880;

		const trueIdx = map.get(String(record.line));
		if (trueIdx === undefined) return '(Index Error)';

		const members = [];

		// Scan up
		for (let i = trueIdx - 1; i >= 0; i--) {
			const r = dataset[i];
			const k = r.family;
			if (k !== famKey) break;
			if (r.full_name === record.full_name) continue;
			members.unshift(r.full_name);
		}

		// Scan down
		for (let i = trueIdx + 1; i < dataset.length; i++) {
			const r = dataset[i];
			const k = r.family;
			if (k !== famKey) break;
			if (r.full_name === record.full_name) continue;
			members.push(r.full_name);
		}


		if (members.length === 0) return '<em>(No other members)</em>';
		return members.join(', ');
	},

	renderMatches: function ()                                                     // RENDER UI
	{
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
				let html = '';

				if (this.mode === 'relations') {
					console.log(data);
					// SPECIAL RENDERER FOR RELATIONS

					data.forEach(m => {
						// m.head = 1880 Head Record
						// m.relation = 1870 Match Record
						// m.details = "Wife Found", etc.

						const rHead = m.head || m.r1880; // Fallback
						const rRel = m.relation || m.rRelation;

						if (!rHead) return; // Should not happen
						if (rRel.egoid === rHead.egoid) return;					// PROMPT: "for each relation that is not match to itself"


						let cls = 'score-high'; // Relations are usually high confidence by definition of the algo

						html += `
						<div class="match-item" data-l70="${rRel.line || 0}" data-l80="${rHead.line || 0}">
                             <div class="match-header">
                                <span class="badge ${cls}" style="font-size:1.1em">REL</span>
                            </div>
                            <div class="match-grid">
                                <div class="rec">
                                    <span>1880 Head / Context</span>
                                    <strong>${rHead.full_name}</strong>
                                    <span>ID: ${rHead.egoid}</span>
                                    <span>Age: ${rHead.age} | ${rHead.occupation}</span>
                                    <div style="margin-top:4px; font-size:0.9em; color:#666">
                                    	<em>${m.details}</em>
                                    </div>
                                </div>
                                <div class="rec">
                                    <span>1870 Relation Found</span>
                                    <strong>${rRel.full_name || 'Unknown'}</strong>
                                    <span>ID: ${rRel.egoid || '?'}</span>
                                    <span>Age: ${rRel.age} | ${rRel.occupation}</span>
                                    <span>Relation: ${rRel.relation || '-'}</span>
                                </div>
                            </div>
                        </div>`;
					});
				} else {
					// STANDARD RENDERER (Match / Dedup)
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
										<span>${this.mode === 'dedup' ? 'Rec A' : '1870'} (Line ${m.r70.line})</span>
										<strong>${m.r70.full_name}</strong>
										<span>Age: ${m.r70.age} | Born: ${m.r70.birth_year} | ${m.r70.birth_place} | ${m.r70.race}/${m.r70.gender}</span>
										<span>Occ: ${m.r70.occupation}</span>
										<span>Household: ${this.getHouseholdMembers(m.r70, this.dsA)}</span>
									</div>
									<div class="rec">
										<span>${this.mode === 'dedup' ? 'Rec B' : '1880'} (Line ${m.r80.line})</span>
										<strong>${m.r80.full_name}</strong>
										<span>Age: ${m.r80.age} | Born: ${m.r80.birth_year} | ${m.r80.birth_place} | ${m.r80.race}/${m.r80.gender}</span>
										<span>Occ: ${m.r80.occupation}</span>
										<span>Household: ${this.getHouseholdMembers(m.r80, this.dsB)}</span>
									</div>
								</div>
								<div class="evidence-list">
									${detailsHtml}
								</div>
							</div>
						`;
					});
				}
				$list.html(html);
			}

			// Hide spinner, show list
			$spinner.addClass('hidden');
			$list.removeClass('hidden');
			$list.scrollTop(0);
		}, 50);
	},

	showContext: function (l70, l80)                                               // DISPLAY CONTEXT
	{
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
			const end = Math.min(data.length, centerIdx + 12 + 1);                 // +1 because slice is exclusive

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

			// Auto-scroll to center (50% of content - half of viewport)
			// Small delay to ensure render
			setTimeout(() => {
				const scrollHeight = $box[0].scrollHeight;
				const clientHeight = $box.innerHeight();
				$box.scrollTop((scrollHeight / 2) - (clientHeight / 2));
			}, 0);
		};

		// Use active datasets (set in startBlocking)
		// If page reload happened, these might be empty? 
		// But init loads data1870/80. 
		// If dedup mode, mapA = map1870, mapB = map1870.
		// If match mode, mapA = map1870, mapB = map1880.

		// Fallback if not set (e.g. initial load)
		let setA = this.dsA.length ? this.dsA : this.data1870;
		let setB = this.dsB.length ? this.dsB : this.data1880;
		let mapA = this.mapA || this.map1870;
		let mapB = this.mapB || this.map1880;

		renderBox(setA, mapA, l70, '#context-1870');
		renderBox(setB, mapB, l80, '#context-1880');
	},

	exportCSV: function ()                                                         // EXPORT
	{
		this.log("Exporting Results...");

		if (this.mode === 'dedup') {
			// DEDUP MODE: theLine, theDupe, theScore (ALL TIERS)
			const changes = [];
			const allTiers = [...this.tier1, ...this.tier2, ...this.tier3];

			allTiers.forEach(m => {
				changes.push({
					theLine: m.r70.line,
					theDupe: m.r80.line,
					theScore: m.score
				});
			});
			this.log(`Exporting ${changes.length} duplicate pairs (All Tiers).`);

			if (changes.length === 0) {
				alert("No matches found to export.");
				return;
			}

			const csv = Papa.unparse(changes);
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", "duplicates.csv");
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

		} else {
			// MATCH MODE: Update 1880 egoid column & Copy to Clipboard
			const cutoffStr = prompt("Enter cutoff score (e.g. 90):", "90");
			if (cutoffStr === null) return;                                        // Cancelled
			const cutoff = parseInt(cutoffStr, 10) || 90;

			this.log(`Applying cutoff ${cutoff} to matches...`);

			// 1. Build Index of Matches meeting cutoff
			// Map: Line 1880 -> Egoid 1870
			const matches80 = new Map();
			const allTiers = [...this.tier1, ...this.tier2, ...this.tier3];

			let matchCount = 0;
			allTiers.forEach(m => {
				if (m.score >= cutoff) {
					// Check if r70 has egoid
					if (m.r70.egoid) {
						// Store the 1870 egoid mapped to the 1880 line with "1e" prefix
						matches80.set(String(m.r80.line), '1e' + m.r70.egoid);
						matchCount++;
					}
				}
			});

			this.log(`Found ${matchCount} matches above score ${cutoff} with valid source IDs.`);

			// 2. Update 1880 Dataset & Collect EgoIDs
			// First, clear ALL egoid values in 1880 dataset as requested
			this.data1880.forEach(r => r.egoid = '');

			// We iterate the original 1880 list to preserve order
			const egoIdParams = [];

			this.data1880.forEach(r80 => {
				const lineKey = String(r80.line);
				if (matches80.has(lineKey)) {
					// Update the record in memory (optional, but requested "add the egoid... to the row")
					r80.egoid = matches80.get(lineKey);
				}
				// Collect for clipboard - ensure string
				egoIdParams.push(r80.egoid || "");
			});

			// 3. Copy to Clipboard
			const clipboardText = egoIdParams.join('\n');

			// Try navigator first
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(clipboardText).then(() => {
					alert(`Success! Copied ${egoIdParams.length} rows (Column: egoid) to clipboard.\nMatches applied: ${matchCount}`);
				}).catch(err => {
					console.error("Clipboard write failed", err);
					this.fallbackCopy(clipboardText, egoIdParams.length);
				});
			} else {
				this.fallbackCopy(clipboardText, egoIdParams.length);
			}
		}
	},

	fallbackCopy: function (text, count) {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		document.body.appendChild(textarea);
		textarea.select();
		try {
			document.execCommand('copy');
			alert(`Copied to clipboard (fallback). Rows: ${count}`);
		} catch (err) {
			console.error("Fallback copy failed", err);
			alert("Failed to copy to clipboard.");
		}
		document.body.removeChild(textarea);
	},

	prefixKeys: function (obj, prefix)                                             // PREFIX KEYS
	{
		const newObj = {};
		for (const k in obj) {
			newObj[`${prefix}${k}`] = obj[k];
		}
		return newObj;
	},

	findNext: function ()                                                          // SEARCH MATCHES
	{
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
			console.log(item);
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

	scrollToMatch: function ($el)                                                  // SCROLL TO MATCH
	{
		// Highlight
		$('.match-item').removeClass('search-highlight');
		$el.addClass('search-highlight');

		// Scroll
		$el[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
};

$(document).ready(() => App.init());
