import * as mod from "../dependencies/assembly_script.js";



export class DataSectionEntry {
    public label!: string
    public offset!: number
    public size!: number
}

export class AssemblerResult {
    public code!: Array<number>
    public code_start_address!: bigint
    public entrypoint_address!: bigint

    public data_section!: Array<DataSectionEntry>
    public data_section_size!: bigint
    public data_start_address!: bigint
}

export async function downloadX86Assembler() {
    // Wait for module to load
    await mod.default();


    return async function assembleX86Assembly(inputText: string, instr_start_address: bigint, data_start_address: bigint, entrypoint: string | null | undefined): Promise<AssemblerResult> {
        try {
            return mod.assemble(inputText, instr_start_address, data_start_address, entrypoint ?? "main");
        } catch (e) {
            throw "assembling x86_64 GNU Assembly: " + String(e) + (typeof e === "object" ? JSON.stringify(e, null, "    ") : '');
        }
    }
}


