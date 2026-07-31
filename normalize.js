import { jaroWinkler } from './match.js';

const nickname = {
	"WM": "WILLIAM", "BILL": "WILLIAM", "BILLY": "WILLIAM",
	"WILL": "WILLIAM", "WILLY": "WILLIAM", "WILLIE": "WILLIAM",
	"ROBT": "ROBERT", "ROB": "ROBERT", "BOB": "ROBERT",
	"BOBBY": "ROBERT", "ROBBIE": "ROBERT",
	"JAS": "JAMES", "JIM": "JAMES", "JIMMY": "JAMES", "JAMIE": "JAMES",
	"CHAS": "CHARLES", "CHARLIE": "CHARLES", "CHUCK": "CHARLES", "CARL": "CHARLES",
	"THOS": "THOMAS", "TOM": "THOMAS", "TOMMY": "THOMAS",
	"JNO": "JOHN", "JON": "JOHN", "JACK": "JOHN", "JACKIE": "JOHN",
	"JONNY": "JOHN", "JOHNNY": "JOHN",
	"DAN": "DANIEL", "DANNY": "DANIEL",
	"ED": "EDWARD", "EDDIE": "EDWARD", "NED": "EDWARD", "TED": "EDWARD", "TEDDY": "EDWARD",
	"GEO": "GEORGE",
	"JOS": "JOSEPH", "JOE": "JOSEPH", "JOEY": "JOSEPH",
	"SAM": "SAMUEL", "SAMMY": "SAMUEL",
	"ALEX": "ALEXANDER", "ALECK": "ALEXANDER", "ALEC": "ALEXANDER",
	"SANDY": "ALEXANDER",
	"PAT": "PATRICK", "PADDY": "PATRICK",
	"MATT": "MATTHEW", "MAT": "MATTHEW",
	"MIKE": "MICHAEL", "MICK": "MICHAEL", "MICKEY": "MICHAEL",
	"MICH": "MICHAEL",
	"DAVE": "DAVID", "DAVEY": "DAVID", "DAVY": "DAVID",
	"CHRIS": "CHRISTOPHER", "KIT": "CHRISTOPHER",
	"RICH": "RICHARD", "RICK": "RICHARD", "DICK": "RICHARD",
	"RICHD": "RICHARD", "DICKY": "RICHARD",
	"HARRY": "HENRY", "HAL": "HENRY", "HEN": "HENRY",
	"BEN": "BENJAMIN", "BENNY": "BENJAMIN", "BENJ": "BENJAMIN",
	"FRED": "FREDERICK", "FREDDY": "FREDERICK", "FREDK": "FREDERICK",
	"FRANK": "FRANCIS", "FRAN": "FRANCIS", "FRAS": "FRANCIS",
	"ANDY": "ANDREW",
	"TONY": "ANTHONY", "ANT": "ANTHONY",
	"ART": "ARTHUR", "ARTIE": "ARTHUR",
	"AL": "ALBERT", "ALB": "ALBERT",
	"ALF": "ALFRED", "ALFIE": "ALFRED",
	"WALT": "WALTER", "WALLY": "WALTER",
	"PETE": "PETER",
	"STEVE": "STEPHEN", "STEPH": "STEPHEN",
	"NICK": "NICHOLAS", "NICKY": "NICHOLAS",
	"NAT": "NATHANIEL", "NATE": "NATHANIEL", "NATHL": "NATHANIEL",
	"ABE": "ABRAHAM",
	"IKE": "ISAAC",
	"LI": "ELIJAH", "LIJE": "ELIJAH",
	"MANNY": "EMANUEL", "MANUEL": "EMANUEL",
	"HARV": "HARVEY",
	"LEW": "LEWIS",
	"MOSE": "MOSES",
	"SOL": "SOLOMON",
	"TOBY": "TOBIAS",
	"JERRY": "JEREMIAH", "JER": "JEREMIAH",
	"ZEKE": "EZEKIEL",
	"NEIL": "CORNELIUS", "CORN": "CORNELIUS",
	"BART": "BARTHOLOMEW",
	"EDMUND": "EDMUND",
	"ARCH": "ARCHIBALD", "ARCHIE": "ARCHIBALD",
	"GUS": "AUGUSTUS",
	"AMB": "AMBROSE",
	"ZACH": "ZACHARIAH", "ZACK": "ZACHARIAH",
	"LIZ": "ELIZABETH", "LIZZIE": "ELIZABETH", "LIZZY": "ELIZABETH",
	"BETH": "ELIZABETH", "BETTY": "ELIZABETH", "BETTE": "ELIZABETH",
	"BESS": "ELIZABETH", "BESSIE": "ELIZABETH", "ELIZA": "ELIZABETH",
	"ELIZ": "ELIZABETH", "LIBBY": "ELIZABETH",
	"MOLLY": "MARY", "POLLY": "MARY", "MAE": "MARY", "MAMIE": "MARY",
	"MAG": "MARGARET", "MAGGIE": "MARGARET", "MEG": "MARGARET",
	"PEGGY": "MARGARET", "MARG": "MARGARET", "MARGT": "MARGARET",
	"RITA": "MARGARET",
	"KATE": "CATHERINE", "KATIE": "CATHERINE", "KIT": "CATHERINE",
	"KITTY": "CATHERINE", "KATH": "CATHERINE",
	"SARA": "SARAH", "SALLY": "SARAH", "SAL": "SARAH",
	"SUE": "SUSAN", "SUSIE": "SUSAN", "SUSY": "SUSAN",
	"SUSY": "SUSANNAH", "SUSA": "SUSANNAH",
	"ANNIE": "ANN", "ANNA": "ANN", "NAN": "ANN", "NANNY": "ANN",
	"HANNA": "HANNAH",
	"MART": "MARTHA", "MATTIE": "MARTHA",
	"BECCA": "REBECCA", "BECKY": "REBECCA",
	"CARRIE": "CAROLINE", "CAROL": "CAROLINE",
	"NELL": "ELEANOR", "NELLIE": "ELEANOR", "NORA": "ELEANOR",
	"FANNY": "FRANCES",
	"HATTIE": "HARRIET",
	"LOU": "LOUISA", "LULA": "LOUISA",
	"TILLY": "MATILDA", "TILLIE": "MATILDA",
	"GINNY": "VIRGINIA",
	"VINA": "LAVINIA", "VINEY": "LAVINIA",
	"PRISSY": "PRISCILLA", "CILLA": "PRISCILLA",
	"DELIA": "DELILAH", "LILA": "DELILAH",
	"LUCY": "LUCINDA",
	"PHILLIS": "PHYLLIS",
	"MINNIE": "MINERVA"
};

