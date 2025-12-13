/**
 * Type declarations for modules without @types packages
 */

declare module "marked-terminal" {
  import { MarkedExtension } from "marked";

  interface MarkedTerminalOptions {
    code?: (code: string) => string;
    blockquote?: (text: string) => string;
    heading?: (text: string) => string;
    firstHeading?: (text: string) => string;
    hr?: () => string;
    listitem?: (text: string) => string;
    paragraph?: (text: string) => string;
    strong?: (text: string) => string;
    em?: (text: string) => string;
    codespan?: (text: string) => string;
    link?: (href: string, title: string, text: string) => string;
    reflowText?: boolean;
    width?: number;
    tab?: number;
  }

  export function markedTerminal(options?: MarkedTerminalOptions): MarkedExtension;
}

declare module "dcmjs" {
  export namespace data {
    class DicomMessage {
      static readFile(
        arrayBuffer: ArrayBuffer,
        options?: { ignoreErrors?: boolean },
      ): DicomDict;
    }

    class DicomDict {
      meta: Record<string, unknown>;
      dict: Record<string, DicomElement>;
      write(options?: { allowInvalidVRLength?: boolean }): ArrayBuffer;
    }

    interface DicomElement {
      vr: string;
      Value?: unknown[];
    }
  }
}

declare module "adm-zip" {
  interface ZipEntry {
    entryName: string;
    getData(): Buffer;
    isDirectory: boolean;
  }

  class AdmZip {
    constructor(filePathOrBuffer?: string | Buffer);
    addFile(
      entryName: string,
      content: Buffer,
      comment?: string,
      attr?: number,
    ): void;
    addLocalFile(localPath: string, zipPath?: string, zipName?: string): void;
    getEntries(): ZipEntry[];
    getEntry(name: string): ZipEntry | null;
    readAsText(entry: ZipEntry | string, encoding?: string): string;
    readFile(entry: ZipEntry | string): Buffer | null;
    toBuffer(): Buffer;
    writeZip(targetPath?: string): void;
  }

  export = AdmZip;
}
