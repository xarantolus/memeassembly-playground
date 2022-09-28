var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import runMemeAssemblyCompiler from "../dependencies/memeasm.js";
export function MemeAsmWrapper() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = ["-fno-martyrdom", "-S", "-o", "output.S", "input.memeasm"];
        let printFunction = null;
        function printWrap(str) {
            if (printFunction) {
                printFunction(str);
            }
            else {
                console.log("no print function set for compiler");
            }
        }
        // Download & compile WebAssembly binary
        let module = yield runMemeAssemblyCompiler({
            noInitialRun: true,
            arguments: args,
            print: printWrap,
            printErr: printWrap,
        });
        yield module.ready;
        // translateMemeAssemblyCode takes MemeAssembly code and an output callback that is called for each line of output text.
        // The function returns the generated x86-64 GNU Assembler Intel Syntax assembly
        return function translateMemeAssemblyCode(code, outputCallback) {
            return __awaiter(this, void 0, void 0, function* () {
                function runCompiler() {
                    return __awaiter(this, void 0, void 0, function* () {
                        module.calledRun = false;
                        printFunction = outputCallback;
                        // Write the input file
                        yield module.FS.writeFile("input.memeasm", code);
                        // copy args array as it is modified by callMain
                        const exitCode = yield module.callMain([...args]);
                        outputCallback(`Compiler exited with code ${exitCode} (${exitCode == 0 ? 'Success' : 'Failure'})`);
                        if (exitCode !== 0) {
                            throw "Compilation failed";
                        }
                        try {
                            let output = yield module.FS.readFile('output.S');
                            let result = new TextDecoder("utf-8").decode(output);
                            return result;
                        }
                        catch (e) {
                            throw 'Reading compilation result output file: ' + String(e) +
                                (typeof e === 'object') ? JSON.stringify(e, null, "    ") : '';
                        }
                    });
                }
                try {
                    return yield runCompiler();
                }
                catch (e) {
                    throw String(e) + (typeof e === "object" ? JSON.stringify(e, null, "    ") : '');
                }
            });
        };
    });
}
