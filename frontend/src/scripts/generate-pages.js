import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the PagesGuide.md file
const pagesGuidePath = path.join(__dirname, '../pages/PagesGuide.md');
const pagesGuideContent = fs.readFileSync(pagesGuidePath, 'utf8');

// Parse the tables to extract page information
function extractPageInfo(content) {
  const tableRegex = /\| Page Name \| Route \| Purpose \| Key Components \| Access Level \| Status \|\n\|[-\s|]+\n((?:\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|\n)+)/g;
  const rowRegex = /\| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| [^|]+ \|/;
  
  const pages = [];
  let match;
  
  while ((match = tableRegex.exec(content)) !== null) {
    const tableRows = match[1].trim().split('\n');
    
    for (const row of tableRows) {
      const rowMatch = row.match(rowRegex);
      if (rowMatch) {
        const [_, pageName, route, purpose, keyComponents, accessLevel] = rowMatch;
        
        // Clean up the route (remove backticks if present)
        const cleanRoute = route.replace(/`/g, '').trim();
        
        pages.push({
          name: pageName.trim(),
          route: cleanRoute,
          purpose: purpose.trim(),
          keyComponents: keyComponents.trim(),
          accessLevel: accessLevel.trim()
        });
      }
    }
  }
  
  return pages;
}

// Generate the page file based on the route
function generatePageFile(page) {
  // Skip if route is empty
  if (!page.route || page.route === '/') return;
  
  // Convert route to file path
  let filePath = page.route;
  
  // Remove leading slash
  if (filePath.startsWith('/')) {
    filePath = filePath.substring(1);
  }
  
  // Create directory structure
  const dirPath = path.join(__dirname, '../pages', path.dirname(filePath));
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Determine file name
  let fileName = path.basename(filePath);
  
  // Handle dynamic routes - keep the brackets in the filename
  if (fileName.includes('[') && fileName.includes(']')) {
    // Already in correct format
  } else if (fileName.includes(':')) {
    // Convert :param to [param]
    fileName = fileName.replace(/:([^/]+)/g, '[$1]');
  } else {
    // Check if the route has a parameter pattern like 'userId' or 'gameId'
    const paramPatterns = ['userId', 'gameId', 'teamId', 'seasonId', 'competitionId', 'itemId'];
    for (const pattern of paramPatterns) {
      if (fileName === pattern) {
        fileName = `[${pattern}]`;
        break;
      }
    }
  }
  
  // Handle index routes
  if (fileName === '') {
    fileName = 'index';
  }
  
  const fullPath = path.join(dirPath, `${fileName}.tsx`);
  
  // Skip if file already exists
  if (fs.existsSync(fullPath)) {
    console.log(`Skipping existing file: ${fullPath}`);
    return;
  }
  
  // Generate dynamic route parameter from the route
  const routeParams = [];
  const dynamicParamRegex = /\[([^\]]+)\]/g;
  let paramMatch;
  while ((paramMatch = dynamicParamRegex.exec(page.route)) !== null) {
    routeParams.push(paramMatch[1]);
  }
  
  // If no params found from brackets, check for colon params
  if (routeParams.length === 0) {
    const colonParamRegex = /:([^/]+)/g;
    while ((paramMatch = colonParamRegex.exec(page.route)) !== null) {
      routeParams.push(paramMatch[1]);
    }
  }
  
  // If still no params, check for common param patterns in the filename
  if (routeParams.length === 0) {
    const paramPatterns = ['userId', 'gameId', 'teamId', 'seasonId', 'competitionId', 'itemId'];
    for (const pattern of paramPatterns) {
      if (fileName === `[${pattern}]`) {
        routeParams.push(pattern);
        break;
      }
    }
  }
  
  // Generate the page content
  const pageContent = generatePageContent(page, routeParams);
  
  // Write the file
  fs.writeFileSync(fullPath, pageContent);
  console.log(`Generated: ${fullPath}`);
}

// Generate the content for a page
function generatePageContent(page, routeParams) {
  const { name, route, purpose, keyComponents } = page;
  
  // Convert route to title case for display
  const pageTitle = name.replace(/\b\w/g, l => l.toUpperCase());
  
  // Extract components from key components
  const componentsList = keyComponents.split(',').map(comp => comp.trim());
  
  // Generate imports for route parameters
  const routeParamsImport = routeParams.length > 0 ? 
    `  const router = useRouter();
  const { ${routeParams.join(', ')} } = router.query;` : '';
  
  return `import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth';

/**
 * ${pageTitle} Page
 * 
 * Purpose: ${purpose}
 * Route: ${route}
 * Key Components: ${keyComponents}
 */
const ${pageTitle.replace(/[^a-zA-Z0-9]/g, '')}Page = () => {
${routeParamsImport}
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Head>
        <title>${pageTitle} | PulsePlus</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">${pageTitle}</h1>
          <p className="text-gray-600 mb-6">${purpose}</p>
          
          {/* Placeholder for page content */}
          <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center">
            <p className="text-gray-500">This is a placeholder for the ${pageTitle} page.</p>
            <p className="text-gray-500 mt-2">Route: ${route}</p>
            <p className="text-gray-500 mt-2">Key Components: ${keyComponents}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ${pageTitle.replace(/[^a-zA-Z0-9]/g, '')}Page;
`;
}

// Main execution
const pages = extractPageInfo(pagesGuideContent);
console.log(`Found ${pages.length} pages in the guide.`);

// Generate each page
for (const page of pages) {
  generatePageFile(page);
}

console.log('Page generation complete!'); 