import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createBatches } from './batchSplitter.js';
import { authorize, uploadBatch } from './driveUploader.js';
import { logToGoogleSheet } from './sheetLogger.js';
import { UNWANTED_FILES, INPUT_DIR, BATCH_DIR, CREDENTIALS_DIR } from './constants.js';

dotenv.config();

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

function getTotalSizeAndCount(dir, unwanted = UNWANTED_FILES) {
  let totalSize = 0;
  let totalCount = 0;
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip hidden/unwanted directories
        if (isUnwantedFile(entry.name) || entry.name.startsWith('.')) continue;
        walk(path.join(current, entry.name));
      } else if (entry.isFile()) {
        // Skip unwanted/hidden files
        if (isUnwantedFile(entry.name) || entry.name.startsWith('.')) continue;
        const stats = fs.statSync(path.join(current, entry.name));
        totalSize += stats.size;
        totalCount++;
      }
    }
  }
  walk(dir);
  return { totalSize, totalCount };
}

function printSizeInfo(label, size, count) {
  const mb = (size / 1048576).toFixed(2);
  console.log(`${label}: ${count} files, ${mb} MB (${size} bytes)`);
}

function isValidBatchDir(name) {
  return !name.startsWith('.') && !UNWANTED_FILES.includes(name);
}

function isUnwantedFile(name) {
  const lower = name.toLowerCase();
  return UNWANTED_FILES.some(pattern => lower.includes(pattern));
}

function askUserToProceed() {
  return new Promise(resolve => {
    process.stdout.write('Do you want to proceed with Drive upload? (y/n): ');
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.once('data', function(data) {
      process.stdin.pause();
      const answer = data.trim().toLowerCase();
      resolve(answer === 'y' || answer === 'yes');
    });
  });
}

async function main() {
  createBatches(INPUT_DIR, BATCH_DIR);

  // Check input_files and batches size/count before proceeding
  const inputStats = getTotalSizeAndCount(INPUT_DIR);
  const batchStats = getTotalSizeAndCount(BATCH_DIR);
  printSizeInfo('Input files', inputStats.totalSize, inputStats.totalCount);
  printSizeInfo('Batched files', batchStats.totalSize, batchStats.totalCount);
  // Print number of batches
  const batchFolders = fs.readdirSync(BATCH_DIR).filter(name => {
    const fullPath = path.join(BATCH_DIR, name);
    return isValidBatchDir(name) && fs.statSync(fullPath).isDirectory();
  });
  console.log(`\x1b[33m🗂️  Number of batches: ${batchFolders.length}\x1b[0m`);
  if (inputStats.totalSize !== batchStats.totalSize || inputStats.totalCount !== batchStats.totalCount) {
    console.log('\x1b[31mWarning: Input and batched files do not match!\x1b[0m');
  } else {
    console.log('\x1b[32mAll files batched correctly.\x1b[0m');
  }

  const proceed = await askUserToProceed();
  if (!proceed) {
    console.log('\nAborting as per user input.');
    process.exit(0);
  }

  console.log('\nDrive upload started...');

  //Authenticate once for Sheets logging (single account)
  const sheetCredentialsPath = path.join(CREDENTIALS_DIR, 'client_secret_account_sheet.json');
  const sheetAuth = await authorize(sheetCredentialsPath, 'sheet_account');

  for (let i = 0; i < batchFolders.length; i++) {
    const batchName = batchFolders[i];
    const folderPath = path.join(BATCH_DIR, batchName);
    const credentialsPath = path.join(CREDENTIALS_DIR, `client_secret_account${i + 1}.json`);

    // Authenticate with batch-specific account for Drive upload
    const driveAuth = await authorize(credentialsPath, `account${i + 1}`);
    const results = await uploadBatch(folderPath, driveAuth);
    await logToGoogleSheet(sheetAuth, SPREADSHEET_ID, batchName, results);

    console.log(`✅ Completed: ${batchName}`);
  }
}

main().catch(console.error);
