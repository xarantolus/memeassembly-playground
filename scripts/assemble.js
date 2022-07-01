import * as mod from "../dependencies/assembly_script.js";

// Wait for module to load
await mod.default();


export async function assembleX86Assembly(inputText, instr_start_address, data_start_address, entrypoint) {
    try {
        return mod.assemble(inputText, instr_start_address, data_start_address, entrypoint || "main");
    } catch (e) {
        throw "assembling x86_64 GNU Assembly: " + String(e) + (typeof e === "object" ? JSON.stringify(e, null, "    ") : '');
    }
}

