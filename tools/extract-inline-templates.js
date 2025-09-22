#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');

const summary = {
  processedComponents: 0,
  extractedTemplates: 0,
  extractedStyles: 0,
  migratedFiles: []
};
const errors = [];
const tsFilesToFormat = new Set();
const extraFilesToFormat = new Set();

function collectComponentFiles(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectComponentFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.component.ts')) {
      results.push(fullPath);
    }
  }
}

function getNodeDecorators(node) {
  if (typeof ts.getDecorators === 'function') {
    return ts.getDecorators(node) || [];
  }
  return node.decorators ? Array.from(node.decorators) : [];
}

function getPropertyNameText(name) {
  if (!name) {
    return null;
  }
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  return null;
}

function extractStringContent(node, sourceFile) {
  if (!node) {
    return null;
  }
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    const raw = sourceFile.text.slice(node.getStart() + 1, node.getEnd() - 1);
    return raw;
  }
  return null;
}

function normalizeEol(value) {
  return value.replace(/\r\n/g, '\n');
}

function ensureDirectoryForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function uniquePush(array, value) {
  if (!array.includes(value)) {
    array.push(value);
  }
}

function processComponentFile(filePath) {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  summary.processedComponents += 1;

  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);

  const componentDecorators = [];

  function visit(node) {
    if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && getNodeDecorators(node).length > 0) {
      for (const decoratorNode of getNodeDecorators(node)) {
        const expression = decoratorNode.expression || decoratorNode;
        if (ts.isCallExpression(expression)) {
          const decoratorIdentifier = expression.expression;
          const isComponentDecorator =
            (ts.isIdentifier(decoratorIdentifier) && decoratorIdentifier.text === 'Component') ||
            (ts.isPropertyAccessExpression(decoratorIdentifier) && decoratorIdentifier.name.text === 'Component');
          if (isComponentDecorator && expression.arguments.length > 0) {
            const metaArg = expression.arguments[0];
            if (ts.isObjectLiteralExpression(metaArg)) {
              componentDecorators.push({ node, decorator: expression, metadata: metaArg });
            }
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (componentDecorators.length === 0) {
    return;
  }

  const fileModifications = [];

  for (const component of componentDecorators) {
    const metadata = component.metadata;

    let templateProp = null;
    let stylesProp = null;
    let hasTemplateUrl = false;
    let hasStyleUrls = false;

    for (const prop of metadata.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        continue;
      }

      const nameText = getPropertyNameText(prop.name);
      if (nameText === 'template') {
        templateProp = prop;
      } else if (nameText === 'styles') {
        stylesProp = prop;
      } else if (nameText === 'templateUrl') {
        hasTemplateUrl = true;
      } else if (nameText === 'styleUrls') {
        hasStyleUrls = true;
      }
    }

    const componentBase = path.basename(filePath, '.ts');
    const componentDir = path.dirname(filePath);

    if (templateProp && !hasTemplateUrl) {
      const initializer = templateProp.initializer;
      const templateContent = extractStringContent(initializer, sourceFile);
      if (templateContent === null) {
        errors.push(`No se pudo extraer template desde ${relPath}`);
      } else {
        const htmlFileName = `${componentBase}.html`;
        let targetHtmlPath = path.join(componentDir, htmlFileName);
        let migrated = false;

        if (fs.existsSync(targetHtmlPath)) {
          const existing = fs.readFileSync(targetHtmlPath, 'utf8');
          if (normalizeEol(existing) !== normalizeEol(templateContent)) {
            targetHtmlPath = path.join(componentDir, `${componentBase}.migrated.html`);
            migrated = true;
            ensureDirectoryForFile(targetHtmlPath);
            fs.writeFileSync(targetHtmlPath, templateContent, 'utf8');
            uniquePush(summary.migratedFiles, path.relative(rootDir, targetHtmlPath).replace(/\\/g, '/'));
            extraFilesToFormat.add(targetHtmlPath);
          }
        } else {
          ensureDirectoryForFile(targetHtmlPath);
          fs.writeFileSync(targetHtmlPath, templateContent, 'utf8');
          extraFilesToFormat.add(targetHtmlPath);
        }

        if (!fs.existsSync(targetHtmlPath)) {
          ensureDirectoryForFile(targetHtmlPath);
          fs.writeFileSync(targetHtmlPath, templateContent, 'utf8');
          extraFilesToFormat.add(targetHtmlPath);
        }

        const htmlRel = `./${path.basename(targetHtmlPath).replace(/\\/g, '/')}`;

        const replacement = `templateUrl: '${htmlRel}'`;
        fileModifications.push({
          start: templateProp.getStart(sourceFile),
          end: templateProp.getEnd(),
          text: replacement
        });
        tsFilesToFormat.add(filePath);
        summary.extractedTemplates += 1;
      }
    }

    if (stylesProp && !hasStyleUrls) {
      const initializer = stylesProp.initializer;
      if (!ts.isArrayLiteralExpression(initializer)) {
        errors.push(`styles en ${relPath} no es un ArrayLiteralExpression`);
      } else {
        const styleSegments = [];
        let canProcess = true;
        for (const element of initializer.elements) {
          const styleContent = extractStringContent(element, sourceFile);
          if (styleContent === null) {
            errors.push(`No se pudo extraer un bloque de styles en ${relPath}`);
            canProcess = false;
            break;
          }
          styleSegments.push(styleContent);
        }

        if (canProcess) {
          const styleContent = styleSegments.join('\n');
          const cssFileName = `${componentBase}.css`;
          let targetCssPath = path.join(componentDir, cssFileName);

          if (fs.existsSync(targetCssPath)) {
            const existingCss = fs.readFileSync(targetCssPath, 'utf8');
            if (normalizeEol(existingCss) !== normalizeEol(styleContent)) {
              targetCssPath = path.join(componentDir, `${componentBase}.migrated.css`);
              ensureDirectoryForFile(targetCssPath);
              fs.writeFileSync(targetCssPath, styleContent, 'utf8');
              uniquePush(summary.migratedFiles, path.relative(rootDir, targetCssPath).replace(/\\/g, '/'));
              extraFilesToFormat.add(targetCssPath);
            }
          } else {
            ensureDirectoryForFile(targetCssPath);
            fs.writeFileSync(targetCssPath, styleContent, 'utf8');
            extraFilesToFormat.add(targetCssPath);
          }

          if (!fs.existsSync(targetCssPath)) {
            ensureDirectoryForFile(targetCssPath);
            fs.writeFileSync(targetCssPath, styleContent, 'utf8');
            extraFilesToFormat.add(targetCssPath);
          }

          const cssRel = `./${path.basename(targetCssPath).replace(/\\/g, '/')}`;
          const replacement = `styleUrls: ['${cssRel}']`;
          fileModifications.push({
            start: stylesProp.getStart(sourceFile),
            end: stylesProp.getEnd(),
            text: replacement
          });
          tsFilesToFormat.add(filePath);
          summary.extractedStyles += 1;
        }
      }
    }
  }

  if (fileModifications.length > 0) {
    fileModifications.sort((a, b) => b.start - a.start);
    let updatedText = sourceText;
    for (const mod of fileModifications) {
      updatedText = `${updatedText.slice(0, mod.start)}${mod.text}${updatedText.slice(mod.end)}`;
    }
    fs.writeFileSync(filePath, updatedText, 'utf8');
  }
}

if (!fs.existsSync(srcDir)) {
  console.error('No se encontró el directorio src/.');
  process.exit(1);
}

const componentFiles = [];
collectComponentFiles(srcDir, componentFiles);

for (const filePath of componentFiles) {
  processComponentFile(filePath);
}

console.log(JSON.stringify({ summary, errors, tsFiles: Array.from(tsFilesToFormat), otherFiles: Array.from(extraFilesToFormat) }, null, 2));
