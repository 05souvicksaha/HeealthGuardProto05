import assert from "node:assert/strict";
import test from "node:test";
import { loadAllData, validateDatasets } from "./data-loader.mjs";

test("supplied datasets load with expected record counts", async () => {
  const data = await loadAllData();
  assert.equal(data.hospitals.length, 108);
  assert.equal(Object.keys(data.opd).length, 76);
  assert.equal(data.protocols.length, 435);
  assert.equal(data.flashcards.length, 162);
  assert.equal(Object.keys(data.categories).length, 20);
  assert.equal(Object.keys(data.specialtyMap).length, 20);
  assert.equal(new Set(Object.values(data.categories).map((category) => category.color)).size, 20);
});

test("data validation finds no duplicate hospital names or invalid protocols", async () => {
  const report = validateDatasets(await loadAllData());
  assert.equal(report.duplicateHospitals, 0);
  assert.equal(report.invalidProtocols, 0);
  assert.equal(report.opdWithoutHospital, 0);
});
