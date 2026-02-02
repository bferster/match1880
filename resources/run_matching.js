const fs = require('fs');
const path = require('path');
const { runMatching } = require('./matcher_logic');

const DATA_DIR = path.join(__dirname, '..');
const FILE_1870 = path.join(DATA_DIR, 'ALB_CN_1870.csv');
const FILE_1880 = path.join(DATA_DIR, 'ALB_CN_1880.csv');

function parseCSV(content) {
	const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
	const headers = lines[0].split(',').map(h => h.trim());
	const data = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		const row = {};
		let currentVal = '';
		let insideQuote = false;
		let colIndex = 0;

		for (let j = 0; j < line.length; j++) {
			const char = line[j];
			if (char === '"') {
				insideQuote = !insideQuote;
			} else if (char === ',' && !insideQuote) {
				if (colIndex < headers.length) {
					row[headers[colIndex]] = currentVal.trim();
				}
				colIndex++;
				currentVal = '';
			} else {
				currentVal += char;
			}
		}
		// Last column
		if (colIndex < headers.length) {
			row[headers[colIndex]] = currentVal.trim();
		}

		data.push(row);
	}
	return data;
}

function objectToCSV(data) {
	if (!data || data.length === 0) return '';

	// Define output columns
	const columns = [
		'score', 'tier', 'details',
		'line_1870', 'full_name_1870', 'age_1870', 'birth_year_1870',
		'line_1880', 'full_name_1880', 'age_1880', 'birth_year_1880'
	];

	const header = columns.join(',');
	const rows = data.map(item => {
		return columns.map(col => {
			let val = '';
			// Map flat columns to nested object structure
			if (col === 'score') val = item.score;
			else if (col === 'tier') val = item.tier;
			else if (col === 'details') val = item.details;
			else if (col.endsWith('_1870')) val = item.r70[col.replace('_1870', '')];
			else if (col.endsWith('_1880')) val = item.r80[col.replace('_1880', '')];
			else if (col === 'line_1880') val = item.r80.line;

			// Handle commas in output
			val = String(val || '');
			if (val.includes(',')) val = `"${val}"`;
			return val;
		}).join(',');
	});

	return [header, ...rows].join('\n');
}

console.log("Loading data files...");
const raw1870 = fs.readFileSync(FILE_1870, 'utf8');
const raw1880 = fs.readFileSync(FILE_1880, 'utf8');

console.log("Parsing CSVs...");
const data1870 = parseCSV(raw1870);
const data1880 = parseCSV(raw1880);

console.log("Running block matching strategy...");
const results = runMatching(data1870, data1880);

console.log("Writing output files...");
fs.writeFileSync(path.join(DATA_DIR, 'tier1_matches.csv'), objectToCSV(results.tier1));
fs.writeFileSync(path.join(DATA_DIR, 'tier2_matches.csv'), objectToCSV(results.tier2));
fs.writeFileSync(path.join(DATA_DIR, 'tier3_matches.csv'), objectToCSV(results.tier3));

console.log("Done.");
