# Google Drive Backup Tool (Educational Project)

> **Disclaimer**: This project is created for educational purposes only. It demonstrates concepts of file handling, batch processing, Google APIs integration, and asynchronous programming in Node.js. Users are responsible for complying with Google's Terms of Service and API usage policies.

## Overview

A Node.js application that demonstrates:
- File system operations and batch processing
- Google Drive API integration
- Google Sheets API for logging
- OAuth 2.0 authentication flow
- Asynchronous programming with async/await
- Environment variable management
- Modular code organization

## Project Structure

```
drive-backup-tool/
├── .env                    # Environment variables (create manually)
├── credentials/           # Google API credentials
│   ├── client_secret_account1.json
│   └── ... (one per account)
├── tokens/               # OAuth tokens (auto-generated)
├── input_files/         # Files to backup
├── batches/            # Temporary batch folders
├── src/                # Main source code
│   ├── batchSplitter.js
│   ├── driveUploader.js
│   ├── sheetLogger.js
│   ├── constants.js
│   └── index.js
├── package.json
└── README.md
```

## Educational Concepts Demonstrated

1. **File System Operations**
   - Reading directory contents
   - File size calculation
   - Batch file organization
   - File streaming for uploads

2. **Google APIs Integration**
   - OAuth 2.0 authentication flow
   - Google Drive API for file uploads
   - Google Sheets API for logging
   - Permission management

3. **Node.js Features**
   - ES Modules
   - Async/Await patterns
   - Error handling
   - Environment variables
   - File streaming

4. **Code Organization**
   - Modular architecture
   - Separation of concerns
   - Error handling patterns
   - Configuration management

## Setup (For Learning Purposes)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd drive-backup-tool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```
   # Choose one of these BATCH_SIZE values:
   BATCH_SIZE=16106127360  # 15GB in bytes
   # BATCH_SIZE=15569256448  # 14.5GB in bytes
   # BATCH_SIZE=104857600    # 100MB in bytes
   GOOGLE_SHEET_ID=your_google_sheet_id_here
   ```

4. Set up Google Cloud Project (for learning OAuth):
   - Create a project in Google Cloud Console
   - Enable Google Drive API and Google Sheets API
   - Create OAuth 2.0 credentials
   - Download credentials to `credentials/` directory

5. Place test files in `input_files/`

## Usage (Educational Example)

```bash
npm start
```

The application will:
1. Split files into batches (see `src/batchSplitter.js`)
2. Authenticate with Google (demonstrating OAuth flow)
3. Upload batches to Drive (see `src/driveUploader.js`)
4. Log operations to Google Sheets (see `src/sheetLogger.js`)

## Code Learning Points

### Batch Processing (`src/batchSplitter.js`)
- Demonstrates file system operations
- Shows batch size calculation
- Implements file organization logic

### Drive Upload (`src/driveUploader.js`)
- OAuth 2.0 implementation
- File upload streaming
- Permission management
- Error handling

### Sheet Logging (`src/sheetLogger.js`)
- Google Sheets API usage
- Data formatting
- Asynchronous operations

## Important Notes

- This is an educational project
- Respect Google API quotas and limits
- Handle credentials securely
- Monitor storage usage
- Follow Google's Terms of Service

## Contributing

Feel free to fork this project for learning purposes. Pull requests are welcome for educational improvements.

## License

This project is licensed under MIT License - see the LICENSE file for details. For educational purposes only.

