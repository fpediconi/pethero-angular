const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const rootDir = path.resolve(process.cwd(), "src");

const asciiMap = new Map([
  ["\u2013", "-"],
  ["\u2014", "-"],
  ["\u2019", "'"],
  ["\u2018", "'"],
  ["\u201C", '"'],
  ["\u201D", '"'],
  ["\u00B4", "'"],
  ["\u00B7", "."],
  ["\u2022", "-"],
  ["\u00BA", "o"],
  ["\u00AA", "a"],
  ["\u00BF", "?"],
  ["\u00A1", "!"],
  ["\u20AC", "EUR"],
  ["\u20BF", "BTC"],
  ["\u20B1", "PHP"],
  ["\u20A1", "CRC"],
  ["\u20A6", "NGN"],
  ["\u20A9", "KRW"],
  ["\u20B9", "INR"],
  ["\u0153", "oe"],
  ["\u0152", "Oe"],
  ["\u00E6", "ae"],
  ["\u00C6", "Ae"],
]);

function main() {
  let files = process.argv.slice(2).filter(Boolean);
  if (files.length > 0) {
    files = files
      .map((p) => (path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)))
      .filter((p) => p.endsWith(".ts") && !p.endsWith(".d.ts"));
  } else {
    if (!fs.existsSync(rootDir)) {
      console.error("src directory not found at " + rootDir);
      process.exit(1);
    }
    files = [];
    collectTsFiles(rootDir, files);
  }

  files.sort();

  for (const filePath of files) {
    processFile(filePath);
  }
}

function collectTsFiles(dir, bucket) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(full, bucket);
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      bucket.push(full);
    }
  }
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, original, ts.ScriptTarget.Latest, true);
  const newline = detectLineEnding(original);
  const edits = [];

  const visit = (node) => {
    if (ts.isClassDeclaration(node) && node.name) {
      handleClass(node, sourceFile, original, newline, edits);
    }

    if (ts.isFunctionDeclaration(node) && node.body) {
      handleTopLevelFunction(node, sourceFile, original, newline, edits);
    }

    if (ts.isMethodDeclaration(node) && node.body) {
      handleMethod(node, sourceFile, original, newline, edits);
    }

    if (ts.isConstructorDeclaration(node) && node.body) {
      handleMethod(node, sourceFile, original, newline, edits, "constructor");
    }

    if (ts.isGetAccessorDeclaration(node) && node.body) {
      handleMethod(node, sourceFile, original, newline, edits, node.name.getText(sourceFile));
    }

    if (ts.isSetAccessorDeclaration(node) && node.body) {
      handleMethod(node, sourceFile, original, newline, edits, node.name.getText(sourceFile));
    }

    if (ts.isPropertyDeclaration(node) && node.initializer && ts.isArrowFunction(node.initializer) && ts.isBlock(node.initializer.body)) {
      handlePropertyArrow(node, sourceFile, original, newline, edits);
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.initializer && (ts.isFunctionExpression(decl.initializer) || ts.isArrowFunction(decl.initializer))) {
          if (ts.isBlock(decl.initializer.body)) {
            handleVariableFunction(decl, sourceFile, original, newline, edits);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);

  let updated = original;
  if (edits.length > 0) {
    edits.sort((a, b) => b.pos - a.pos);
    for (const edit of edits) {
      updated = updated.slice(0, edit.pos) + edit.text + updated.slice(edit.pos);
    }
  }

  const asciiUpdated = toAscii(updated);

  if (asciiUpdated !== original) {
    fs.writeFileSync(filePath, asciiUpdated, "utf8");
  }
}

function detectLineEnding(text) {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function toAscii(text) {
  let result = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code <= 127) {
      result += ch;
      continue;
    }

    if (asciiMap.has(ch)) {
      result += asciiMap.get(ch);
      continue;
    }

    const normalized = ch
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x00-\x7F]/g, "");
    result += normalized;
  }
  return result;
}

