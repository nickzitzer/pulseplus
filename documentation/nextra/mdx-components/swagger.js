import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export default function handler(req, res) {
  try {
    // Read the Swagger YAML file
    const swaggerPath = path.join(process.cwd(), '../public/swagger.yaml');
    const swaggerContent = fs.readFileSync(swaggerPath, 'utf8');
    
    // Parse YAML to JSON
    const swaggerJson = yaml.load(swaggerContent);
    
    // Return the Swagger JSON
    res.status(200).json(swaggerJson);
  } catch (error) {
    console.error('Error serving Swagger documentation:', error);
    res.status(500).json({ error: 'Failed to load API documentation' });
  }
} 