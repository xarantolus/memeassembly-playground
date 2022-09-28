/* tslint:disable */
/* eslint-disable */
/**
* @param {string} input_file_content
* @param {bigint} instr_start_address
* @param {bigint} data_start_address
* @param {string} entrypoint
* @returns {any}
*/
export function assemble(input_file_content: string, instr_start_address: bigint, data_start_address: bigint, entrypoint: string): any;
/**
*/
export class DataSectionEntry {
  free(): void;
}
/**
*/
export class EncodeResult {
  free(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_encoderesult_free: (a: number) => void;
  readonly __wbg_datasectionentry_free: (a: number) => void;
  readonly assemble: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
