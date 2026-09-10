import { loadAllData, validateDatasets } from "./data-loader.mjs";

const report = validateDatasets(await loadAllData());
console.log(JSON.stringify(report, null, 2));
if (report.invalidProtocols > 0) process.exitCode = 1;
