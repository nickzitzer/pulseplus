const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../db');

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

// Delete file from the server
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`File ${filePath} does not exist, skipping deletion.`);
    } else {
      console.error(`Error deleting file ${filePath}:`, err);
    }
  }
}

async function processImageUpload(file, fieldName, entityId = null, tableName = 'competitor') {
  let imageData = {};
  let oldImageUrl = null;

  if (entityId) {
    // Get the old image URL before updating
    const { rows } = await pool.query(`SELECT ${fieldName} FROM ${tableName} WHERE sys_id = $1`, [entityId]);
    if (rows.length > 0) {
      oldImageUrl = rows[0][fieldName];
    }

  }

  if (file) {
    console.log('File', file);
    const fileName = `${fieldName}_${Date.now()}_${file.originalname}`;
    const filePath = await writeFile(fileName, file.buffer);
    console.log('File saved successfully');
    imageData[fieldName] = `/uploads/${fileName}`;
  } else {
    imageData[fieldName] = oldImageUrl || null;
  }

  console.log

  imageData.oldImageUrl = oldImageUrl;
  return imageData;
}

async function handleFileUpdate(file, fieldName, entityId, tableName) {
  const imageData = await processImageUpload(file, fieldName, entityId, tableName);
  
  let result = {
    [fieldName]: imageData[fieldName]
  };

  if (imageData.oldImageUrl && imageData.oldImageUrl !== imageData[fieldName]) {
    const oldFilePath = path.join(__dirname, '..', imageData.oldImageUrl);
    await deleteFile(oldFilePath);
    result.oldFileDeleted = true;
  }

  return result;
}

module.exports = {
  writeFile,
  readFile,
  deleteFile,
  processImageUpload,
  handleFileUpdate, // Add this new function to the exports
};