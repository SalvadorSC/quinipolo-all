const fs = require('fs');
const path = require('path');

const TEAMS_CSV = path.join(__dirname, '..', 'mock-data', 'teams.csv');
const LOGOS_DIR = path.join(__dirname, '..', 'teams_logos');

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
 * Gets base filename without extension
 */
function getBaseFilename(filename) {
  return path.basename(filename, path.extname(filename));
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
  // Read teams CSV
  const csvContent = fs.readFileSync(TEAMS_CSV, 'utf-8');
  const teams = parseCSV(csvContent);

  // Get all logo files
  const logoFiles = fs.readdirSync(LOGOS_DIR).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
  });

  console.log(`📊 Checking logos for ${teams.length} teams...\n`);

  const teamsWithLogos = [];
  const teamsWithoutLogos = [];

  for (const team of teams) {
    const teamName = team.teamName.trim();
    const matchingLogo = findMatchingLogo(teamName, logoFiles);

    if (matchingLogo) {
      teamsWithLogos.push({ name: teamName, logo: matchingLogo });
    } else {
      teamsWithoutLogos.push({ name: teamName });
    }
  }

  // Display results
  console.log(`✅ Teams WITH logos (${teamsWithLogos.length}):`);
  console.log('─'.repeat(60));
  for (const { name, logo } of teamsWithLogos) {
    console.log(`  ${name.padEnd(35)} → ${logo}`);
  }

  console.log(`\n❌ Teams WITHOUT logos (${teamsWithoutLogos.length}):`);
  console.log('─'.repeat(60));
  for (const { name } of teamsWithoutLogos) {
    console.log(`  ${name}`);
  }

  console.log(`\n📈 Summary:`);
  console.log(`   Total teams: ${teams.length}`);
  console.log(`   With logos: ${teamsWithLogos.length} (${Math.round(teamsWithLogos.length / teams.length * 100)}%)`);
  console.log(`   Without logos: ${teamsWithoutLogos.length} (${Math.round(teamsWithoutLogos.length / teams.length * 100)}%)`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
