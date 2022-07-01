import runMemeAssemblyCompiler from "../dependencies/memeasm.js";

const args = ["-fno-martyrdom", "-S", "-o", "output.S", "input.memeasm"];

let printFunction = null;
function printWrap(str) {
    if (printFunction) {
        printFunction(str);
    } else {
        console.log("no print function set for compiler")
    }
}

// Download & compile WebAssembly binary
let module = await runMemeAssemblyCompiler({
    noInitialRun: true,
    arguments: args,
    print: printWrap,
    printErr: printWrap,
});

await module.ready;

// translateMemeAssemblyCode takes MemeAssembly code and an output callback that is called for each line of output text.
// The function returns the generated x86-64 GNU Assembler Intel Syntax assembly
export async function translateMemeAssemblyCode(code, outputCallback) {
    async function runCompiler() {
        module.calledRun = false;

        printFunction = outputCallback;

        // Write the input file
        await module.FS.writeFile("input.memeasm", code);

        // copy args array as it is modified by callMain
        const exitCode = await module.callMain([...args]);

        outputCallback(`Compiler exited with code ${exitCode} (${exitCode == 0 ? 'Success' : 'Failure'})`);
        if (exitCode !== 0) {
            throw "Compilation failed";
        }

        try {
            let output = await module.FS.readFile('output.S');
            let result = new TextDecoder("utf-8").decode(output);

            return result;
        } catch (e) {
            throw 'Reading compilation result output file: ' + String(e) +
                (typeof e === 'object') ? JSON.stringify(e, null, "    ") : '';
        }
    }

    async function compileWrap() {
        try {
            return await runCompiler();
        } catch (e) {
            throw String(e) + (typeof e === "object" ? JSON.stringify(e, null, "    ") : '');
        }
    }

    return compileWrap();
}