const normalized_occupations_table = [
	{
		"label": "Agriculture",
		"title": "Agricultural & Farming",
		"examples": "farmer, farmhand, planter, gardener, cattle work, dairyman, shepherd, hostler"
	},
	{
		"label": "Food",
		"title": "Food Production & Processing",
		"examples": "baker, butcher, miller, flour work, confectioner"
	},
	{
		"label": "Textile",
		"title": "Textile & Clothing",
		"examples": "tailor, seamstress, dressmaker, weaver, spinner"
	},
	{
		"label": "Leather",
		"title": "Leather & Footwear",
		"examples": "shoemaker, shoe maker, saddler, tanner, harness maker"
	},
	{
		"label": "Metal",
		"title": "Metalworking & Smithing",
		"examples": "blacksmith, silversmith, tinsmith, gunsmith, locksmith, b smith, blk-smith, bsmith"
	},
	{
		"label": "Woodwork",
		"title": "Woodworking & Furniture",
		"examples": "carpenter, cabinetmaker, wheelwright, chairmaker"
	},
	{
		"label": "Construction",
		"title": "Construction & Building",
		"examples": "mason, brickmaker, plasterer, painter, slater"
	},
	{
		"label": "Transportation",
		"title": "Railroad & Transportation",
		"examples": "railroad worker, railroad, conductor, engineer, brakeman, flagman, boatman, ferryman, sailor, waterman, teamster, drayman, wagoner, driver, expressman, rail road"
	},
	{
		"label": "Domestic",
		"title": "Domestic Service",
		"examples": "domestic, servant, cook, butler, chambermaid, housekeeper, laundress, washerwoman, nurse, governess, keep house, keeping house, at home, house keeper, house-keeping"
	},
	{
		"label": "Commerce",
		"title": "Retail & Commerce",
		"examples": "merchant, grocer, dealer, trader, storekeeper"
	},
	{
		"label": "Office",
		"title": "Clerical & Office Work",
		"examples": "clerk, bookkeeper, accountant, copyist"
	},
	{
		"label": "Profession",
		"title": "Professional Services",
		"examples": "lawyer, physician, surveyor, architect, photographer, doctor, dentist, banker, nurse"
	},
	{
		"label": "Education",
		"title": "Education",
		"examples": "teacher, college,professor, school, university prof"
	},
	{
		"label": "Religion",
		"title": "Religion",
		"examples": "minister, preacher, librarian"
	},
	{
		"label": "Manufacturing",
		"title": "Manufacturing & Industrial",
		"examples": "machinist, factory [worker], foundry [worker], manufacturer"
	},
	{
		"label": "Extraction",
		"title": "Mining & Extraction",
		"examples": "miner, coal [worker], quarryman, well digger"
	},
	{
		"label": "Government",
		"title": "Public Service & Law Enforcement",
		"examples": "police, sheriff, constable, judge, jailer, postmaster, tax collector, inspector, enumerator, mayor, post master, post mistress"
	},
	{
		"label": "Hospitality",
		"title": "Hospitality & Food Service",
		"examples": "hotel [keeper], saloonkeeper, bartender, waiter, boarding house [keeper]"
	},
	{
		"label": "Craftsman",
		"title": "Skilled Artisans & Crafts",
		"examples": "jeweler, watchmaker, printer, cooper"
	},
	{
		"label": "Laborer",
		"title": "General Labor & Assistance",
		"examples": "laborer, helper, assistant, errand [boy]"
	}
];

