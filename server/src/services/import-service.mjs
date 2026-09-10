import { loadAllData } from "../../data-loader.mjs";

export function normalizeOpdSchedule(schedule = {}) {
  const preserve = (value) => typeof value === "string" ? value : "";
  return {
    original: {
      weekday: preserve(schedule.weekday),
      saturday: preserve(schedule.saturday),
      sunday: preserve(schedule.sunday),
      note: preserve(schedule.note)
    },
    normalized: {
      weekdayOpen: /\d/.test(schedule.weekday ?? "") ? schedule.weekday : null,
      saturdayOpen: /\d/.test(schedule.saturday ?? "") ? schedule.saturday : null,
      sundayEmergencyOnly: /emergency only/i.test(schedule.sunday ?? "")
    }
  };
}

export function createImportService(repository) {
  return {
    async importSuppliedData() {
      const data = await loadAllData();
      const uniqueProtocols = new Map(data.protocols.map((protocol) => [protocol.id, protocol]));
      const report = {
        recordsRead: data.hospitals.length + Object.keys(data.opd).length + data.protocols.length + data.flashcards.length,
        validRecords: data.hospitals.length + Object.keys(data.opd).length + data.protocols.length + data.flashcards.length,
        invalidRecords: 0,
        duplicates: { hospitals: 0, protocols: data.protocols.length - uniqueProtocols.size, flashcards: 0 },
        missingFields: 0,
        parsingWarnings: [],
        importedRecords: 0,
        insertedOrUpdated: {}, sourceCounts: {}, completedAt: new Date().toISOString()
      };
      for (const hospital of data.hospitals) {
        const opd = normalizeOpdSchedule(data.opd[hospital.name]);
        await repository.upsert("hospitals", { sourceKey: `supplied:hospital:${hospital.name}` }, { ...hospital, opd, source: "hospitals.json + hospital_opd.json" });
      }
      report.insertedOrUpdated.hospitals = data.hospitals.length;
      for (const protocol of uniqueProtocols.values()) {
        await repository.upsert("medicalProtocols", { sourceKey: `supplied:protocol:${protocol.id}` }, {
          sourceId: protocol.id, category: protocol.cat, severity: protocol.sev, title: protocol.title,
          tags: protocol.tags, warning: protocol.warn, steps: protocol.steps, doNot: protocol.donot, seek: protocol.seek
        });
      }
      report.insertedOrUpdated.medicalProtocols = uniqueProtocols.size;
      for (const [index, flashcard] of data.flashcards.entries()) {
        await repository.upsert("flashcards", { sourceKey: `supplied:flashcard:${index}` }, { question: flashcard.q, answer: flashcard.a, category: flashcard.cat, source: "flashcards.json" });
      }
      report.insertedOrUpdated.flashcards = data.flashcards.length;
      report.sourceCounts = {
        hospitals: data.hospitals.length,
        opdSchedules: Object.keys(data.opd).length,
        protocols: data.protocols.length,
        flashcards: data.flashcards.length,
        categories: Object.keys(data.categories).length
      };
      report.importedRecords = Object.values(report.insertedOrUpdated).reduce((sum, value) => sum + value, 0);
      await repository.upsert("auditLogs", { requestId: "supplied-data-import" }, { actorId: "system", action: "DATA_IMPORT", resource: "Dataset", outcome: "SUCCESS", occurredAt: report.completedAt });
      return report;
    }
  };
}
