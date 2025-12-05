const fs = require('fs');
const path = require('path');

// Load ignore list
const ignoreListPath = path.join(__dirname, 'machineText.txt');
let ignorePhrases = [];
try {
    if (fs.existsSync(ignoreListPath)) {
        const content = fs.readFileSync(ignoreListPath, 'utf-8');
        ignorePhrases = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    }
} catch (err) {
    console.error("Failed to load machineText.txt:", err);
}

/**
 * Rhythm Game Data Extractor (JavaScript)
 * Analyzes the Google Cloud Vision API response data to extract key rhythm
 * game metrics: Song Title, Score, and Difficulty Level.
 */

/**
 * Extracts rhythm game metrics from the Google Cloud Vision API response.
 * @param {Object} jsonData The dictionary loaded from the Cloud Vision API JSON response.
 * @param {Array<string>} knownTitles List of known song titles to match against.
 * @returns {Object} A dictionary containing the extracted song details.
 */
function extractRhythmGameData(jsonData, knownTitles = []) {
    const extractedData = {
        "Song Title": null,
        "Score": null,
        "Difficulty Level": null,
        "Difficulty Name": null
    };

    let fullText;
    try {
        // The full OCR text is in the 'description' field of the first annotation
        // Handle both direct textAnnotations array or response object wrapper
        const annotations = jsonData.responses ? jsonData.responses[0].textAnnotations : jsonData.textAnnotations;
        fullText = annotations ? annotations[0].description : null;
        // //console.log('Original Text:', fullText);
        
        if (!fullText) throw new Error("No text found");

        // Filter out ignored phrases
        for (const phrase of ignorePhrases) {
            // Escape regex special characters in the phrase
            const escapedPhrase = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            // Case-insensitive replacement
            const regex = new RegExp(escapedPhrase, 'gi');
            fullText = fullText.replace(regex, ' ');
        }
        // //console.log('Filtered Text:', fullText);

    } catch (e) {
        console.error("Error: Could not find the full text description in the JSON structure.", e);
        return extractedData;
    }

    // --- 1. Extract Song Title ---
    // Helper function to detect if a string contains Japanese characters
    const hasJapanese = (str) => {
        return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str);
    };

    let foundTitle = null;
    let bestMatchScore = -1; // Higher is better. 2 = Exact Standalone, 1 = Exact Embedded, 0 = Fuzzy Standalone
    
    // Sort titles: first by whether they contain Japanese (Japanese first), then by length descending
    const sortedTitles = knownTitles.sort((a, b) => {
        const aHasJapanese = hasJapanese(a);
        const bHasJapanese = hasJapanese(b);
        
        // Prioritize Japanese titles (English game version keeps Japanese titles in Japanese)
        if (aHasJapanese && !bHasJapanese) return -1;
        if (!aHasJapanese && bHasJapanese) return 1;
        
        // If both have or don't have Japanese, sort by length
        return b.length - a.length;
    });

    // Split text into lines for better context analysis
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    //console.log('\n=== Starting Title Matching ===');
    for (const title of sortedTitles) {
        const escapedTitle = title.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const flags = title.length <= 3 ? '' : 'i';
        
        // Check for Exact Match
        const regex = new RegExp(`(?:^|[\\s\\n])${escapedTitle}(?:$|[\\s\\n])`, flags);
        
        if (regex.test(fullText)) {
            //console.log(`Found exact match for title: "${title}"`);
            // We found an exact match. Now check if it's "standalone" or "embedded".
            // A standalone match is one where the line is roughly equal to the title.
            let isStandalone = false;
            for (const line of lines) {
                // Check if the line *is* the title (ignoring case/whitespace)
                if (line.toLowerCase() === title.toLowerCase()) {
                    isStandalone = true;
                    //console.log(`Standalone match on line: "${line}"`);
                    break;
                }
                // Or if the line is very short and contains the title (e.g. "Title 123")
                if (line.toLowerCase().includes(title.toLowerCase()) && line.length < title.length + 5) {
                     isStandalone = true;
                     //console.log(`Standalone match (short line): "${line}"`);
                     break;
                }
            }

            const score = isStandalone ? 2 : 1;
            //console.log(`Match score: ${score} (${isStandalone ? 'standalone' : 'embedded'})`);
            
            if (score > bestMatchScore) {
                bestMatchScore = score;
                foundTitle = title;
                //console.log(`New best match!`);
                // If we found an exact standalone match, that's the best we can do.
                if (score === 2) {
                    //console.log(`  → ✓ Perfect match found, stopping search`);
                    break; 
                }
            }
        }
    }

    // Second pass: Fuzzy match if no good exact match found
    if (!foundTitle && bestMatchScore < 2) {
        //console.log('\n=== Starting Fuzzy Matching ===');
        const levenshtein = require('fast-levenshtein');
        let bestFuzzyDistance = Infinity;

        for (const title of sortedTitles) {
            // Skip very short titles for fuzzy matching to avoid noise
            if (title.length <= 3) continue;

            // Use higher threshold for Japanese titles (they're harder to OCR correctly)
            const titleHasJapanese = hasJapanese(title);
            const MAX_DISTANCE_THRESHOLD = titleHasJapanese ? 5 : 3;

            for (const line of lines) {
                // Optimization: if line length difference is too big, skip
                if (Math.abs(line.length - title.length) > MAX_DISTANCE_THRESHOLD) continue;

                const distance = levenshtein.get(line.toLowerCase(), title.toLowerCase());
                
                if (distance <= MAX_DISTANCE_THRESHOLD && distance < bestFuzzyDistance) {
                    bestFuzzyDistance = distance;
                    //console.log(`Fuzzy match: "${title}" ~ "${line}" (distance: ${distance})`);
                    
                    // Only update if we don't have a better match already
                    if (bestMatchScore < 1) { 
                        foundTitle = title;
                        //console.log(`New best fuzzy match!`);
                    }
                }
            }
        }
    }
    
    //console.log(`\n=== Final Title Match: "${foundTitle}" ===\n`);
    extractedData["Song Title"] = foundTitle;

    // --- 2. Extract Score ---
    // HEURISTIC: Score must have exactly 6 or 7 digits.
    // We look for all number-like patterns, including those separated by noise characters.
    
    // First, try to find patterns where numbers might be separated by noise (e.g., "990;7:20" -> "990720")
    // Look for sequences of digits with occasional noise characters in between
    const noisyNumberPattern = /\d+(?:[,;:\s]\d+)+/g;
    const noisyMatches = fullText.match(noisyNumberPattern) || [];
    
    // Also get regular number matches
    const numberMatches = fullText.match(/[0-9,]+/g) || [];
    
    // Combine both and deduplicate
    const allMatches = [...new Set([...noisyMatches, ...numberMatches])];
    
    //console.log('All number matches:', allMatches);
    let bestScore = null;

    if (allMatches.length > 0) {
        for (const match of allMatches) {
            // Remove commas, colons, semicolons, and spaces
            const cleanNumStr = match.replace(/[,;:\s]/g, '');
            
            // Check if it is exactly 6 or 7 digits
            if (/^\d{6,7}$/.test(cleanNumStr)) {
                const num = parseInt(cleanNumStr, 10);
                
                // Validate range (DDR max score is 1,000,000)
                if (num <= 1000000) {
                    // If multiple candidates found, we need a strategy.
                    // Often the score is the largest value, but dates can be tricky (e.g. 241125).
                    // However, 6-digit dates usually start with year/day which might be low.
                    // Let's pick the largest valid score found as a reasonable default.
                    if (bestScore === null || num > bestScore) {
                        bestScore = num;
                        //console.log('Found potential score:', num, 'from match:', match);
                    }
                }
            }
        }
    }
    extractedData["Score"] = bestScore;

    // --- 3. Extract Difficulty Level ---
    // Look for difficulty labels and capture the number (1-20).
    // The pattern now captures both the label name and the number
    console.log('\n=== Starting Difficulty Matching ===');
    console.log('Full text:', fullText);
    // Match difficulty label followed by 1-2 digit number (levels are 1-20)
    const difficultyMatch = /(BEGINNER|BASIC|DIFFICULT|EXPERT|CHALLENGE|SINGLE|DOUBLE)\s*(?:score)?\s*([0-9]{1,2})\b/i.exec(fullText);

    if (difficultyMatch) {
        const difficultyName = difficultyMatch[1].toUpperCase(); // The matched label
        const num = parseInt(difficultyMatch[2].trim(), 10); // The number
        console.log('Exact difficulty match found:', difficultyMatch[0]);
        console.log('  Difficulty name:', difficultyName);
        console.log('  Difficulty level:', num);
        // Validate the number is a reasonable difficulty level
        if (!isNaN(num) && num > 0 && num <= 20) { 
             extractedData["Difficulty Level"] = num.toString();
             extractedData["Difficulty Name"] = difficultyName;
             console.log('  ✓ Valid difficulty (1-20), accepted!');
        } else {
             console.log('  ✗ Invalid difficulty level (must be 1-20), rejected');
        }
    } else {
        console.log('✗ No exact difficulty match found');
    }

    // Attempt 2: Fuzzy Match if no exact match found
    if (!extractedData["Difficulty Level"]) {
        //console.log('\n=== Starting Fuzzy Difficulty Matching ===');
        const levenshtein = require('fast-levenshtein');
        const difficultyLabels = ["BEGINNER", "BASIC", "DIFFICULT", "EXPERT", "CHALLENGE"];
        
        for (const line of lines) {
            // Check each word in the line against difficulty labels
            const words = line.split(/\s+/);
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                // Check if this word is a fuzzy match for any difficulty label
                for (const label of difficultyLabels) {
                    if (Math.abs(word.length - label.length) > 2) continue; // Optimization

                    const dist = levenshtein.get(word.toUpperCase(), label);
                    if (dist <= 2) {
                        //console.log(`Fuzzy match: "${word}" ~ "${label}" (distance: ${dist})`);
                        // Found a fuzzy match for a label!
                        // Now look for a number in the rest of the line or the next line
                        
                        // Check rest of this line
                        const restOfLine = words.slice(i + 1).join(' ');
                        let numMatch = /(\d+)/.exec(restOfLine);
                        
                        if (numMatch) {
                            //console.log(`Found number on same line: ${numMatch[1]}`);
                        }
                        
                        // If not found, check the very next line (common in OCR)
                        if (!numMatch) {
                            const lineIndex = lines.indexOf(line);
                            if (lineIndex < lines.length - 1) {
                                const nextLine = lines[lineIndex + 1];
                                numMatch = /^(\d+)/.exec(nextLine); // Number should be at start of next line
                                if (numMatch) {
                                    //console.log(`Found number on next line: ${numMatch[1]}`);
                                }
                            }
                        }

                        if (numMatch) {
                            const num = parseInt(numMatch[1], 10);
                            if (!isNaN(num) && num > 0 && num <= 20) {
                                extractedData["Difficulty Level"] = num.toString();
                                extractedData["Difficulty Name"] = label; // Use the matched label
                                //console.log(`Valid difficulty found: ${label} ${num}`);
                                break; // Found it
                            } else {
                                //console.log(`Number ${num} out of range (1-20)`);
                            }
                        } else {
                            //console.log(`No number found near "${word}"`);
                        }
                    }
                }
                if (extractedData["Difficulty Level"]) break;
            }
            if (extractedData["Difficulty Level"]) break;
        }
    }
    
    //console.log(`\n=== Final Difficulty: ${extractedData["Difficulty Name"]} ${extractedData["Difficulty Level"]} ===\n`);

    return extractedData;
}

module.exports = { extractRhythmGameData };