const fs = require('fs');
const path = require('path');

const TEAMS_CSV = path.join(__dirname, '..', 'mock-data', 'teams.csv');
const LOGOS_DIR = path.join(__dirname, '..', 'teams_logos');

/**
 * Normalizes a team name for filename (uppercase, spaces to underscores, handle accented chars)
 */
function normalizeForFilename(name) {
  // Remove accents/diacritics
  const withoutAccents = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  return withoutAccents
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Gets base filename without extension
 */
function getBaseFilename(filename) {
  return path.basename(filename, path.extname(filename));
}

/**
 * Gets file extension
 */
function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Normalizes a team name for comparison (removes spaces, converts to uppercase)
 */
function normalizeForComparison(name) {
  return name
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_');
}

/**
 * Checks if a team name matches any logo filename
 */
function findMatchingLogo(teamName, logoFiles) {
  // Remove " F" or " B" suffix for logo matching (female/B teams use same logo)
  let teamNameForMatching = teamName;
  if (teamNameForMatching.endsWith(' F') || teamNameForMatching.endsWith(' B')) {
    teamNameForMatching = teamNameForMatching.slice(0, -2).trim();
  }
  
  // Remove "CN " prefix for matching (CN teams use same logo as main team)
  // e.g., "CN Mataró" should match "MATARO.jpg" same as "Mataró"
  if (teamNameForMatching.startsWith('CN ')) {
    teamNameForMatching = teamNameForMatching.slice(3).trim();
  }
  
  const normalizedTeam = normalizeForComparison(teamNameForMatching);
  
  // Try exact match first
  for (const logoFile of logoFiles) {
    const logoBase = getBaseFilename(logoFile);
    const normalizedLogo = normalizeForComparison(logoBase);
    
    if (normalizedTeam === normalizedLogo) {
      return logoFile;
    }
  }
  
  // Try partial match (team name contains logo name or vice versa)
  for (const logoFile of logoFiles) {
    const logoBase = getBaseFilename(logoFile);
    const normalizedLogo = normalizeForComparison(logoBase);
    
    // Check if team name contains logo name (e.g., "CN Barcelona" matches "BARCELONA")
    if (normalizedTeam.includes(normalizedLogo) || normalizedLogo.includes(normalizedTeam)) {
      // Make sure it's a reasonable match (logo name should be at least 4 chars)
      if (normalizedLogo.length >= 4) {
        return logoFile;
      }
    }
  }
  
  return null;
}

/**
 * Simple CSV parser
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse header
  const header = lines[0].split(',').map(col => col.replace(/^"|"$/g, '').trim());
  
  // Parse rows
  const teams = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing (handles quoted values)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const team = {};
    header.forEach((key, index) => {
      team[key] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
    });
    teams.push(team);
  }
  
  return teams;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be renamed\n');
  }

  // Read teams CSV
  const csvContent = fs.readFileSync(TEAMS_CSV, 'utf-8');
  const teams = parseCSV(csvContent);

  // Get all logo files
  const logoFiles = fs.readdirSync(LOGOS_DIR).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
  });

  console.log(`📊 Processing ${teams.length} teams...\n`);

  // Map: team name -> logo file
  const teamToLogoMap = new Map();
  // Map: logo file -> team names (for handling duplicates)
  const logoToTeamsMap = new Map();
  
  // Build mappings
  for (const team of teams) {
    const teamName = team.teamName.trim();
    const matchingLogo = findMatchingLogo(teamName, logoFiles);
    
    if (matchingLogo) {
      teamToLogoMap.set(teamName, matchingLogo);
      
      if (!logoToTeamsMap.has(matchingLogo)) {
        logoToTeamsMap.set(matchingLogo, []);
      }
      logoToTeamsMap.get(matchingLogo).push(teamName);
    }
  }

  // Determine target filename for each logo
  // For logos shared by multiple teams, prefer:
  // 1. Team name without " F" or " B" suffix
  // 2. Shortest name (prefer simpler names like "Barcelona" over "CN Barcelona")
  // 3. If all teams have "CN" prefix, use the CN name
  const logoRenames = new Map();
  
  for (const [logoFile, teamNames] of logoToTeamsMap.entries()) {
    // Check if all teams have CN prefix
    const allHaveCN = teamNames.every(name => name.startsWith('CN '));
    
    // Sort teams by priority
    const sortedTeams = teamNames.sort((a, b) => {
      const aHasSuffix = a.endsWith(' F') || a.endsWith(' B');
      const bHasSuffix = b.endsWith(' F') || b.endsWith(' B');
      
      // Prefer teams without suffix
      if (aHasSuffix !== bHasSuffix) {
        return aHasSuffix ? 1 : -1;
      }
      
      // If all teams have CN prefix, prefer CN names
      // Otherwise, prefer shorter names (simpler names like "Barcelona" over "CN Barcelona")
      if (allHaveCN) {
        const aHasCN = a.startsWith('CN ');
        const bHasCN = b.startsWith('CN ');
        if (aHasCN !== bHasCN) {
          return bHasCN ? 1 : -1; // Prefer CN prefix when all have it
        }
      } else {
        // Prefer shorter names (simpler names)
        const aLen = a.length;
        const bLen = b.length;
        if (aLen !== bLen) return aLen - bLen;
      }
      
      // Finally, alphabetical
      return a.localeCompare(b);
    });
    
    // Use the first team name (highest priority)
    const targetTeamName = sortedTeams[0];
    const normalizedName = normalizeForFilename(targetTeamName);
    const extension = getExtension(logoFile);
    const targetFilename = `${normalizedName}${extension}`;
    
    logoRenames.set(logoFile, {
      targetFilename,
      targetTeamName,
      allTeams: sortedTeams,
    });
  }

  // Display planned renames
  console.log('📝 Planned renames:');
  console.log('─'.repeat(80));
  
  const renames = Array.from(logoRenames.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );
  
  for (const [oldFile, { targetFilename, targetTeamName, allTeams }] of renames) {
    const oldPath = path.join(LOGOS_DIR, oldFile);
    const newPath = path.join(LOGOS_DIR, targetFilename);
    
    if (oldFile === targetFilename) {
      console.log(`  ✓ ${oldFile.padEnd(40)} → (already correct)`);
    } else if (fs.existsSync(newPath)) {
      console.log(`  ⚠️  ${oldFile.padEnd(40)} → ${targetFilename} (SKIP: target exists)`);
    } else {
      const sharedInfo = allTeams.length > 1 ? ` (shared by ${allTeams.length} teams)` : '';
      console.log(`  → ${oldFile.padEnd(40)} → ${targetFilename}${sharedInfo}`);
      if (allTeams.length > 1) {
        console.log(`    Teams: ${allTeams.join(', ')}`);
      }
    }
  }

  // Perform renames
  if (!dryRun) {
    console.log(`\n🔄 Renaming files...`);
    let renamed = 0;
    let skipped = 0;
    
    for (const [oldFile, { targetFilename }] of renames) {
      if (oldFile === targetFilename) {
        skipped++;
        continue;
      }
      
      const oldPath = path.join(LOGOS_DIR, oldFile);
      const newPath = path.join(LOGOS_DIR, targetFilename);
      
      if (fs.existsSync(newPath)) {
        console.log(`  ⚠️  Skipping ${oldFile} (target ${targetFilename} already exists)`);
        skipped++;
        continue;
      }
      
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`  ✓ Renamed: ${oldFile} → ${targetFilename}`);
        renamed++;
      } catch (error) {
        console.error(`  ✗ Error renaming ${oldFile}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Summary:`);
    console.log(`   Renamed: ${renamed}`);
    console.log(`   Skipped: ${skipped} (already correct or target exists)`);
  } else {
    console.log(`\n💡 Run without --dry-run to perform the renames`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