function handleClass(node, sourceFile, text, newline, edits) {
  const className = node.name.getText(sourceFile);
  if (hasNamedDoc(text, node.getStart(sourceFile), className)) {
    return;
  }

  const insertPos = classInsertPosition(node);
  const indent = getIndent(sourceFile, text, insertPos);
  const description = describeClass(className);
  let comment = buildComment(indent, newline, className, description.objective, description.extra);
  comment = ensureLeadingNewline(text, insertPos, comment, newline);
  edits.push({ pos: insertPos, text: comment });
}

function classInsertPosition(node) {
  if (node.decorators && node.decorators.length > 0) {
    return node.decorators[0].getFullStart();
  }
  return node.getFullStart();
}

function handleMethod(node, sourceFile, text, newline, edits, forcedName) {
  const start = node.getStart(sourceFile);
  const length = blockLength(node, sourceFile);
  if (length <= 20) {
    return;
  }
  const name = forcedName || (node.name ? node.name.getText(sourceFile) : "method");
  if (hasNamedDoc(text, start, name)) {
    return;
  }

  const indent = getIndent(sourceFile, text, start);
  const snippet = text.slice(start, node.end);
  const description = describeMethod(name, snippet);
  let comment = buildComment(indent, newline, name, description.objective, description.extra);
  comment = ensureLeadingNewline(text, start, comment, newline);
  edits.push({ pos: start, text: comment });
}

function handlePropertyArrow(node, sourceFile, text, newline, edits) {
  const start = node.getStart(sourceFile);
  const length = blockLength(node.initializer, sourceFile);
  if (length <= 20) {
    return;
  }
  const rawName = node.name.getText(sourceFile);
  const name = rawName.replace(/[!?]$/, "");
  if (hasNamedDoc(text, start, name)) {
    return;
  }

  const indent = getIndent(sourceFile, text, start);
  const snippet = text.slice(start, node.end);
  const description = describeMethod(name, snippet);
  let comment = buildComment(indent, newline, name, description.objective, description.extra);
  comment = ensureLeadingNewline(text, start, comment, newline);
  edits.push({ pos: start, text: comment });
}

function handleVariableFunction(decl, sourceFile, text, newline, edits) {
  const start = decl.getStart(sourceFile);
  const length = blockLength(decl.initializer, sourceFile);
  if (length <= 20) {
    return;
  }
  const rawName = decl.name.getText(sourceFile);
  const name = rawName.replace(/[!?]$/, "");
  if (hasNamedDoc(text, start, name)) {
    return;
  }

  const indent = getIndent(sourceFile, text, start);
  const snippet = text.slice(start, decl.end);
  const description = describeMethod(name, snippet);
  let comment = buildComment(indent, newline, name, description.objective, description.extra);
  comment = ensureLeadingNewline(text, start, comment, newline);
  edits.push({ pos: start, text: comment });
}

function handleTopLevelFunction(node, sourceFile, text, newline, edits) {
  const start = node.getStart(sourceFile);
  const length = blockLength(node, sourceFile);
  if (length <= 20) {
    return;
  }
  const name = node.name ? node.name.getText(sourceFile) : "function";
  if (hasNamedDoc(text, start, name)) {
    return;
  }

  const indent = getIndent(sourceFile, text, start);
  const snippet = text.slice(start, node.end);
  const description = describeMethod(name, snippet);
  let comment = buildComment(indent, newline, name, description.objective, description.extra);
  comment = ensureLeadingNewline(text, start, comment, newline);
  edits.push({ pos: start, text: comment });
}

function blockLength(node, sourceFile) {
  const start = node.getStart(sourceFile);
  let end = node.end;
  if (node.body && ts.isBlock(node.body)) {
    end = node.body.end;
  }
  const startLine = sourceFile.getLineAndCharacterOfPosition(start).line;
  const endLine = sourceFile.getLineAndCharacterOfPosition(end).line;
  return endLine - startLine + 1;
}

