import fs from 'fs/promises';
import path from 'path';
import SwaggerUiDist from 'swagger-ui-dist';

export async function generateSwaggerUI(openApiJsonPath: string, outputDir: string, template: string) {
  // Read the OpenAPI JSON file
  const openApiJson = await fs.readFile(openApiJsonPath, 'utf-8');

  // Read the HTML template
  const filledTemplate = template.replace('OPENAPI_SPEC_PLACEHOLDER', openApiJson);

  // Create the output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });

  // Copy Swagger UI dist files to the output directory
  const swaggerUiDistPath = SwaggerUiDist.getAbsoluteFSPath();
  const files = await fs.readdir(swaggerUiDistPath);
  for (const file of files) {
    await fs.copyFile(
      path.join(swaggerUiDistPath, file),
      path.join(outputDir, file)
    );
  }

  // Write the filled template to index.html
  await fs.writeFile(path.join(outputDir, 'index.html'), filledTemplate);

  console.log(`Swagger UI generated in ${outputDir}`);
}