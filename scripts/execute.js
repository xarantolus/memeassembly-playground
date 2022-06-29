import { translateMemeAssemblyCode } from './translate.js';
import { assembleX86Assembly } from './assemble.js';

function next_page_size(byte_size) {
    return Math.ceil(byte_size / 4096) * 4096
}

export async function executeMemeAssemblyCode(
    codeInput,
    lineCallback,
    syscallWrite,
    syscallRead
) {
    let x86Code = await translateMemeAssemblyCode(codeInput, lineCallback);

    // n suffix => BigInt constants
    const code_start = 0x100000;
    const stack_start = 0x10000;
    const data_start = 0x1000;

    let x86Assembled = await assembleX86Assembly(x86Code, BigInt(code_start), BigInt(data_start), "main");
    /*
    x86Assembled = {
        "code": [
            72,
            184,
            ...,
            110,
            195
        ],
        "code_start_address": 8192,
        "entrypoint_address": 8252,
        "data_start_address": 4096,
        "data_section_size": 8,
        "data_section": [
            {
                "label": ".LCharacter",
                "offset": 0,
                "size": 8
            }
        ]
    }
    */

    let interpretableCode = Uint8Array.from(x86Assembled.code);

    // Initialize engine
    var unicorn_engine = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);

    unicorn_engine.hook_add(uc.HOOK_CODE, function (handle, user_data) {
        // RIP in this case points current instruction, let's see if it's a syscall
        var rip = handle.reg_read_i64(uc.X86_REG_RIP);
        var mem = handle.mem_read(rip, 2);

        // Syscall: 0x0f05
        // Technically there might be a longer instruction that starts with this, but I don't care
        if (mem[0] == 0xf && mem[1] == 0x5) {
            console.log("syscall!")
        }
    }, null, 1, 0);

    console.log("Creating data space");
    unicorn_engine.mem_map(data_start, next_page_size(x86Assembled.data_section_size));

    // Set up some stack space & set ptr in RSP
    console.log("Creating stack space");
    let stack_len = 8 * 1024;
    unicorn_engine.mem_map(stack_start, next_page_size(stack_len));
    unicorn_engine.reg_write_i64(uc.X86_REG_RSP, stack_start + stack_len - 8);

    // Write the code to memory
    console.log("Writing code to memory");
    unicorn_engine.mem_map(x86Assembled.code_start_address, next_page_size(interpretableCode.length), uc.PROT_ALL);
    unicorn_engine.mem_write(x86Assembled.code_start_address, interpretableCode);



    // Start at the entry point (usually the "main" symbol)
    console.log("Executing code...");
    unicorn_engine.emu_start(x86Assembled.entrypoint_address, x86Assembled.code_start_address + interpretableCode.length, 0, 0);

    // Program output
    var irax = unicorn_engine.reg_read_i64(uc.X86_REG_RAX);
    console.log("RAX value:", irax);
}