function getIndent(sourceFile, text, pos) {
  const lineInfo = sourceFile.getLineAndCharacterOfPosition(pos);
  const lineStart = sourceFile.getPositionOfLineAndCharacter(lineInfo.line, 0);
  const lineText = text.slice(lineStart, pos);
  const match = lineText.match(/^[ \t]*/);
  return match ? match[0] : "";
}

function hasNamedDoc(text, pos, name) {
  const lookBehindStart = Math.max(0, pos - 800);
  const segment = text.slice(lookBehindStart, pos);
  return segment.includes("############################################") && segment.includes("Name: " + name);
}

function ensureLeadingNewline(text, pos, chunk, newline) {
  if (pos === 0) {
    return chunk;
  }
  const prev = text[pos - 1];
  if (prev === "\n") {
    return chunk;
  }
  if (prev === "\r" && pos > 1 && text[pos - 2] === "\n") {
    return chunk;
  }
  return newline + chunk;
}

function buildComment(indent, newline, name, objective, extra) {
  const lines = [
    indent + "/*",
    indent + "############################################",
    indent + "Name: " + name,
    indent + "Objetive: " + objective,
    indent + "Extra info: " + extra,
    indent + "############################################",
    indent + "*/",
  ];
  return lines.join(newline) + newline + indent;
}

function describeClass(className) {
  const lower = className.toLowerCase();
  const base = removeSuffix(className, [
    "Component",
    "Page",
    "Service",
    "Guard",
    "Interceptor",
    "Directive",
    "Pipe",
    "Resolver",
    "Store",
    "Facade",
    "Effect",
    "Model",
    "Manager",
    "Controller",
  ]);
  const human = humanize(base);
  const baseLower = human ? human.toLowerCase() : "";

  if (lower.endsWith("component")) {
    return {
      objective: "Render and orchestrate the " + (baseLower || "feature") + " component.",
      extra: "Handles bindings, events, and view state.",
    };
  }

  if (lower.endsWith("page")) {
    return {
      objective: "Drive the " + (baseLower || "feature") + " page experience.",
      extra: "Coordinates routing context, data retrieval, and user actions.",
    };
  }

  if (lower.endsWith("service")) {
    return {
      objective: "Provide " + (baseLower || "feature") + " domain operations.",
      extra: "Wraps API access, caching, and shared business rules.",
    };
  }

  if (lower.endsWith("guard")) {
    return {
      objective: "Enforce navigation rules for " + (baseLower || "protected") + " routes.",
      extra: "Evaluates authentication and role constraints before activation.",
    };
  }

  if (lower.endsWith("interceptor")) {
    return {
      objective: "Intercept HTTP traffic to apply " + (baseLower || "request") + " policies.",
      extra: "Attaches headers and handles cross-cutting concerns safely.",
    };
  }

  if (lower.endsWith("directive")) {
    return {
      objective: "Extend templates with " + (baseLower || "custom") + " behavior.",
      extra: "Hooks into Angular lifecycles to enhance DOM interactions.",
    };
  }

  if (lower.endsWith("pipe")) {
    return {
      objective: "Transform values with the " + (baseLower || "format") + " pipe.",
      extra: "Provides reusable formatting logic for views.",
    };
  }

  if (lower.endsWith("resolver")) {
    return {
      objective: "Resolve data before activating " + (baseLower || "target") + " routes.",
      extra: "Fetches required resources and ensures navigation readiness.",
    };
  }

  if (lower.endsWith("store") || lower.endsWith("facade") || lower.endsWith("effect")) {
    return {
      objective: "Coordinate state management for " + (baseLower || "the feature") + " workflows.",
      extra: "Bridges dispatched actions with side effects and selectors.",
    };
  }

  if (lower.endsWith("model")) {
    return {
      objective: "Represent " + (baseLower || "domain") + " data helpers.",
      extra: "Provides typed constructors and utility helpers for entities.",
    };
  }

  return {
    objective: "Encapsulate " + (baseLower || "core") + " functionality.",
    extra: "Offers a cohesive API for collaborating modules.",
  };
}

