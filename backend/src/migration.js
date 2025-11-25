const mongoose = require('mongoose');
const fs = require('fs');
const Song = require('./models/Song'); // Import the model
const path = require('path');

// 1. Configuration
// *** NEW: Directory where your individual song JSON files are located ***
// 2. Define the mapping between source keys and schema enum names
const DIFFICULTY_MAPPING = {
    'beginner': 'Beginner',
    'easy': 'Basic',
    'medium': 'Difficult',
    'hard': 'Expert',
    'challenge': 'Challenge'
};

/**
 * Transforms a single song object from the source format to the Mongoose schema format.
 * @param {object} sourceSong - The raw JSON song object.
 * @returns {object} The transformed song object ready for Mongoose insertion.
 */
function transformSong(sourceSong) {
    const transformedDifficulties = [];

    // Helper function to extract and map difficulties for SP or DP
    const extractDifficulties = (chartData) => {
        if (!chartData) return;

        // Iterate over difficulty keys (e.g., 'beginner', 'easy')
        for (const [sourceKey, score] of Object.entries(chartData)) {
            const mappedName = DIFFICULTY_MAPPING[sourceKey];

            if (mappedName && score !== undefined) {
                // Pushing the object that matches the difficultySchema structure
                transformedDifficulties.push({
                    name: mappedName,
                    score: score
                });
            }
        }
    };

    // Extracting difficulties ONLY from Single Play (sp)
    extractDifficulties(sourceSong.sp);
    // REMOVED: extractDifficulties(sourceSong.dp); // Double Play is now ignored
    
    // Return the final object matching the Song schema structure
    return {
        title: sourceSong.title || sourceSong.name, // Use title or fall back to name
        series: sourceSong.version,
        bpm_range: sourceSong.charts[0].bpm_range,
        difficulties: transformedDifficulties
    };
}


// 3. Migration Execution Function
async function migrateData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI, {});
        console.log('MongoDB connected successfully!');

        // 4. Load Source Data from Directory
        console.log(`Reading files from directory: ${SOURCE_DIR}...`);
        
        // Read all files in the directory and filter for JSON files
        const fileNames = fs.readdirSync(SOURCE_DIR).filter(file => file.endsWith('.json'));
        console.log(`Found ${fileNames.length} JSON files to process.`);

        const sourceSongs = [];
        let filesProcessed = 0;
        let filesSkipped = 0;

        // Load and parse each file individually
        for (const fileName of fileNames) {
            const filePath = path.join(SOURCE_DIR, fileName);
            try {
                const rawData = fs.readFileSync(filePath, 'utf8');
                const songData = JSON.parse(rawData);
                sourceSongs.push(songData);
                filesProcessed++;
            } catch (error) {
                // Log and skip files that are unreadable or invalid JSON
                console.error(`Error processing file ${fileName}: Skipped. Reason: ${error.message}`);
                filesSkipped++;
            }
        }
        
        console.log(`Successfully read ${filesProcessed} songs from ${fileNames.length} files.`);
        if (filesSkipped > 0) {
            console.log(`${filesSkipped} files were skipped due to errors.`);
        }


        // 5. Transform All Data
        console.log('Starting data transformation...');
        const transformedSongs = sourceSongs
            .map(song => {
                try {
                    return transformSong(song);
                } catch (error) {
                    // Log errors during transformation
                    console.error(`Error transforming song: ${song.title || song.name || 'Unknown Song'}`, error.message);
                    return null; // Skip corrupted records
                }
            })
            .filter(song => song !== null); // Remove any failed transformations

        console.log(`Successfully prepared ${transformedSongs.length} songs for insertion.`);

        // 6. Bulk Insertion
        if (transformedSongs.length > 0) {
            console.log('Starting bulk insertion into MongoDB...');
            // Optional: await Song.deleteMany({}); // Uncomment if you want to clear the collection first
            const result = await Song.insertMany(transformedSongs);
            console.log(`✅ Bulk insert complete! Inserted ${result.length} new documents.`);
        } else {
            console.log('No valid songs were found or transformed. Insertion skipped.');
        }

    } catch (error) {
        // Handle connection or overall file system errors
        console.error('Migration failed:', error);
    } finally {
        // 7. Disconnect
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
}

// Execute the migration
migrateData();
