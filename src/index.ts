#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';
import OpenAI from 'openai';
import { generateSwaggerUI } from './generateSwaggerUI';

require('dotenv').config()

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

program
  .option('-r, --routes <dir>', 'Routes directory', '.')
  .option('-o, --output <dir>', 'Output directory', './docs')
  .option('-t, --title <title>', 'API title', 'My API')
  .parse(process.argv);

const options = program.opts();

async function generateOpenApiSpec(fileContent: any) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are an expert in creating OpenAPI specifications from Express.js route files. Always respond with valid JSON only, without any additional text."
      },
      {
        role: "user",
        content: `Generate an OpenAPI specification snippet in JSON format for this Express.js route file:\n\n${fileContent}`
      }
    ],
  });

  // Remove backticks and code block formatting
  const rawContent = response.choices[0].message.content;
  const cleanedContent = rawContent!.replace(/```json|```/g, '');
  console.log(cleanedContent);
  return JSON.parse(cleanedContent!);
}

async function processRouteFiles(routesDir: any, outputDir: any, apiTitle: any) {
  const files = await fs.readdir(routesDir);
  let openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: apiTitle,
      version: "1.0.0"
    },
    paths: {}
  };

  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.ts')) {
      const filePath = path.join(routesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const specSnippet = await generateOpenApiSpec(content);
      openApiSpec.paths = { ...openApiSpec.paths, ...specSnippet.paths };
    }
  }

  try {
    console.log(`Creating output directory: ${outputDir}`);
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Writing OpenAPI specification to ${path.join(outputDir, 'openapi.json')}`);
    await fs.writeFile(path.join(outputDir, 'openapi.json'), JSON.stringify(openApiSpec, null, 2));
    console.log(`OpenAPI specification generated in ${outputDir}/openapi.json`);
  } catch (error) {
    console.error('Error creating output directory or writing file:', error);
  }

  const openApiJsonPath = path.join(outputDir, 'openapi.json');
  await fs.writeFile(openApiJsonPath, JSON.stringify(openApiSpec, null, 2));
  console.log(`OpenAPI specification generated in ${openApiJsonPath}`);


  const swaggerUiDir = path.join(outputDir, 'swagger-ui');
  const templatePath = path.resolve('./src/index.html');
  await generateSwaggerUI(openApiJsonPath, swaggerUiDir, templatePath);

}

async function main() {
  try {
    await processRouteFiles(
      path.resolve(__dirname, options.routes),
      path.resolve(process.cwd(), options.output),
      options.title
    );
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();