export function NYSIIS(name)                                                   // NYSIIS PHONETIC ALGORITHM
{
	if (!name) return '';                                                      // Return empty if missing
	let s = name.toUpperCase().replace(/[^A-Z]/g, '');                         // Non-alpha to upper
	if (!s) return '';                                                         // Return empty if clean empty

	if (s.startsWith('MAC')) s = 'MC' + s.substring(3);                        // MAC -> MC
	else if (s.startsWith('KN')) s = 'N' + s.substring(2);                     // KN -> N
	else if (s.startsWith('SCH')) s = 'S' + s.substring(3);                    // SCH -> S

	if (s.endsWith('EE') || s.endsWith('IE')) {                                // EE/IE -> Y
		s = s.substring(0, s.length - 2) + 'Y';
	} else if (s.endsWith('DT') || s.endsWith('RT') || s.endsWith('RD') || s.endsWith('NT') || s.endsWith('ND')) {
		s = s.substring(0, s.length - 2) + 'D';                                // DT/RT/RD/NT/ND -> D
	}

	if (s.endsWith('S') || s.endsWith('A')) s = s.substring(0, s.length - 1);  // Remove trailing S or A

	s = s.replace(/PH/g, 'F');                                                 // PH -> F
	let isVowel = (c) => c && 'AEIOU'.indexOf(c) !== -1;                       // Helper: Vowel check
	let res = '';                                                              // Result builder
	for (let i = 0; i < s.length; ++i) {
		let c = s[i];                                                          // Char
		if (c === 'Q') c = 'G';                                                // Q -> G
		else if (c === 'Z') c = 'S';                                           // Z -> S
		else if (c === 'M') c = 'N';                                           // M -> N
		else if (c === 'K') c = 'C';                                           // K -> C
		else if (isVowel(c)) c = 'A';                                          // Vowels -> A
		else if (c === 'H') {                                                  // Remove H if not next to vowel
			let prev = s[i - 1];
			let next = s[i + 1];
			if (!isVowel(prev) && !isVowel(next)) continue;
		} else if (c === 'W') {                                                // Remove W if prev is vowel
			let prev = s[i - 1];
			if (isVowel(prev)) continue;
		}
		res += c;                                                              // Add char
	}

	let collapsed = '';                                                        // Collapse duplicates
	for (let i = 0; i < res.length; ++i) {
		if (res[i] !== res[i - 1]) collapsed += res[i];
	}
	return collapsed;                                                          // Return NYSIIS key
}

export function NicknameNormalize(name)                                         // NORMALIZE NICKNAME
{
	if (!name) return '';                                                      // Return empty if missing
	let cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');                 // Normalize string
	if (nickname[cleanName]) return nickname[cleanName];                       // Return dictionary match
	return cleanName;                                                          // Return original
}

