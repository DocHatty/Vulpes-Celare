/**
 * Tests for DICOM Stream Transformer (synthetic, non-PHI fixtures)
 */

import {
  anonymizeDicomBuffer,
  HIPAA_DICOM_TAGS,
} from "../src/core/dicom/DicomStreamTransformer";
import * as dicomParser from "dicom-parser";
import * as dcmjs from "dcmjs";

describe("DicomStreamTransformer", () => {
  function createSyntheticDicomBuffer(): Buffer {
    const { DicomDict, DicomMetaDictionary } = (dcmjs as any).data;

    const dataset = {
      PatientName: "DOE^JANE",
      PatientID: "ID123",
      PatientBirthDate: "19700101",
      PatientTelephoneNumbers: "5551234567",
      StudyDate: "20240115",
      StudyTime: "120000",
      Modality: "CT",
      StudyInstanceUID: "1.2.3.4.5.6.7.8.9",
      SeriesInstanceUID: "1.2.3.4.5.6.7.8.9.1",
      SOPInstanceUID: "1.2.3.4.5.6.7.8.9.2",
    };

    const meta = {
      MediaStorageSOPClassUID: "1.2.840.10008.5.1.4.1.1.2",
      MediaStorageSOPInstanceUID: dataset.SOPInstanceUID,
      TransferSyntaxUID: "1.2.840.10008.1.2.1",
      ImplementationClassUID: "1.2.3.4.5.6.7.8.9.0",
    };

    const dicomDict = new DicomDict(meta);
    dicomDict.dict = DicomMetaDictionary.denaturalizeDataset(dataset);
    const part10 = dicomDict.write();
    return Buffer.from(part10);
  }

  test("HIPAA_DICOM_TAGS should contain required tags", () => {
    expect(Array.isArray(HIPAA_DICOM_TAGS)).toBe(true);
    expect(HIPAA_DICOM_TAGS.length).toBeGreaterThan(10);

    // Check for critical tags
    const tags = HIPAA_DICOM_TAGS.map((r) => r.tag);
    expect(tags).toContain("x00100010"); // PatientName
    expect(tags).toContain("x00100020"); // PatientID
    expect(tags).toContain("x00100030"); // PatientBirthDate
  });

  test("anonymization rules should have valid actions", () => {
    for (const rule of HIPAA_DICOM_TAGS) {
      expect(["REMOVE", "REPLACE", "HASH"]).toContain(rule.action);
      expect(rule.tag).toMatch(/^x[0-9a-fA-F]{8}$/);
    }
  });

  test("anonymizeDicomBuffer should remove/hash configured tags", async () => {
    const input = createSyntheticDicomBuffer();
    const output = await anonymizeDicomBuffer(input, { hashSalt: "test-salt" });

    const parsed = dicomParser.parseDicom(output);

    // Hashed fields should not match the original
    expect(parsed.string("x00100010")).not.toBe("DOE^JANE"); // PatientName
    expect(parsed.string("x00100020")).not.toBe("ID123"); // PatientID

    // Removed date/time fields should be empty or missing
    const studyDate = parsed.string("x00080020"); // StudyDate
    expect(!studyDate || studyDate.trim() === "").toBe(true);

    // UID hashing should preserve valid UI format (digits and dots)
    const sop = parsed.string("x00080018") || "";
    expect(sop).toMatch(/^2\\.25\\.[0-9]+$/);
  });
});

describe("anonymizeDicomBuffer", () => {
  test("should be exported as function", () => {
    expect(typeof anonymizeDicomBuffer).toBe("function");
  });

  test("should accept buffer and optional config", async () => {
    const invalidBuffer = Buffer.from("not a dicom");
    await expect(anonymizeDicomBuffer(invalidBuffer)).rejects.toThrow();
  });
});

describe("DICOM Hash Consistency", () => {
  test("different salts should produce different hashed outputs", async () => {
    const { DicomDict, DicomMetaDictionary } = (dcmjs as any).data;

    const dataset = {
      PatientName: "DOE^JANE",
      PatientID: "ID123",
      StudyInstanceUID: "1.2.3.4.5.6.7.8.9",
      SeriesInstanceUID: "1.2.3.4.5.6.7.8.9.1",
      SOPInstanceUID: "1.2.3.4.5.6.7.8.9.2",
    };
    const meta = {
      MediaStorageSOPClassUID: "1.2.840.10008.5.1.4.1.1.2",
      MediaStorageSOPInstanceUID: dataset.SOPInstanceUID,
      TransferSyntaxUID: "1.2.840.10008.1.2.1",
      ImplementationClassUID: "1.2.3.4.5.6.7.8.9.0",
    };

    const dicomDict = new DicomDict(meta);
    dicomDict.dict = DicomMetaDictionary.denaturalizeDataset(dataset);
    const input = Buffer.from(dicomDict.write());

    const outA = await anonymizeDicomBuffer(input, { hashSalt: "salt-a" });
    const outB = await anonymizeDicomBuffer(input, { hashSalt: "salt-b" });

    const parsedA = dicomParser.parseDicom(outA);
    const parsedB = dicomParser.parseDicom(outB);

    expect(parsedA.string("x00100010")).not.toBe(parsedB.string("x00100010"));
    expect(parsedA.string("x00080018")).not.toBe(parsedB.string("x00080018"));
  });
});
