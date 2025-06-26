import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { google } from 'googleapis';
import { UNWANTED_FILES } from './constants.js';

const TOKEN_DIR = './tokens';

async function authorize(credentialsPath, accountLabel) {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const { client_secret, client_id } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost');
  const tokenPath = path.join(TOKEN_DIR, `${accountLabel}.json`);

  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets']
  });

  console.log(`Authorize "${accountLabel}" by visiting:\n${authUrl}`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const code = await new Promise(resolve => {
    rl.question('Enter code from browser(In case the browser cannot open the url, copy the code parameter from the url): ', answer => {
      rl.close();
      resolve(answer);
    });
  });

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.mkdirSync(TOKEN_DIR, { recursive: true });
  fs.writeFileSync(tokenPath, JSON.stringify(tokens));
  return oAuth2Client;
}

async function uploadBatch(batchFolderPath, auth) {
  const drive = google.drive({ version: 'v3', auth });

  const batchName = path.basename(batchFolderPath);

  // Get all subfolders in the batch folder
  const subfolders = fs.readdirSync(batchFolderPath).filter(name => {
    const fullPath = path.join(batchFolderPath, name);
    return fs.statSync(fullPath).isDirectory();
  });

  // Count total files to upload
  let totalFiles = 0;
  for (const subfolder of subfolders) {
    const localSubfolderPath = path.join(batchFolderPath, subfolder);
    const files = fs.readdirSync(localSubfolderPath).filter(
      name => !name.startsWith('.') && !UNWANTED_FILES.includes(name)
    );
    totalFiles += files.length;
  }

  let uploadedFiles = 0;
  const results = [];

  // Progress reporter
  const progressInterval = setInterval(() => {
    process.stdout.write(
      `\r[${batchName}] Uploading to Drive: ${uploadedFiles}/${totalFiles} files completed...`
    );
  }, 5000);

  for (const subfolder of subfolders) {
    const localSubfolderPath = path.join(batchFolderPath, subfolder);
    // Create the subfolder in Drive with the same name
    const folderMetadata = {
      name: subfolder,
      mimeType: 'application/vnd.google-apps.folder'
    };
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: 'id'
    });
    const folderId = folder.data.id;

    const files = fs.readdirSync(localSubfolderPath).filter(
      name => !name.startsWith('.') && !UNWANTED_FILES.includes(name)
    );
    for (const file of files) {
      const filePath = path.join(localSubfolderPath, file);
      const media = { body: fs.createReadStream(filePath) };
      const metadata = {
        name: file,
        parents: [folderId]
      };
      const res = await drive.files.create({
        resource: metadata,
        media: media,
        fields: 'id'
      });
      const fileId = res.data.id;
      await drive.permissions.create({
        fileId,
        requestBody: { role: 'reader', type: 'anyone' }
      });
      const link = `https://drive.google.com/file/d/${fileId}/view`;
      results.push({ file, link, driveFolder: subfolder });
      uploadedFiles++;
    }
  }

  clearInterval(progressInterval);
  process.stdout.write(
    `\r[${batchName}] Uploading to Drive: ${uploadedFiles}/${totalFiles} files completed.\n`
  );

  return results;
}

function isValidBatchDir(name) {
  return !name.startsWith('.') && name !== '.DS_Store' && name !== 'Thumbs.db';
}

export { authorize, uploadBatch };