function describeMethod(name, snippet) {
  const cleanName = name.replace(/[!?]$/, "");
  const lowerName = cleanName.toLowerCase();
  const human = humanize(cleanName);
  const parts = human.split(" ").filter(Boolean);
  const verb = parts.length ? parts[0].toLowerCase() : lowerName;
  const remainder = parts.length > 1 ? parts.slice(1).join(" ").toLowerCase() : "";

  let objective;
  if (lowerName === "ngoninit") {
    objective = "Bootstrap the component once the view is initialized.";
  } else if (verb === "load") {
    const subject = remainder || "required";
    objective = "Load " + subject + (subject.includes("data") ? "." : " data.");
  } else if (verb === "fetch") {
    const subject = remainder || "remote";
    objective = "Fetch " + subject + (subject.includes("data") ? "." : " data.");
  } else if (verb === "get" || verb === "read") {
    const subject = remainder || "requested information";
    objective = "Retrieve " + subject + ".";
  } else if (verb === "update") {
    objective = "Update " + (remainder || "mutable") + " state.";
  } else if (verb === "toggle") {
    objective = "Toggle " + (remainder || "internal") + " flags.";
  } else if (verb === "build" || verb === "create") {
    objective = "Build " + (remainder || "composite") + " structures.";
  } else if (verb === "handle" || verb === "process") {
    objective = "Handle " + (remainder || "incoming") + " interactions.";
  } else if (verb === "calculate" || verb === "compute" || verb === "derive") {
    objective = "Calculate " + (remainder || "derived") + " values.";
  } else if (verb === "prepare") {
    objective = "Prepare " + (remainder || "data") + " for downstream use.";
  } else if (verb === "search") {
    objective = "Execute the " + (remainder || "search") + " workflow.";
  } else if (verb === "ensure") {
    objective = "Ensure " + (remainder || "required") + " preconditions.";
  } else if (verb === "validate" || verb === "check") {
    objective = "Validate " + (remainder || "input") + " constraints.";
  } else if (verb === "synchronize" || verb === "sync") {
    objective = "Synchronize " + (remainder || "state") + " across collaborators.";
  } else if (verb === "export") {
    objective = "Export " + (remainder || "data") + ".";
  } else {
    objective = "Manage the " + (human.toLowerCase() || "core") + " workflow.";
  }

  const snippetLower = snippet.toLowerCase();
  let extra;
  if (snippetLower.includes("await") || snippetLower.includes(".subscribe(") || snippetLower.includes("then(")) {
    extra = "Coordinates asynchronous calls with state updates and error handling.";
  } else if (snippetLower.includes("return ") && snippetLower.includes("map(")) {
    extra = "Streams data through mapping and filtering transforms before returning.";
  } else if (snippetLower.includes("form") || snippetLower.includes("control")) {
    extra = "Manages validation, form state, and side effects cohesively.";
  } else if (snippetLower.includes("router") || snippetLower.includes("navigate")) {
    extra = "Aligns navigation changes with data preparation and feedback.";
  } else if (snippetLower.includes("state") || snippetLower.includes("signal")) {
    extra = "Maintains reactive state consistency across collaborators.";
  } else {
    extra = "Breaks complex steps into traceable branches for maintainability.";
  }

  return { objective, extra };
}
function removeSuffix(name, suffixes) {
  for (const suffix of suffixes) {
    if (name.endsWith(suffix)) {
      return name.slice(0, -suffix.length);
    }
  }
  return name;
}

function humanize(name) {
  if (!name) {
    return "";
  }
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spaced;
}

main();


