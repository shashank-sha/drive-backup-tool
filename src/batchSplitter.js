import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import dotenv from 'dotenv';
import readline from 'readline';
import { UNWANTED_FILES, INPUT_DIR, BATCH_DIR } from './constants.js';

dotenv.config();

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE);
const RENAME_FILES = process.env.RENAME_INPUT_FILES === 'true';
const MAX_FILENAME_LENGTH = 100; // Maximum length for filenames

// File extensions to include (comma-separated, default to '*' for all files)
const ALLOWED_EXTENSIONS = process.env.ALLOWED_EXTENSIONS ? 
  process.env.ALLOWED_EXTENSIONS.split(',').map(ext => {
    const trimmed = ext.trim().toLowerCase();
    // Add dot if not present and not wildcard
    return trimmed === '*' ? '*' : (trimmed.startsWith('.') ? trimmed : '.' + trimmed);
  }) : 
  ['*'];

// ANSI color codes for user-facing errors
const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RESET: '\x1b[0m'
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class EmptyInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EmptyInputError';
  }
}

/**
 * Check if a file has an allowed extension
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if the file has an allowed extension
 */
function hasAllowedExtension(filePath) {
  // If ALLOWED_EXTENSIONS contains '*', allow all files
  if (ALLOWED_EXTENSIONS.includes('*')) {
    return true;
  }
  
  const fileExtension = path.extname(filePath).toLowerCase();
  const isAllowed = ALLOWED_EXTENSIONS.includes(fileExtension);
  
  // Debug logging
  console.log(`DEBUG: File: ${path.basename(filePath)}, Extension: ${fileExtension}, Allowed: ${isAllowed}, Allowed Extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
  
  return isAllowed;
}

/**
 * Show progress bar
 * @param {number} current - Current progress
 * @param {number} total - Total items
 * @param {string} prefix - Prefix message
 */
function showProgress(current, total, prefix = '') {
  const width = 40;
  const progress = Math.round((current / total) * width);
  const percentage = Math.round((current / total) * 100);
  
  const bar = '█'.repeat(progress) + '░'.repeat(width - progress);
  process.stdout.write(`\r${prefix} ${bar} ${percentage}% (${current}/${total})`);
  
  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * Show user-facing error message in red and exit process
 * @param {string} message - Error message to display
 */
function showUserErrorAndExit(message) {
  console.error(`${COLORS.RED}${message}${COLORS.RESET}`);
  process.exit(1);
}

/**
 * Show success message in green
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
  console.log(`${COLORS.GREEN}${message}${COLORS.RESET}`);
}

/**
 * Show warning message in yellow
 * @param {string} message - Warning message to display
 */
function showWarning(message) {
  console.warn(`${COLORS.YELLOW}${message}${COLORS.RESET}`);
}

/**
 * Generate a meaningful name for a file or directory
 * @param {string} fullPath - Full path of the file/directory
 * @param {string} baseDir - Base directory for relative path calculation
 * @param {number} index - Index for numbering
 * @param {boolean} isDirectory - Whether this is a directory
 * @returns {string} New name for the file/directory
 */
function generateReadableName(fullPath, baseDir, index, isDirectory = false) {
  // Skip if it's a system file
  const fileName = path.basename(fullPath);
  if (UNWANTED_FILES.includes(fileName)) {
    return fileName;
  }

  const relativePath = path.relative(baseDir, fullPath);
  const parts = relativePath.split(path.sep);
  
  // Get the main category (e.g., "Wedding")
  const mainCategory = parts[0];
  
  // Get the subcategory (e.g., "Photos - Regular", "Videos - Vipin")
  const subCategory = parts.length > 1 ? parts[1] : '';
  
  // Get the current name without extension
  const currentName = path.basename(parts[parts.length - 1], path.extname(parts[parts.length - 1]));
  const ext = path.extname(parts[parts.length - 1]).toLowerCase();
  
  // Clean the names (remove special characters, handle spaces based on format)
  const cleanMain = mainCategory.match(/\s*-\s*/)
    ? mainCategory.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
    : mainCategory.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  
  const cleanSub = subCategory.match(/\s*-\s*/)
    ? subCategory.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()
    : subCategory.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  
  if (isDirectory) {
    // For directories, use a simple format: category_subcategory
    const dirName = cleanSub ? `${cleanMain}_${cleanSub}` : cleanMain;
    return dirName.substring(0, MAX_FILENAME_LENGTH);
  } else {
    // For files, maintain the original file number/identifier if it exists
    const fileIdentifier = currentName.match(/^[A-Za-z]+\d+/)?.[0] || 
                          currentName.match(/^[A-Za-z]+/)?.[0] || 
                          currentName;
    
    // Format: category_subcategory_identifier.ext
    const fullName = `${cleanMain}_${cleanSub}_${fileIdentifier.toLowerCase()}${ext}`;
    
    // If name is too long, truncate it while keeping the extension
    if (fullName.length > MAX_FILENAME_LENGTH) {
      const extLength = ext.length;
      const baseLength = MAX_FILENAME_LENGTH - extLength - 1; // -1 for the dot
      return fullName.substring(0, baseLength) + ext;
    }
    
    return fullName;
  }
}

/**
 * Check if a file should be ignored
 * @param {string} name - File or directory name
 * @returns {boolean} True if the file should be ignored
 */
function shouldIgnore(name) {
  // Check exact matches
  if (UNWANTED_FILES.includes(name)) {
    return true;
  }
  
  // Check if it's a hidden file/directory
  if (name.startsWith('.')) {
    return true;
  }
  
  // Check for variations of .DS_Store
  if (name.toLowerCase().includes('.ds_store')) {
    return true;
  }
  
  return false;
}

/**
 * Get all files in a directory recursively with new names if renaming is enabled
 * @param {string} dir - Directory to scan
 * @param {string} baseDir - Base directory for relative paths
 * @returns {Array<{path: string, size: number, newName: string}>} Array of file objects
 */
function getAllFiles(dir, baseDir = dir) {
  const files = [];
  let entries;
  
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    console.error(`\nError reading directory ${dir}: ${error.message}`);
    return files;
  }

  // Filter out ignored entries first
  entries = entries.filter(entry => !shouldIgnore(entry.name));
  
  if (entries.length === 0) {
    return files;
  }

  let fileIndex = 1;
  let processedCount = 0;
  const totalEntries = entries.length;
  
  for (const entry of entries) {
    processedCount++;
    showProgress(processedCount, totalEntries, 'Scanning:');
    
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively get files from subdirectory
      const subFiles = getAllFiles(fullPath, baseDir);
      
      if (RENAME_FILES) {
        // Rename the directory itself
        const newDirName = generateReadableName(fullPath, baseDir, fileIndex++, true);
        const newDirPath = path.join(path.dirname(fullPath), newDirName);
        
        // Only rename if the new name is different
        if (newDirName !== entry.name) {
          try {
            fs.renameSync(fullPath, newDirPath);
            // Update paths in subFiles to reflect the new directory name
            subFiles.forEach(file => {
              file.path = file.path.replace(fullPath, newDirPath);
            });
          } catch (error) {
            console.warn(`\nCould not rename directory ${fullPath}: ${error.message}`);
          }
        }
      }
      
      files.push(...subFiles);
    } else if (entry.isFile()) {
      // Check if file has an allowed extension
      if (!hasAllowedExtension(fullPath)) {
        continue; // Skip files with disallowed extensions
      }
      
      const newName = RENAME_FILES ? 
        generateReadableName(fullPath, baseDir, fileIndex++) : 
        entry.name;
      
      try {
        const stats = fs.statSync(fullPath);
        // Add file with its size and new name
        files.push({
          path: fullPath,
          size: stats.size,
          newName: newName
        });

        // Rename the file if needed
        if (RENAME_FILES && newName !== entry.name) {
          const newPath = path.join(path.dirname(fullPath), newName);
          fs.renameSync(fullPath, newPath);
          // Update the path in our file object
          files[files.length - 1].path = newPath;
        }
      } catch (error) {
        console.warn(`\nCould not process file ${fullPath}: ${error.message}`);
      }
    }
  }

  return files;
}

/**
 * Check if directory is empty
 * @param {string} dir - Directory to check
 * @returns {boolean} True if directory is empty or doesn't exist
 */
function isDirectoryEmpty(dir) {
  try {
    if (!fs.existsSync(dir)) {
      return true;
    }
    
    // Read directory with hidden files
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    // Filter out . and .. entries and check if any real files/directories exist
    const hasContent = entries.some(entry => {
      // Skip . and .. entries
      if (entry.name === '.' || entry.name === '..') {
        return false;
      }
      
      // Skip hidden files and directories
      if (entry.name.startsWith('.')) {
        return false;
      }
      
      // Skip system files
      if (UNWANTED_FILES.includes(entry.name)) {
        return false;
      }
      
      return true;
    });
    
    return !hasContent;
  } catch (error) {
    console.error(`Error checking directory ${dir}: ${error.message}`);
    return false; // Return false on error to prevent processing
  }
}

/**
 * Safely remove directory and its contents
 * @param {string} dir - Directory to remove
 */
function removeDirectory(dir) {
  try {
    if (fs.existsSync(dir)) {
      fse.removeSync(dir);
    }
  } catch (error) {
    console.error(`Error removing directory ${dir}: ${error.message}`);
  }
}

/**
 * Ask user for confirmation
 * @param {string} question - Question to ask
 * @returns {Promise<boolean>} User's response
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * List directory contents
 * @param {string} dir - Directory to list
 * @returns {string[]} List of items in directory
 */
function listDirectoryContents(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter(entry => 
        entry.name !== '.' && 
        entry.name !== '..' && 
        !entry.name.startsWith('.') && 
        !UNWANTED_FILES.includes(entry.name)
      )
      .map(entry => `- ${entry.name}${entry.isDirectory() ? '/' : ''}`);
  } catch (error) {
    return [];
  }
}

/**
 * Create batches of files while maintaining directory structure
 * @param {string} inputDir - Input directory containing files to batch
 * @param {string} batchDir - Directory where batches will be created
 */
async function createBatches(inputDir, batchDir) {
  console.log('\nScanning directories and files...');

  // Log extension filter information
  if (ALLOWED_EXTENSIONS.includes('*')) {
    console.log('📁 Processing all file types');
  } else {
    console.log(`📁 Processing only files with extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }
  
  if(RENAME_FILES)
    console.warn('\nRenaming directories and files...');
  
  // Get all files recursively with new names if renaming is enabled
  const allFiles = getAllFiles(inputDir);
  
  if (allFiles.length === 0) {
    showUserErrorAndExit('No valid files found in input directory. Please add some files to process.');
  }

  // Check if batches directory has existing files
  if (fs.existsSync(batchDir)) {
    const contents = listDirectoryContents(batchDir);
    if (contents.length > 0) {
      console.log(`\n${COLORS.YELLOW}Found existing files in batches directory:${COLORS.RESET}`);
      contents.forEach(item => console.log(item));
      showUserErrorAndExit(
        '\nPlease manually delete all files and folders in the batches directory before proceeding.'
      );
    }
  }
  
  // Create batches directory if it doesn't exist
  if (!fs.existsSync(batchDir)) {
    fse.ensureDirSync(batchDir);
    console.log('✅ Created fresh batches directory');
  }

  // Check if input directory exists
  if (!fs.existsSync(inputDir)) {
    showUserErrorAndExit(`Input directory '${inputDir}' does not exist`);
  }

  console.log(`\nFound ${allFiles.length} files to process`);
  console.log('\nCreating batches...');

  // Group files by their original subfolder (relative to inputDir)
  const filesBySubfolder = {};
  for (const file of allFiles) {
    const relPath = path.relative(inputDir, file.path);
    const parts = relPath.split(path.sep);
    const subfolder = parts.length > 1 ? parts[0] : 'root';
    if (!filesBySubfolder[subfolder]) filesBySubfolder[subfolder] = [];
    filesBySubfolder[subfolder].push({ ...file, relPath });
  }

  let batchIndex = 0;
  let currentBatchSize = 0;
  let currentBatchPath = null;
  // Track subfolder indices for naming
  const subfolderIndices = {};
  // Track which subfolder index is used in the current batch
  let currentBatchSubfolders = {};

  // Flatten all files, but keep their subfolder info
  const allFilesFlat = Object.values(filesBySubfolder).flatMap(files =>
    files.sort((a, b) => {
      const aStat = fs.statSync(a.path);
      const bStat = fs.statSync(b.path);
      return aStat.birthtimeMs - bStat.birthtimeMs;
    })
  );

  let processedFiles = 0;
  const totalFiles = allFilesFlat.length;

  for (const file of allFilesFlat) {
    processedFiles++;
    showProgress(processedFiles, totalFiles, 'Batching:');

    const relPath = file.relPath;
    const parts = relPath.split(path.sep);
    const subfolder = parts.length > 1 ? parts[parts.length - 2] : 'root';

    // If file is larger than batch size, put it in its own batch
    if (file.size > BATCH_SIZE) {
      batchIndex++;
      currentBatchSize = 0;
      currentBatchPath = path.join(batchDir, `batch_${batchIndex.toString().padStart(2, '0')}`);
      // Track subfolder index for this subfolder
      if (!subfolderIndices[subfolder]) subfolderIndices[subfolder] = 1;
      else subfolderIndices[subfolder]++;
      const batchSubfolderName = subfolder === 'root' ? `root_${subfolderIndices[subfolder].toString().padStart(2, '0')}` : `${subfolder}_${subfolderIndices[subfolder].toString().padStart(2, '0')}`;
      const targetSubfolderPath = path.join(currentBatchPath, batchSubfolderName);
      fse.ensureDirSync(targetSubfolderPath);
      fse.copySync(file.path, path.join(targetSubfolderPath, file.newName));
      continue;
    }

    // If adding this file would exceed the batch size, start a new batch
    if (currentBatchSize + file.size > BATCH_SIZE || !currentBatchPath) {
      batchIndex++;
      currentBatchSize = 0;
      currentBatchPath = path.join(batchDir, `batch_${batchIndex.toString().padStart(2, '0')}`);
      currentBatchSubfolders = {};
    }

    // Track subfolder index for this subfolder in the current batch
    if (!currentBatchSubfolders[subfolder]) {
      if (!subfolderIndices[subfolder]) subfolderIndices[subfolder] = 1;
      else subfolderIndices[subfolder]++;
      currentBatchSubfolders[subfolder] = subfolderIndices[subfolder];
    }
    const subfolderIndex = currentBatchSubfolders[subfolder];
    const batchSubfolderName = subfolder === 'root' ? `root_${subfolderIndex.toString().padStart(2, '0')}` : `${subfolder}_${subfolderIndex.toString().padStart(2, '0')}`;
    const targetSubfolderPath = path.join(currentBatchPath, batchSubfolderName);
    fse.ensureDirSync(targetSubfolderPath);
    fse.copySync(file.path, path.join(targetSubfolderPath, file.newName));
    currentBatchSize += file.size;
    //console.log('currentBatchSize', currentBatchSize);
  }

  console.log(`\n✅ Created ${batchIndex} batches successfully`);
  return true;
}

/**
 * Save a batch of files to the specified batch directory
 * @param {Array<{path: string, size: number, relativePath: string}>} files - Files to save
 * @param {string} batchPath - Path where batch should be saved
 */
function saveBatch(files, batchPath) {
  // Create batch directory
  fse.ensureDirSync(batchPath);

  // Copy each file maintaining its directory structure
  for (const file of files) {
    const targetPath = path.join(batchPath, file.relativePath);
    const targetDir = path.dirname(targetPath);
    
    // Ensure the target directory exists
    fse.ensureDirSync(targetDir);
    
    // Copy the file
    fse.copySync(file.path, targetPath);
  }

  // Create a manifest file for the batch
  const manifest = {
    batchPath,
    fileCount: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    files: files.map(f => ({
      path: f.relativePath,
      size: f.size
    }))
  };

  fse.writeJsonSync(path.join(batchPath, 'batch_manifest.json'), manifest, { spaces: 2 });
}

export { createBatches, EmptyInputError };
