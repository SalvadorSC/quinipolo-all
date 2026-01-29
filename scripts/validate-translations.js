#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recursively extracts all keys from a nested object
 * Returns a Set of dot-notation keys (e.g., "autoFillModal.title")
 */
function extractKeys(obj, prefix = '') {
  const keys = new Set();
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively extract keys from nested objects
      const nestedKeys = extractKeys(value, fullKey);
      nestedKeys.forEach(k => keys.add(k));
    } else {
      // Leaf node - add the key
      keys.add(fullKey);
    }
  }
  
  return keys;
}

/**
 * Reads and parses a JSON translation file
 */
function readTranslationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Finds all translation files in a directory
 */
function findTranslationFiles(baseDir) {
  const translationFiles = [];
  
  if (!fs.existsSync(baseDir)) {
    return translationFiles;
  }
  
  const locales = fs.readdirSync(baseDir, { withFileTypes: true });
  
  for (const locale of locales) {
    if (locale.isDirectory()) {
      const translationPath = path.join(baseDir, locale.name, 'translation.json');
      if (fs.existsSync(translationPath)) {
        translationFiles.push({
          locale: locale.name,
          path: translationPath
        });
      }
    }
  }
  
  return translationFiles;
}

/**
 * Main validation function
 */
function validateTranslations() {
  const projectRoot = path.resolve(__dirname, '..');
  const feLocalesDir = path.join(projectRoot, 'quinipolo-fe', 'src', 'locales');
  const mobileLocalesDir = path.join(projectRoot, 'quinipolo-mobile', 'src', 'locales');
  
  // Find all translation files
  const feFiles = findTranslationFiles(feLocalesDir);
  const mobileFiles = findTranslationFiles(mobileLocalesDir);
  
  if (feFiles.length === 0 && mobileFiles.length === 0) {
    console.error('No translation files found!');
    process.exit(1);
  }
  
  // Validate frontend translations
  if (feFiles.length > 0) {
    console.log(`\n📋 Validating frontend translations (${feFiles.length} locales)...`);
    const feValid = validateTranslationSet(feFiles, 'Frontend');
    if (!feValid) {
      process.exit(1);
    }
  }
  
  // Validate mobile translations
  if (mobileFiles.length > 0) {
    console.log(`\n📱 Validating mobile translations (${mobileFiles.length} locales)...`);
    const mobileValid = validateTranslationSet(mobileFiles, 'Mobile');
    if (!mobileValid) {
      process.exit(1);
    }
  }
  
  console.log('\n✅ All translations are up to date!');
}

/**
 * Validates a set of translation files (frontend or mobile)
 */
function validateTranslationSet(files, setName) {
  const translations = new Map();
  const allKeys = new Set();
  
  // Read all translation files
  for (const file of files) {
    const data = readTranslationFile(file.path);
    const keys = extractKeys(data);
    translations.set(file.locale, keys);
    
    // Collect all unique keys across all locales
    keys.forEach(key => allKeys.add(key));
  }
  
  // Check if all locales have all keys
  let hasErrors = false;
  const missingKeys = new Map();
  
  for (const [locale, keys] of translations.entries()) {
    const missing = [];
    for (const key of allKeys) {
      if (!keys.has(key)) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      missingKeys.set(locale, missing);
      hasErrors = true;
    }
  }
  
  // Report results
  if (hasErrors) {
    console.error(`\n❌ ${setName} translations are NOT synchronized!\n`);
    
    for (const [locale, missing] of missingKeys.entries()) {
      console.error(`  Missing keys in ${locale}:`);
      missing.forEach(key => {
        console.error(`    - ${key}`);
      });
      console.error('');
    }
    
    // Show which locales have extra keys
    for (const [locale, keys] of translations.entries()) {
      const extra = [];
      for (const key of keys) {
        let foundInAll = true;
        for (const [otherLocale, otherKeys] of translations.entries()) {
          if (otherLocale !== locale && !otherKeys.has(key)) {
            foundInAll = false;
            break;
          }
        }
        if (!foundInAll) {
          extra.push(key);
        }
      }
      
      if (extra.length > 0) {
        console.error(`  Extra keys in ${locale} (not in all locales):`);
        extra.forEach(key => {
          console.error(`    - ${key}`);
        });
        console.error('');
      }
    }
    
    return false;
  } else {
    console.log(`  ✅ All ${files.length} locales have the same keys (${allKeys.size} total keys)`);
    return true;
  }
}

// Run validation
validateTranslations();


