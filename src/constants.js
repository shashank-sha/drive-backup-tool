const UNWANTED_FILES = [
  '.ds_store',      // catches all .DS_Store variants, case-insensitive
  'thumbs.db',      // catches all Thumbs.db variants, case-insensitive
  '.localized',
  '.spotlight-v100',
  '.trashes'
];

const INPUT_DIR = './input_files';
const BATCH_DIR = './batches';
const CREDENTIALS_DIR = './credentials';

export { UNWANTED_FILES, INPUT_DIR, BATCH_DIR, CREDENTIALS_DIR }; 