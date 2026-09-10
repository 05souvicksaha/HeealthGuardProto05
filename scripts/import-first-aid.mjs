import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { parse } from "acorn";

// Parse allowlisted literal data only. Never execute the standalone browser script.
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Pass the supplied first-aid script.js path.");
const source = readFileSync(sourcePath, "utf8");
const ast = parse(source, { ecmaVersion: "latest" });
const declarations = ast.body.filter((node) => node.type === "VariableDeclaration").flatMap((node) => node.declarations);
const generator = ast.body.find((node) => node.type === "FunctionDeclaration" && node.id.name === "generateExtraEntries");
const extra = generator.body.body.find((node) => node.type === "VariableDeclaration").declarations.find((node) => node.id.name === "extraData").init;
function literal(node) {
  if (node.type === "Literal") return node.value;
  if (node.type === "ArrayExpression") return node.elements.flatMap((entry) => entry.type === "SpreadElement" ? literal(entry.argument) : [literal(entry)]);
  if (node.type === "ObjectExpression") return Object.fromEntries(node.properties.map((property) => {
    if (property.type !== "Property" || property.computed || property.kind !== "init") throw new Error("Nonliteral data property");
    return [property.key.name ?? property.key.value, literal(property.value)];
  }));
  if (node.type === "CallExpression" && node.callee.name === "generateExtraEntries" && node.arguments.length === 0) return literal(extra);
  throw new Error(`Unsupported data expression: ${node.type}`);
}
const categories = literal(declarations.find((node) => node.id.name === "CATS").init);
const sourceProtocols = literal(declarations.find((node) => node.id.name === "DB").init);
const seen = new Map();
const protocols = sourceProtocols.map((item) => {
  if (!categories[item.cat] || !Array.isArray(item.steps) || !item.title) throw new Error(`Invalid protocol ${item.id}`);
  const occurrence = (seen.get(item.id) ?? 0) + 1;
  seen.set(item.id, occurrence);
  return { ...item, sourceId: item.id, id: occurrence === 1 ? item.id : `${item.id}--${occurrence}` };
});
const output = resolve("src/data/first-aid-source.json");
mkdirSync(resolve("src/data"), { recursive: true });
writeFileSync(output, JSON.stringify({ source: "healthguard_redesign.zip / script.js", sha256: createHash("sha256").update(source).digest("hex"), categories, protocols }, null, 2) + "\n");
console.log(JSON.stringify({ protocols: protocols.length, categories: Object.keys(categories).length, duplicateSourceIds: [...seen].filter(([, count]) => count > 1), output }));
