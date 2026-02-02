# Implementation Plan: Match 1880 Web App

## Goal
Build a web application to match census records between 1870 and 1880 based on provided criteria (NYSIIS names, gender, race, age).

## Architecture
- **Structure**: Single Page Application (SPA).
- **Core**: HTML5, Vanilla CSS, Vanilla JS + jQuery (as requested).
- **Data Processing**: Client-side CSV parsing using PapaParse.
- **Logic**: Blocking strategy (Block 1) using NYSIIS last name, first name, gender, and race. Match verification using Age Difference (target ~10 years).
- **Constraint**: Pure client-side, using vanilla JS and jQuery. No heavy frameworks.

## Components

### 1. UI (`index.html`)
- **Header**: Title and simple instructions.
- **Input Section**:
    - File Input for 1870 Census CSV.
    - File Input for 1880 Census CSV.
- **Action Section**: "Run Match" button (disabled until files selected).
- **Status Section**: Progress bar or status text (parsing, matching...).
- **Results Section**:
    - Summary Stats: Total pairs, Promising pairs (Age diff 9-11).
    - Table: Display top 50 matches.
    - Export Checkbox/Button: "Download Full Matches CSV".

### 2. Styling (`style.css`)
- **Theme**: Premium, clean, modern. Dark mode or high-contrast light mode.
- **Typography**: Inter or Roboto.
- **Interactions**: Smooth transitions, hover effects.

### 3. Logic (`app.js` & `matcher.js`)
- **CSV Parsing**:
    - Use `Papa.parse(file, { header: true, dynamicTyping: true, ... })`.
    - Handle large files (25k-30k rows) - might need a worker or just async chunking if UI freezes, but simple blocking might suffice for <50k rows on modern machines.
- **Blocking / Matching**:
    - Adapt the provided `createBlock1Candidates` function.
    - Input: Arrays of objects (from PapaParse).
    - Output: Array of candidate pairs.
- **Filtering**:
    - Filter for `9 <= age_diff <= 11`.
- **Export**:
    - Convert pairs to CSV and trigger download.

## Workflow
1. User uploads 1870 CSV. (App stores in memory var).
2. User uploads 1880 CSV. (App stores in memory var).
3. User clicks "Match".
4. App runs matching algorithm.
5. App displays results and download button.
