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
- **OAuth Token Generation Tool** (new!)

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
├── token-generator.html # OAuth Token Generator Tool
├── package.json
└── README.md
```

## OAuth Token Generator Tool

The project includes a web-based OAuth token generator (`token-generator.html`) that simplifies the process of creating OAuth tokens for multiple Google accounts.

> **Note**: This token generator is an **optional convenience tool**. The traditional OAuth flow still works automatically when you have credentials files in the `credentials/` folder. The backup tool will handle authentication and token generation automatically during the first run.

### Features

- **Web-based Interface**: Easy-to-use HTML tool that runs in any browser
- **Multiple Account Support**: Generate tokens for different account types (Sheets logging, Drive uploads)
- **Automatic Token Exchange**: Handles the complete OAuth flow automatically
- **Secure Token Storage**: Generates properly formatted token files for the backup tool
- **Desktop OAuth Support**: Designed specifically for desktop applications
- **Optional Pre-generation**: Generate tokens before running the backup tool (avoids interactive prompts)

### When to Use the Token Generator

**Use the token generator if you want to:**
- Pre-generate all tokens before running the backup tool
- Avoid interactive authentication prompts during backup
- Generate tokens for multiple accounts in one session
- Have a visual interface for token management

**Skip the token generator if you prefer:**
- Let the backup tool handle authentication automatically
- Use the traditional command-line OAuth flow
- Generate tokens on-demand during backup execution

### How to Use the Token Generator

1. **Open the Token Generator**:
   ```bash
   # Open in your browser
   open token-generator.html
   # or double-click the file
   ```

2. **Upload OAuth Credentials**:
   - Upload the OAuth credentials JSON file from Google Cloud Console
   - The tool will extract the client ID and client secret automatically

3. **Choose Account Type**:
   - **Sheets Logging Account**: For Google Sheets API (one account)
   - **Upload Account**: For Google Drive API (multiple accounts: account1, account2, etc.)

4. **Complete OAuth Flow**:
   - Click the authentication button
   - Follow Google's consent screen
   - Copy the redirect URL from your browser
   - Paste it back into the tool

5. **Save Token File**:
   - Copy the generated token JSON
   - Save it to the `tokens/` folder with the correct filename:
     - `sheets-token.json` for Sheets logging
     - `account1-token.json`, `account2-token.json`, etc. for Drive uploads

### Token File Naming Convention

The token generator creates files with specific names that the backup tool expects:

- **`sheets-token.json`** - For Google Sheets logging (single account)
- **`account1-token.json`** - For Drive uploads (first account)
- **`account2-token.json`** - For Drive uploads (second account)
- **`account3-token.json`** - For Drive uploads (third account)
- And so on...

### OAuth Client Requirements

For the token generator to work properly:

1. **OAuth Client Type**: Must be set to "Desktop application" in Google Cloud Console
2. **Redirect URI**: Should be set to `http://localhost` (or left empty for desktop apps)
3. **Scopes**: The tool automatically requests the correct scopes:
   - `https://www.googleapis.com/auth/spreadsheets` for Sheets logging
   - `https://www.googleapis.com/auth/drive.file` for Drive uploads

### Security Notes

- **Keep tokens secure**: Never share or commit token files to version control
- **Token expiration**: Tokens include refresh tokens for automatic renewal
- **Multiple accounts**: Each account gets its own token file for isolation

## Educational Concepts Demonstrated

1. **File System Operations**
   - Reading directory contents
   - File size calculation
   - Batch file organization
   - File streaming for uploads
   - File extension filtering

2. **Google APIs Integration**
   - OAuth 2.0 authentication flow
   - Google Drive API for file uploads
   - Google Sheets API for logging
   - Permission management
   - OAuth Token Generation

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

5. **Web Development**
   - HTML/CSS/JavaScript
   - OAuth 2.0 implementation
   - Browser-based tools
   - User interface design

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
   
   # File extensions to process (comma-separated, default: all files)
   ALLOWED_EXTENSIONS=*  # Process all file types
   # ALLOWED_EXTENSIONS=jpg,jpeg,png,gif  # Process only image files
   # ALLOWED_EXTENSIONS=mp4,avi,mov  # Process only video files
   # ALLOWED_EXTENSIONS=pdf,doc,docx  # Process only document files
   ```

4. Set up Google Cloud Project (for learning OAuth):
   - Create a project in Google Cloud Console
   - Enable Google Drive API and Google Sheets API
   - Create OAuth 2.0 credentials (Desktop application type)
   - Download credentials to `credentials/` directory

5. **Generate OAuth Tokens** (optional):
   - **Option A - Use Token Generator** (recommended for convenience):
     - Open `token-generator.html` in your browser
     - Upload your OAuth credentials file
     - Generate tokens for each account you need
     - Save token files to the `tokens/` folder
   - **Option B - Let Backup Tool Handle It** (traditional approach):
     - Skip this step - the backup tool will handle authentication automatically
     - Tokens will be generated during the first run when prompted

6. Place test files in `input_files/`

## File Extension Filtering

The tool now supports filtering files by their extensions using the `ALLOWED_EXTENSIONS` environment variable. This feature allows you to process only specific file types, which can be useful for:

- **Selective backups**: Only backup certain file types (e.g., only images or only documents)
- **Performance optimization**: Skip unwanted file types to reduce processing time
- **Storage management**: Focus on specific file categories

### Usage Examples

```bash
# Process all file types (default behavior)
ALLOWED_EXTENSIONS=*

# Process only image files
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,bmp,tiff

# Process only video files
ALLOWED_EXTENSIONS=mp4,avi,mov,mkv,wmv,flv

# Process only document files
ALLOWED_EXTENSIONS=pdf,doc,docx,txt,rtf

# Process multiple file types
ALLOWED_EXTENSIONS=jpg,png,pdf,mp4
```

### How It Works

- **Extension matching**: File extensions are compared case-insensitively
- **Default behavior**: If `ALLOWED_EXTENSIONS` is not set or contains `*`, all files are processed
- **Comma-separated**: Multiple extensions can be specified using commas
- **Automatic dot handling**: Extensions can be specified with or without dots (e.g., `jpg` or `.jpg` both work)
- **Logging**: The tool displays which extensions are being processed during execution

## Usage (Educational Example)

```bash
npm start
```

The application will:
1. Split files into batches (see `src/batchSplitter.js`)
2. Authenticate with Google (using pre-generated tokens or interactive OAuth flow)
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

### **OAuth Token Generator (`token-generator.html`)**
- OAuth 2.0 flow implementation
- Browser-based authentication
- Token exchange and storage
- Multi-account management
- User interface design

## Important Notes

- This is an educational project
- Respect Google API quotas and limits
- Handle credentials and tokens securely
- Monitor storage usage
- Follow Google's Terms of Service
- **OAuth tokens should never be shared or committed to version control**

## Contributing

Feel free to fork this project for learning purposes. Pull requests are welcome for educational improvements.

## License

This project is licensed under MIT License - see the LICENSE file for details. For educational purposes only.