export function OccupationNormalize(val)                                       // NORMALIZE OCCUPATION
{
	if (!val) return '';                                                       // Return empty if missing
	let occ = val.replace(/[^\w\s]/g, '');                                     // Remove punctuation
	occ = occ.replace(/\b(assistant|assist|intern|apprentice|apprenticed|appren|app)\b/gi, ''); // Remove assist words
	occ = occ.trim().replace(/\s+/g, ' ').toLowerCase();                       // Clean spaces
	if (!occ) return '';                                                       // Return if empty

	if (occ.includes('school ') || occ.includes('university') || occ.includes('prof')) return 'EDUCATION';
	if (occ.includes('farm')) return 'AGRICULTURE';                            // Farm check
	if (occ.includes('maid') || occ.includes('house')) return 'DOMESTIC';      // Maid/house check
	if (occ.includes('r r') || occ.includes('rr')) return 'TRANSPORTATION';    // RR check

	for (let cat of normalized_occupations_table) {                            // Check exact matches
		if (cat.label.toLowerCase() === occ) return cat.label.toUpperCase();
		let examples = cat.examples.split(',').map(e => e.replace(/[\[\]]/g, '').trim().toLowerCase());
		for (let ex of examples) {
			if (ex === occ) return cat.label.toUpperCase();
		}
	}

	let bestLabel = 'LABORER';                                                 // Default fallback
	let maxScore = -1;                                                         // Max distance score
	for (let cat of normalized_occupations_table) {                            // Compute closest category
		let scoreLabel = jaroWinkler(occ, cat.label);
		if (scoreLabel > maxScore) {
			maxScore = scoreLabel;
			bestLabel = cat.label.toUpperCase();
		}
		let examples = cat.examples.split(',').map(e => e.replace(/[\[\]]/g, '').trim().toLowerCase());
		for (let ex of examples) {
			let scoreEx = jaroWinkler(occ, ex);
			if (scoreEx > maxScore) {
				maxScore = scoreEx;
				bestLabel = cat.label.toUpperCase();
			}
		}
	}
	return bestLabel;                                                          // Return matched label
}

export function ParseFullName(fullName)                                         // PARSE FULL NAME
{
	if (!fullName) return { first_name: '', middle_name: '', last_name: '' };
	let cleanName = fullName.replace(/[\.,]/g, '');                            // Remove dot and comma
	let words = cleanName.trim().split(/\s+/).filter(w => w.length > 0);       // Split words
	if (words.length === 0) return { first_name: '', middle_name: '', last_name: '' };

	let first = '', middle = '', last = '';
	const suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', '2nd', '3rd', '4th', '5th'];
	let suffixIdx = -1;
	for (let i = 0; i < words.length; ++i) {
		if (suffixes.includes(words[i].toLowerCase())) {
			suffixIdx = i;                                                     // Found suffix
			break;
		}
	}

	if (suffixIdx > 0) {
		last = words[suffixIdx - 1];                                           // Last before suffix
		first = words[0];                                                      // First word
		if (suffixIdx - 1 > 1) middle = words[1];                              // Middle word
	} else {
		if (words.length === 1) {
			last = words[0];
		} else if (words.length === 2) {
			first = words[0];
			last = words[1];
		} else {
			first = words[0];
			middle = words[1];
			last = words[words.length - 1];
		}
	}
	if (middle) middle = middle.replace(/[^\w\s]/g, '');                       // Remove punctuation
	return { first_name: first, middle_name: middle, last_name: last };
}

export function NormalizeSourceData(record)                                    // NORMALIZE CENSUS ROW
{
	let r = { ...record };                                                     // Copy record
	for (let key in r) {
		if (typeof r[key] === 'string') {
			r[key] = r[key].replace(/[\.,]/g, '');                             // Remove dots and commas
		}
	}

	if (r.full_name && (!r.first_name || !r.last_name)) {                      // Parse full_name if needed
		let parsed = ParseFullName(r.full_name);
		if (!r.first_name) r.first_name = parsed.first_name;
		if (!r.middle_name) r.middle_name = parsed.middle_name;
		if (!r.last_name && r.last_name !== '') r.last_name = parsed.last_name;
	}
	if (!r.full_name && (r.first_name || r.last_name)) {                       // Construct full_name if missing
		r.full_name = [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' '); // Join names
	}

	for (let key in r) {
		let val = r[key];
		if (key.includes('last_name') || key.includes('last-_name')) {
			let newKey = key.includes('last-_name') ? 'nysiis_last_name' : 'nysiis_' + key;
			r[newKey] = NYSIIS(val);                                           // Normalize NYSIIS last name
		}
		if (key.includes('first_name')) {
			let newKey = 'norm_' + key;
			r[newKey] = NicknameNormalize(val);                                // Normalize first name
		}
		if (key === 'race') {
			let newKey = 'norm_' + key;
			if (val === null || val === undefined || val === '') {
				r[newKey] = '';
			} else {
				let cleanRace = val.toString().trim().toLowerCase();
				if (cleanRace === 'w' || cleanRace === 'cauc' || cleanRace === 'caucasian' || cleanRace === 'white') {
					r[newKey] = 'W';                                           // Set white
				} else {
					r[newKey] = 'B';                                           // Set black
				}
			}
		}
		if (key.includes('occupation')) {
			let newKey = 'norm_' + key;
			r[newKey] = OccupationNormalize(val);                              // Normalize occupation
		}
	}
	return r;
}
