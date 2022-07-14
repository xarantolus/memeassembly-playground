var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as mod from "../dependencies/assembly_script.js";
export class DataSectionEntry {
}
export class AssemblerResult {
}
export function downloadX86Assembler() {
    return __awaiter(this, void 0, void 0, function* () {
        // Wait for module to load
        yield mod.default();
        return function assembleX86Assembly(inputText, instr_start_address, data_start_address, entrypoint) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    return mod.assemble(inputText, instr_start_address, data_start_address, entrypoint !== null && entrypoint !== void 0 ? entrypoint : "main");
                }
                catch (e) {
                    throw "assembling x86_64 GNU Assembly: " + String(e) + (typeof e === "object" ? JSON.stringify(e, null, "    ") : '');
                }
            });
        };
    });
}
