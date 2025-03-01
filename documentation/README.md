# PulsePlus Documentation

This directory contains the documentation for the PulsePlus application. The documentation is built using [Nextra](https://nextra.site/), a Next.js-based documentation framework.

## Documentation Structure

The documentation is organized as follows:

- `nextra/` - The Nextra documentation site
  - `pages/` - Documentation content in MDX format
  - `public/` - Static assets and generated documentation
  - `theme.config.jsx` - Nextra theme configuration
  - `_meta.json` - Documentation structure and navigation
- `api/` - API documentation
  - `swagger.yaml` - OpenAPI/Swagger specification
- `jsdoc/` - JSDoc configuration
  - `jsdoc.config.json` - JSDoc configuration file

## Building the Documentation

To build the documentation, run:

```bash
# Generate JSDoc documentation and build the Nextra site
npm run docs:build
```

## Development

To run the documentation site in development mode:

```bash
# Start the Nextra development server
npm run docs:dev
```

This will start a development server at http://localhost:3000.

## Deployment

To deploy the documentation:

```bash
# Build and export the documentation as static HTML
npm run docs:deploy
```

This will generate a static site in the `documentation/nextra/out` directory, which can be deployed to any static hosting service.

## Adding New Documentation

1. Create a new `.mdx` or `.md` file in the appropriate directory under `nextra/pages/`
2. Update the `_meta.json` file to include the new page in the navigation
3. Rebuild the documentation

## API Documentation

The API documentation is generated from the `swagger.yaml` file using Swagger UI. The Swagger UI is integrated into the Nextra site and can be accessed at `/api-docs`.

## JSDoc Documentation

The JSDoc documentation is generated from code comments in the backend code. The JSDoc configuration is in `jsdoc/jsdoc.config.json`. The generated documentation is integrated into the Nextra site and can be accessed at `/jsdoc`. 