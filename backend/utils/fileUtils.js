const fs = require('fs').promises;
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure the upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
}

// Write file to the server
async function writeFile(fileName, fileBuffer) {
  await ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, fileName);
  await fs.writeFile(filePath, fileBuffer);
  return filePath;
}

// Read file from the server
async function readFile(fileName) {
  const filePath = path.join(UPLOAD_DIR, fileName);
  return await fs.readFile(filePath);
}

module.exports = {
  writeFile,
  readFile,
};