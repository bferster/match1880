import { jaroWinkler, getBlockKeys, calculateScore, buildNameFrequencies } from './match.js';
import { NormalizeSourceData } from './normalize.js';

///////////////////////////////////////////////////////////////////////////////
// APP LOGIC
///////////////////////////////////////////////////////////////////////////////

const App = {
	dataVerified: [],
	data1880: [],

	mapVerified: new Map(),
	map1880: new Map(),

	nextEgoId: 1,

	blocks: new Map(),
	candidates: [],

	// Tiered results
	tier1: [],
	tier2: [],
	tier3: [],
	currentTab: 1,

	confidences: [],
	selectedPair: null,

	mode: 'match',
	dsA: [], dsB: [],
	mapA: null, mapB: null,

	searchIndex: -1,
	searchTerm: '',

	matchOptions: {
		felengi: true,
		exactName: true,
		nysiis: true,
		nickname: true,
		soundex: true,
		occupation: true,
		gender: true,
		race: true,
		head: true,
		spouse: true,
		child: true,
		parent: true,
		household: true,
		birthYearLimit: 'any'
	},

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
		this.log("Loading datasets in background...");

		Promise.all([
			this.fetchCSV('https://docs.google.com/spreadsheets/d/11NG2LSYdk8rW83vn0J9AUZcg5xw7TXbLYvPPvMrbIyk/export?format=csv'), // Verified
			this.fetchCSV('https://docs.google.com/spreadsheets/d/1W4Z4mu9LqnrxUhpAi5r2nxJgNFW2HLUhMbAohDzR7Qo/export?format=csv')  // 1880
		]).then(results => {
			this.dataVerified = results[0].map(r => NormalizeSourceData(r));       // Normalize verified
			this.data1880 = results[1].map(r => NormalizeSourceData(r));           // Normalize 1880

			// Build Index Maps
			this.dataVerified.forEach((r, i) => this.mapVerified.set(String(r.line), i));
			this.data1880.forEach((r, i) => this.map1880.set(String(r.line), i));

			this.setStatus('st-verified', `Loaded (${this.dataVerified.length})`, 'ready');
			this.setStatus('st-1880', `Loaded (${this.data1880.length})`, 'ready');
			this.log("Data loaded. Ready to start.");

			$('#btn-run').prop('disabled', false);                                 // Enable run

		}).catch(err => {
			this.log("Error loading data: " + err);
		});


		$('#btn-run').on('click', () => {                                          // HANDLER: RUN
			$('#btn-run').prop('disabled', true);                                  // Disable button
			this.selectedPair = null;                                                // Clear selected
			$('#confidence-container').addClass('hidden');                         // Hide confidence
			$('#btn-save').addClass('hidden');                                     // Hide save
			$('#btn-save-confidences').addClass('hidden');                         // Hide save conf
			$('#progress-container').removeClass('hidden');                        // Show progress
			$('#results-panel').addClass('hidden');                                // Hide results
			$('#context-panel').addClass('hidden');                                // Hide context
			$('#ctx-head-top').text('Verified Census Context (±12 Rows)');         // Top context label
			$('#ctx-head-btm').text('1880 Census Context (±12 Rows)');             // Bottom context label
			setTimeout(() => this.startBlocking(), 100);                             // Start blocking
		});

		$('input[name="confidence-opt"]').on('change', (e) => {                    // RADIO ON CHANGE
			if (!this.selectedPair) return;                                        // Return if no pair
			const conf = parseInt($(e.currentTarget).val());                         // Parse int
			if (isNaN(conf) || conf < 0 || conf > 3) return;                       // Range check
			const line1870 = this.selectedPair.rVerified.line;                       // 1870 line
			const line1880 = this.selectedPair.r80.line;                             // 1880 line
			let existing = this.confidences.find(c => c["1870_line"] == line1870 && c["1880_line"] == line1880); // Find existing
			if (existing) {
				existing.confidence = conf;                                          // Update confidence
				existing.score = this.selectedPair.score;                            // Update score
				console.log("Confidence row updated:", existing);                  // Log update
			} else {
				let row = {
					"1870_line": line1870,
					"1880_line": line1880,
					"score": this.selectedPair.score,
					"confidence": conf
				};
				this.confidences.push(row);                                        // Add to list
				console.log("Confidence row added:", row);                         // Log add
			}
		});

		$('#btn-save-confidences').on('click', () => this.exportConfidencesCSV());  // HANDLER: SAVE CONFIDENCES
		$('#btn-save').on('click', () => this.exportCSV());                        // HANDLER: SAVE
		$('.tab-btn').on('click', (e) => {                                         // HANDLER: TAB
			const t = $(e.currentTarget).data('tab');                                // Get tab
			this.switchTab(t);                                                     // Switch tab
		});

		$('#btn-options').on('click', () => {                                      // ON OPTIONS CLICK
			$('#chk-opt-felengi').prop('checked', this.matchOptions.felengi);      // Set felengi
			$('#chk-opt-exactname').prop('checked', this.matchOptions.exactName);  // Set exactName
			$('#chk-opt-nysiis').prop('checked', this.matchOptions.nysiis);        // Set nysiis
			$('#chk-opt-nickname').prop('checked', this.matchOptions.nickname);    // Set nickname
			$('#chk-opt-soundex').prop('checked', this.matchOptions.soundex);      // Set soundex
			$('#chk-opt-occupation').prop('checked', this.matchOptions.occupation);// Set occupation
			$('#chk-opt-gender').prop('checked', this.matchOptions.gender);        // Set gender
			$('#chk-opt-race').prop('checked', this.matchOptions.race);            // Set race
			$('#chk-opt-head').prop('checked', this.matchOptions.head);            // Set head
			$('#chk-opt-spouse').prop('checked', this.matchOptions.spouse);        // Set spouse
			$('#chk-opt-child').prop('checked', this.matchOptions.child);          // Set child
			$('#chk-opt-parent').prop('checked', this.matchOptions.parent);        // Set parent
			$('#chk-opt-household').prop('checked', this.matchOptions.household);  // Set household
			$(`input[name="rad-opt-by"][value="${this.matchOptions.birthYearLimit}"]`).prop('checked', true); // Set birthYear
			$('#el-options-modal').css('display', 'flex');                         // Show modal
		});

		$('#el-options-close, #el-options-cancel').on('click', () => {             // ON CLOSE/CANCEL
			$('#el-options-modal').hide();                                         // Hide modal
		});

		$('#el-options-modal').on('click', (e) => {                                // ON MODAL BG CLICK
			if (e.target === e.currentTarget) $('#el-options-modal').hide();       // Hide if bg
		});

		$('#el-options-toggle-all').on('click', () => {                            // ON TOGGLE ALL
			const $chks = $('#el-options-modal input[type="checkbox"]');             // Get checkboxes
			const allChecked = $chks.filter(':checked').length === $chks.length;     // Check state
			$chks.prop('checked', !allChecked);                                    // Toggle state
		});

		$('#el-options-save').on('click', () => {                                  // ON SAVE OPTIONS
			this.matchOptions.felengi = $('#chk-opt-felengi').is(':checked');        // Read felengi
			this.matchOptions.exactName = $('#chk-opt-exactname').is(':checked');    // Read exactName
			this.matchOptions.nysiis = $('#chk-opt-nysiis').is(':checked');          // Read nysiis
			this.matchOptions.nickname = $('#chk-opt-nickname').is(':checked');      // Read nickname
			this.matchOptions.soundex = $('#chk-opt-soundex').is(':checked');        // Read soundex
			this.matchOptions.occupation = $('#chk-opt-occupation').is(':checked');  // Read occupation
			this.matchOptions.gender = $('#chk-opt-gender').is(':checked');          // Read gender
			this.matchOptions.race = $('#chk-opt-race').is(':checked');              // Read race
			this.matchOptions.head = $('#chk-opt-head').is(':checked');              // Read head
			this.matchOptions.spouse = $('#chk-opt-spouse').is(':checked');          // Read spouse
			this.matchOptions.child = $('#chk-opt-child').is(':checked');            // Read child
			this.matchOptions.parent = $('#chk-opt-parent').is(':checked');          // Read parent
			this.matchOptions.household = $('#chk-opt-household').is(':checked');    // Read household
			this.matchOptions.birthYearLimit = $('input[name="rad-opt-by"]:checked').val(); // Read birthYear
			$('#el-options-modal').hide();                                         // Hide modal
		});

		$('#btn-search').on('click', () => this.findNext());                       // HANDLER: SEARCH
		$('#inp-search').on('keypress', (e) => {                                   // SEARCH KEYPRESS
			if (e.which === 13) this.findNext();                                   // Enter key
		});

		$('#st-verified').on('click', () => $('#file-verified').trigger('click')); // CLICK Verified
		$('#st-1880').on('click', () => $('#file-1880').trigger('click'));         // CLICK 1880

		$('#file-verified').on('change', (e) => this.loadLocalFile(e, 'verified')); // LOAD Verified
		$('#file-1880').on('change', (e) => this.loadLocalFile(e, 1880));          // LOAD 1880

		$(document).on('click', '.match-item', (e) => {                            // HANDLER: MATCH CLICK
			$('.match-item').removeClass('active-match');                          // Clear active class
			$(e.currentTarget).css('background-color', '#eff6ff');                 // Highlight row
			const lVer = parseInt($(e.currentTarget).data('lver'));                  // Verified line
			const l80 = parseInt($(e.currentTarget).data('l80'));                    // 1880 line
			let pair = this.candidates.find(c => parseInt(c.rVerified.line) === lVer && parseInt(c.r80.line) === l80); // Find pair
			if (!pair) {
				const allCands = [...this.tier1, ...this.tier2, ...this.tier3];     // All tiers
				pair = allCands.find(c => c.rVerified && c.r80 && parseInt(c.rVerified.line) === lVer && parseInt(c.r80.line) === l80); // Find match
			}
			if (pair) {
				this.selectedPair = {                                                // Save selected
					rVerified: pair.rVerified,
					r80: pair.r80,
					score: pair.score || 0
				};
				const existing = this.confidences.find(c => c["1870_line"] == pair.rVerified.line && c["1880_line"] == pair.r80.line); // Find existing
				if (existing) {
					$(`input[name="confidence-opt"][value="${existing.confidence}"]`).prop('checked', true); // Check confidence
				} else {
					$('input[name="confidence-opt"]').prop('checked', false);      // Clear confidence
				}
				$('#confidence-container').removeClass('hidden');                  // Show confidence UI
			}
			console.log(`[Context] Verified Match Line: ${lVer}`);                // Log line
			console.log(`[Context] 1880 Match Line: ${l80}`);                      // Log line
			this.showContext(lVer, l80);                                           // Show context
		});
	},

	loadLocalFile: function (e, type)                                              // LOAD LOCAL FILE
	{
		const file = e.target.files[0];
		if (!file) return;

		this.setStatus(`st-${type}`, "Parsing...", "score-med");

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				const data = results.data.map(r => NormalizeSourceData(r));    // Normalize loaded file
				if (type === 'verified') {
					this.dataVerified = data;
					this.mapVerified = new Map();
					this.dataVerified.forEach((r, i) => this.mapVerified.set(String(r.line), i));
				} else {
					this.data1880 = data;
					this.map1880 = new Map();
					this.data1880.forEach((r, i) => this.map1880.set(String(r.line), i));
				}

				this.setStatus(`st-${type}`, `Loaded (${data.length})`, 'ready');
				this.log(`Loaded ${type} data from file: ${file.name} (${data.length} records)`);

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
		this.log("Phase 1: Blocking...");                                          // Log start
		this.progress(10, "Generating blocks");                                    // Progress UI
		this.dsA = this.dataVerified;                                                // dsA is Verified
		this.dsB = this.data1880;                                                    // dsB is 1880
		this.mapA = this.mapVerified;                                                // mapA is Verified
		this.mapB = this.map1880;                                                    // mapB is 1880
		this.blocks = new Map();                                                     // Reset blocks
		this.dsA.forEach(row => {                                                    // Loop dsA
			const keys = getBlockKeys(row);                                          // Block keys
			keys.forEach(k => this.addToBlock(k, row, 'verified'));                  // Add to block A
		});
		this.dsB.forEach(row => {                                                    // Loop dsB
			const keys = getBlockKeys(row);                                          // Block keys
			keys.forEach(k => this.addToBlock(k, row, 80));                          // Add to block B
		});
		this.log(`Generated ${this.blocks.size} blocks.`);                         // Log blocks size
		setTimeout(() => this.startScoring(), 100);                                  // Start scoring
	},

	addToBlock: function (key, record, type)                                       // ADD TO BLOCK MAP
	{
		if (!this.blocks.has(key)) this.blocks.set(key, { listVerified: [], list80: [] });
		const b = this.blocks.get(key);                                              // Get block
		if (type === 'verified') b.listVerified.push(record);                      // Add verified
		else b.list80.push(record);                                                // Add 1880
	},

	startScoring: function ()                                                      // PHASE 2: SCORE PAIRS
	{
		this.log("Phase 2: Scoring Candidates...");                                // Log start
		this.progress(30, "Scoring candidates");                                   // Progress UI
		if (!this.freqMaps) {                                                      // Check freqMaps
			this.log("Building Name Frequency Maps...");                           // Log build
			this.freqMaps = buildNameFrequencies(this.dataVerified);                 // Build frequencies
		}
		const blockKeys = Array.from(this.blocks.keys());                            // Get keys
		const totalBlocks = blockKeys.length;                                        // Total count
		const candidateMap = new Map();                                              // Candidate map
		let processed = 0;                                                           // Processed count
		const CHUNK_SIZE = 1000;                                                     // Chunk size
		const processChunk = () => {                                                   // Chunk processor
			const limit = Math.min(processed + CHUNK_SIZE, totalBlocks);             // Get limit
			for (let i = processed; i < limit; ++i) {                                    // Loop chunk
				const key = blockKeys[i];                                            // Get key
				const block = this.blocks.get(key);                                  // Get block
				if (block.listVerified.length > 0 && block.list80.length > 0) {    // Check lists
					for (const rVerified of block.listVerified) {                  // Loop verified
						for (const r80 of block.list80) {                          // Loop 1880
							const pairId = `${rVerified.line}-${r80.line}`;          // Pair ID
							if (candidateMap.has(pairId)) continue;                // Skip duplicates
							const res = calculateScore(rVerified, r80, this.mode, this.freqMaps, this.matchOptions); // Score
							let tier = 0;                                            // Reset tier
							if (res.score > 100) tier = 1;                           // Tier 1
							else if (res.score >= 80) tier = 2;                      // Tier 2
							else if (res.score >= 50) tier = 3;                      // Tier 3
							if (tier > 0) {                                        // If valid
								candidateMap.set(pairId, {                         // Save candidate
									rVerified, r80, score: res.score, details: res.details, tier
								});
							}
						}
					}
				}
			}
			processed = limit;                                                       // Update count
			const pct = 30 + (processed / totalBlocks) * 40;                         // Calc percent
			if (processed % 5000 === 0) this.progress(pct, `Scoring... (${processed}/${totalBlocks})`);
			if (processed < totalBlocks) {                                         // More chunks?
				setTimeout(processChunk, 0);                                       // Yield
			} else {
				this.candidates = Array.from(candidateMap.values());                 // Save candidates
				this.log(`Scored ${this.candidates.length} candidate pairs.`);      // Log count
				setTimeout(() => this.startResolution(), 100);                       // Start resolution
			}
		};
		processChunk();                                                            // Run chunk
	},

	startResolution: function ()                                                   // PHASE 4: RESOLVE
	{
		this.log("Phase 4: Resolving Conflicts & Identifying Anchors...");          // Log start
		this.progress(60, "Resolving conflicts");                                  // Progress UI
		this.candidates.sort((a, b) => b.score - a.score);                            // Sort descending
		const usedVerified = new Set();                                              // Used verified
		const used80 = new Set();                                                    // Used 1880
		this.tier1 = [];                                                             // Clear Tier 1
		this.tier2 = [];                                                             // Clear Tier 2
		for (const cand of this.candidates) {                                      // Loop candidates
			const idVerified = cand.rVerified.line;                                  // Verified line
			const id80 = cand.r80.line;                                              // 1880 line
			if (usedVerified.has(idVerified) || used80.has(id80)) continue;        // Skip if used
			usedVerified.add(idVerified);                                          // Mark verified
			used80.add(id80);                                                      // Mark 1880
			if (cand.tier === 1) this.tier1.push(cand);                            // Add Tier 1
			else if (cand.tier === 2) this.tier2.push(cand);                       // Add Tier 2
		}
		this.log(`Phase 4 Resolved: ${this.tier1.length} Tier 1 and ${this.tier2.length} Tier 2 anchors identified.`);
		setTimeout(() => this.startHouseholdBoosting(), 100);                       // Run household boost
	},

	startHouseholdBoosting: function ()                                            // PHASE 5: HOUSEHOLD BOOST
	{
		this.log("Phase 5: Household Context Boosting...");                        // Log start
		this.progress(80, "Context boosting");                                     // Progress UI
		const houseA = new Map();                                                    // House map A
		const houseB = new Map();                                                    // House map B
		const getFamKeyA = (r) => {                                                    // Get Fam A Key
			const val = (r.dwelling || r.family || '').toString().trim().toUpperCase(); // Normalize
			return (val === '' || val === '0' || val === 'U' || val === 'UNKNOWN') ? null : val; // Return null if invalid
		};
		const getFamKeyB = (r) => {                                                    // Get Fam B Key
			const val = (r.family || '').toString().trim().toUpperCase();            // Normalize
			return (val === '' || val === '0' || val === 'U' || val === 'UNKNOWN') ? null : val; // Return null if invalid
		};
		let prevKeyA = null;                                                         // Tracker Fam A
		let currentHouseIdA = 0;                                                     // ID Tracker A
		this.dsA.forEach(r => {                                                      // Loop dsA
			const k = getFamKeyA(r);                                                 // Get key
			if (k !== prevKeyA) {                                                  // Key changed
				currentHouseIdA++;                                                 // Increment ID
				prevKeyA = k;                                                        // Save key
			}
			if (!k) {                                                              // If invalid
				r._houseId = null;                                                   // Set null
			} else {
				r._houseId = `A_${currentHouseIdA}`;                                  // Save ID to row
				if (!houseA.has(r._houseId)) houseA.set(r._houseId, []);           // Init array
				houseA.get(r._houseId).push(r);                                    // Add to house A
			}
		});
		let prevKeyB = null;                                                         // Tracker Fam B
		let currentHouseIdB = 0;                                                     // ID Tracker B
		this.dsB.forEach(r => {                                                      // Loop dsB
			const k = getFamKeyB(r);                                                 // Get key
			if (k !== prevKeyB) {                                                  // Key changed
				currentHouseIdB++;                                                 // Increment ID
				prevKeyB = k;                                                        // Save key
			}
			if (!k) {                                                              // If invalid
				r._houseId = null;                                                   // Set null
			} else {
				r._houseId = `B_${currentHouseIdB}`;                                  // Save ID to row
				if (!houseB.has(r._houseId)) houseB.set(r._houseId, []);           // Init array
				houseB.get(r._houseId).push(r);                                    // Add to house B
			}
		});
		const candidateMap = new Map();                                              // Candidate map
		this.candidates.forEach(c => candidateMap.set(`${c.rVerified.line}-${c.r80.line}`, c));
		let boosted = 0;                                                             // Boosted count
		const housePairs = new Set();                                                // House pairs set
		this.candidates.forEach(cand => {                                            // Loop cands
			const hIdA = cand.rVerified._houseId;                                    // House ID A
			const hIdB = cand.r80._houseId;                                          // House ID B
			if (hIdA && hIdB) housePairs.add(`${hIdA}|${hIdB}`);                   // Add pair
		});
		for (const pairKey of housePairs) {                                        // Loop pairs
			const [hIdA, hIdB] = pairKey.split('|');                                 // Split key
			const hA = houseA.get(hIdA) || [];                                       // Get house A
			const hB = houseB.get(hIdB) || [];                                       // Get house B
			if (hA.length > 50 || hB.length > 50) continue;                        // Skip huge institutional houses
			const localMatches = [];                                                 // Local matches
			hA.forEach(memberA => {                                                  // Loop member A
				hB.forEach(memberB => {                                              // Loop member B
					const pairId = `${memberA.line}-${memberB.line}`;                // Pair ID
					let candidate = candidateMap.get(pairId);                        // Get candidate
					if (!candidate) {                                              // If none
						const res = calculateScore(memberA, memberB, this.mode, this.freqMaps, this.matchOptions); // Score
						candidate = { rVerified: memberA, r80: memberB, score: res.score, details: res.details, tier: 0, _pairId: pairId, _isNew: true };
					}
					localMatches.push(candidate);                                  // Add match
				});
			});
			if (localMatches.length === 0) continue;                               // Skip if empty
			let headMatch = false;                                                   // Head match flag
			let spouseMatch = false;                                                 // Spouse match flag
			let childMatches = 0;                                                    // Child matches count
			let parentMatch = false;                                                 // Parent match flag
			const countedChildren = new Set();                                       // Counted children set
			localMatches.forEach(m => {                                              // Loop matches
				if (m.score <= 20) return;                                         // Ignore weak/non-matches
				const relB = (m.r80.relation || '').toLowerCase();                    // Get relation
				if (relB.includes('head') || relB.includes('self')) {              // Check head
					headMatch = true;                                                // Set flag
				}
				else if (relB.includes('wife')) {                                  // Check wife
					spouseMatch = true;                                              // Set flag
				}
				else if (m.rVerified.gender !== m.r80.gender) {                    // Check gender
					const year1 = parseInt(m.rVerified.birth_year) || 1870;          // Birth 1870
					const year2 = parseInt(m.r80.birth_year) || 1880;                // Birth 1880
					const ageDiff = Math.abs(year1 - year2);                         // Age difference
					const age1 = 1870 - year1;                                       // Age 1870
					const age2 = 1880 - year2;                                       // Age 1880
					if (ageDiff <= 5 && age1 > 15 && age2 > 15 && !relB.includes('son') && !relB.includes('dau') && !relB.includes('child')) {
						spouseMatch = true;                                          // Set flag
					}
				}
				if (relB.includes('son') || relB.includes('dau') || relB.includes('child')) { // Check child
					const childYear = parseInt(m.r80.birth_year) || 1880;            // Birth child
					const childAge = 1880 - childYear;                               // Age child
					if (childAge > 10 && !countedChildren.has(m.r80.line)) {       // Age cutoff
						childMatches++;                                            // Increment count
						countedChildren.add(m.r80.line);                           // Mark child line
					}
				}
				if (relB.includes('father') || relB.includes('mother')) {          // Check parent
					parentMatch = true;                                              // Set flag
				}
			});
			let contextBonus = 0;                                                    // Context bonus
			let contextReasons = [];                                                 // Reasons array
			if (this.matchOptions.head && headMatch) { contextBonus += 20; contextReasons.push("Head Match"); } // Head bonus
			if (this.matchOptions.spouse && spouseMatch) { contextBonus += 20; contextReasons.push("Spouse Match"); } // Spouse bonus
			if (this.matchOptions.child && childMatches > 0) { contextBonus += (childMatches * 10); contextReasons.push(`Child Match x${childMatches}`); } // Child bonus
			if (this.matchOptions.parent && parentMatch) { contextBonus += 15; contextReasons.push("Parent Match"); } // Parent bonus
			const strongMatchingLines80 = new Set();                                 // Strong matches
			localMatches.forEach(m => {                                              // Loop matches
				if (m.score > 20) {                                                // Score cutoff
					strongMatchingLines80.add(m.r80.line);                         // Add line
				}
			});
			if (contextBonus > 0 || strongMatchingLines80.size > 0) {              // Apply boost
				localMatches.forEach(candidate => {                                  // Loop candidates
					let thisBonus = contextBonus;                                    // Initial bonus
					let theseReasons = [...contextReasons];                          // Reasons
					const isSelfMatched = strongMatchingLines80.has(candidate.r80.line); // Self match?
					const otherMatchesCount = Math.max(0, strongMatchingLines80.size - (isSelfMatched ? 1 : 0)); // Other count
					if (this.matchOptions.household && otherMatchesCount > 0) {    // If household match checked
						thisBonus += (otherMatchesCount * 20);                      // Add bonus
						theseReasons.push(otherMatchesCount === 1 ? "Co-residence" : `Co-residence x${otherMatchesCount}`);
					}
					if (thisBonus > 0) {                                           // If bonus > 0
						candidate.score += thisBonus;                              // Apply score
						candidate.details += (candidate.details ? ", " : "") + theseReasons.join(", "); // Add details
						let newTier = 0;                                             // New tier
						if (candidate.score > 100) newTier = 1;                      // Tier 1
						else if (candidate.score >= 80) newTier = 2;                 // Tier 2
						else if (candidate.score >= 50) newTier = 3;                 // Tier 3
						if (newTier > 0 && (candidate.tier === 0 || newTier < candidate.tier)) { // Promote tier
							candidate.tier = newTier;                                // Save tier
							boosted++;                                             // Increment boosted
							if (candidate._isNew) {                                // If new candidate
								candidateMap.set(candidate._pairId, candidate);    // Save to map
								candidate._isNew = false;                          // Clear flag
							}
						}
					}
				});
			}
		}
		this.log(`Boosted ${boosted} candidates via household context.`);          // Log count
		this.candidates = Array.from(candidateMap.values()).filter(c => c.tier > 0);   // Keep active cands
		setTimeout(() => this.finalizeResults(), 100);                               // Finalize results
	},

	finalizeResults: function ()                                                   // RESULTS
	{
		this.log("Finalizing Matches...");                                         // Log start
		this.progress(90, "Finalizing");                                           // Progress UI
		this.candidates.sort((a, b) => b.score - a.score);                            // Sort descending
		const usedVerified = new Set();                                              // Used verified
		const used80 = new Set();                                                    // Used 1880
		this.tier1 = [];                                                             // Clear Tier 1
		this.tier2 = [];                                                             // Clear Tier 2
		this.tier3 = [];                                                             // Clear Tier 3
		let count = 0;                                                               // Count
		for (const cand of this.candidates) {                                      // Loop candidates
			const idVerified = cand.rVerified.line;                                  // Verified line
			const id80 = cand.r80.line;                                              // 1880 line
			if (usedVerified.has(idVerified) || used80.has(id80)) continue;        // Unique pairings
			usedVerified.add(idVerified);                                          // Mark verified
			used80.add(id80);                                                      // Mark 1880
			if (cand.tier === 1) this.tier1.push(cand);                            // Add Tier 1
			else if (cand.tier === 2) this.tier2.push(cand);                       // Add Tier 2
			else if (cand.tier === 3) this.tier3.push(cand);                       // Add Tier 3
			count++;                                                               // Increment count
		}
		this.log(`Final count: ${count} unique matches.`);                         // Log final count
		this.log(`Tier 1: ${this.tier1.length}, Tier 2: ${this.tier2.length}, Tier 3: ${this.tier3.length}`);
		this.progress(100, "Done");                                                // Progress UI
		$('#results-panel').removeClass('hidden');                                 // Show results
		$('#context-panel').removeClass('hidden');                                 // Show context
		$('#btn-save').removeClass('hidden');                                      // Show save
		$('#btn-save-confidences').removeClass('hidden');                          // Show save conf
		$('#btn-run').prop('disabled', false);                                     // Enable run
		$('#cnt-1').text(this.tier1.length);                                       // Set Tier 1 count
		$('#cnt-2').text(this.tier2.length);                                       // Set Tier 2 count
		$('#cnt-3').text(this.tier3.length);                                       // Set Tier 3 count
		this.switchTab(1);                                                         // Switch to Tab 1
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
		let map = this.mapVerified;
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
				data.forEach(m => {
					let cls = 'score-low';
					let scoreStyle = 'font-size:1.1em;';
					if (m.score > 90) cls = 'score-high';
					else if (m.score >= 80) cls = 'score-med';
					if (m.score < 0) scoreStyle += ' color: #e11d48;'; // Pink for negative points
					const detailsHtml = (m.details || '').split(', ').map(d => {
						let ext = '';
						const lower = d.toLowerCase();
						if (lower.includes('mismatch') || lower.includes('gap') || lower.includes('regress') || lower.includes('contradictory') || d.match(/-\d+/)) {
							ext = ' ev-negative';
						}
						return `<span class="ev-tag${ext}">${d}</span>`;
					}).join('');

					html += `
						<div class="match-item" data-lver="${m.rVerified.line}" data-l80="${m.r80.line}">
							<div class="match-header">
								<span class="badge ${cls}" style="${scoreStyle}">${m.score}</span>
							</div>
							<div class="match-grid">
								<div class="rec">
									<span>Verified (Line ${m.rVerified.line})</span>
									<strong>${m.rVerified.full_name}</strong>
									<span>Age: ${1870 - (parseInt(m.rVerified.birth_year) || 1870)} | Born: ${m.rVerified.birth_year} | ${m.rVerified.birth_place} | ${m.rVerified.race}/${m.rVerified.gender}</span>
									<span>Occ: ${m.rVerified.occupation}</span>
									<span>Household: ${this.getHouseholdMembers(m.rVerified, this.dsA)}</span>
								</div>
								<div class="rec">
									<span>1880 (Line ${m.r80.line})</span>
									<strong>${m.r80.full_name}</strong>
									<span>Age: ${1880 - (parseInt(m.r80.birth_year) || 1880)} | Born: ${m.r80.birth_year} | ${m.r80.birth_place} | ${m.r80.race}/${m.r80.gender}</span>
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
				$list.html(html);
			}

			// Hide spinner, show list
			$spinner.addClass('hidden');
			$list.removeClass('hidden');
			$list.scrollTop(0);
		}, 50);
	},

	showContext: function (lVer, l80)                                               // DISPLAY CONTEXT
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
		let setA = this.dsA.length ? this.dsA : this.dataVerified;
		let setB = this.dsB.length ? this.dsB : this.data1880;
		let mapA = this.mapA || this.mapVerified;
		let mapB = this.mapB || this.map1880;

		renderBox(setA, mapA, lVer, '#context-verified');
		renderBox(setB, mapB, l80, '#context-1880');
	},

	exportConfidencesCSV: function ()                                              // EXPORT CONFIDENCES CSV
	{
		this.log("Exporting Confidences...");
		if (this.confidences.length === 0) {
			alert("No confidences set yet.");
			return;
		}
		const csv = Papa.unparse(this.confidences);
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", "confidences.csv");
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	},

	exportCSV: function ()                                                         // EXPORT MATCH RESULTS
	{
		this.log("Exporting Results...");                                          // Log start
		const cutoffStr = prompt("Enter cutoff score (e.g. 90):", "90");              // Ask for cutoff
		if (cutoffStr === null) return;                                            // Cancel check
		const cutoff = parseInt(cutoffStr, 10) || 90;                                // Parse cutoff
		this.log(`Applying cutoff ${cutoff} to matches...`);                       // Log cutoff
		const newEgoids = new Map();                                                 // Egoids map
		const allTiers = [...this.tier1, ...this.tier2, ...this.tier3];              // All cands
		let matchCount = 0;                                                          // Match count
		allTiers.forEach(m => {                                                      // Loop cands
			if (m.score >= cutoff) {                                               // Check cutoff
				if (m.rVerified.egoid) {                                           // Check egoid
					newEgoids.set(String(m.r80.line), m.rVerified.egoid);          // Map 1880 line -> 1870 egoid
					matchCount++;                                                  // Increment count
				}
			}
		});
		this.log(`Updated ${matchCount} 1880 records with 1870 IDs.`);             // Log count
		const rows = [];                                                             // Rows array
		this.data1880.forEach(r => {                                                 // Loop 1880 data
			const val = newEgoids.get(String(r.line)) || '';                         // Get egoid
			rows.push(val);                                                        // Add to rows
		});
		const clipboardText = rows.join('\n');                                       // Join rows
		if (navigator.clipboard && navigator.clipboard.writeText) {                 // Clipboard support
			navigator.clipboard.writeText(clipboardText).then(() => {                // Copy to clipboard
				alert(`Match Mode: Copied 1880 egoid column (${rows.length} rows) to clipboard.\nMatches applied: ${matchCount}`);
			}).catch(e => this.fallbackCopy(clipboardText, rows.length));            // Fallback
		} else {
			this.fallbackCopy(clipboardText, rows.length);                         // Fallback
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
			} ``
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
