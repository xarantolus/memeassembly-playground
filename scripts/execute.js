import { translateMemeAssemblyCode } from './translate.js';
import { assembleX86Assembly } from './assemble.js';

function next_page_size(byte_size) {
    return Math.ceil(byte_size / 4096) * 4096
}

function hex(addr) {
    return "0x" + addr.toString(16);
}

const base_return_arr = Uint8Array.from([0x00, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const base_return_addr = 0x9000;

function generate_arr(length) {

    let arr = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        arr[i] = base_return_arr[i % base_return_arr.length];
    }

    return arr;
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

    console.log("Translated output:\n", x86Code);

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
    console.log("Compiled output:\n", x86Assembled);

    let interpretableCode = Uint8Array.from(x86Assembled.code);

    // Initialize engine
    var unicorn_engine = new uc.Unicorn(uc.ARCH_X86, uc.MODE_64);

    let handled_mem_evts = uc.HOOK_MEM_READ_UNMAPPED
        | uc.HOOK_MEM_WRITE_UNMAPPED
        | uc.HOOK_MEM_FETCH_UNMAPPED
        | uc.HOOK_MEM_READ_PROT
        | uc.HOOK_MEM_WRITE_PROT
        | uc.HOOK_MEM_FETCH_PROT;
    let map = {};

    map[uc.HOOK_MEM_READ_UNMAPPED] = "HOOK_MEM_READ_UNMAPPED";
    map[uc.HOOK_MEM_WRITE_UNMAPPED] = "HOOK_MEM_WRITE_UNMAPPED";
    map[uc.HOOK_MEM_FETCH_UNMAPPED] = "HOOK_MEM_FETCH_UNMAPPED";
    map[uc.HOOK_MEM_READ_PROT] = "HOOK_MEM_READ_PROT";
    map[uc.HOOK_MEM_WRITE_PROT] = "HOOK_MEM_WRITE_PROT";
    map[uc.HOOK_MEM_FETCH_PROT] = "HOOK_MEM_FETCH_PROT";

    let normal_end = false;

    // Log invalid memory accesses
    unicorn_engine.hook_add(handled_mem_evts, function (handle, access, addr, size, value) {
        if (addr == base_return_addr && size <= 0) {
            console.log("Accessed instructions at the marked end return point, so now it's over")
            normal_end = true;
            handle.emu_stop();
            return true;
        }

        let info = map[access];
        console.log("Invalid", info || "(unknown)", "access of size", size, "to address", hex(addr));

        return false;
    });

    // This hook prevents crashing when we pop an invalid address from the stack at the end
    unicorn_engine.hook_add(uc.HOOK_CODE, function (handle, addr_lo, addr_hi, size) {
        if (addr_lo == base_return_addr && addr_hi == 0 && size <= 0) {
            console.log("Accessed instructions at the marked end return point, so now it's over")
            handle.emu_stop();
            normal_end = true;
            return;
        }
    });

    // Add a hook for syscalls
    unicorn_engine.hook_add(uc.HOOK_INSN, function (handle) {
        let syscall_num = handle.reg_read_i64(uc.X86_REG_RAX);
        let rdi = handle.reg_read_i64(uc.X86_REG_RDI);
        let rsi = handle.reg_read_i64(uc.X86_REG_RSI);
        let rdx = handle.reg_read_i64(uc.X86_REG_RDX);

        switch (syscall_num) {
            case 0: {
                // READ syscall MUST read from stdin
                if (rdi != 0) {
                    throw 'READ syscall: cannot read from non-stdin (!= 0) fds, but tried ' + rdi;
                }

                // Ask for 'count' in rdx elements, should return string of that length
                // TODO: What happens if we input multi-byte chars? On linux this just leads to two 1-byte read-syscalls for MemeAssembly code; so maybe add a buffer here
                let result = syscallRead(rdx);

                let result_bytes = new TextEncoder().encode(result);

                // Write at most rdx bytes of result
                handle.mem_write(rsi, result_bytes.slice(0, rdx));

                break;
            }
            case 1: {
                // WRITE syscall MUST write to stdout or stderr
                // Actually this also supports also "writing" to stdin, as this also works in certain circumstances: https://stackoverflow.com/a/7680234
                if (rdi != 0 && rdi != 1 && rdi != 2) {
                    throw 'WRITE syscall: cannot write non-std{out,err} (!= 1,2) fds, but tried ' + rdi;
                }

                let result_buf = handle.mem_read(rsi, rdx);

                let result_str = new TextDecoder().decode(result_buf);

                syscallWrite(result_str);

                break;
            }
            default:
                throw 'Syscall: unsupported RAX value ' + syscall_num;
        }
    }, null, 1, 0, uc.X86_INS_SYSCALL);


    console.log("Creating data section, start =", hex(data_start), "minSize =", x86Assembled.data_section_size);
    unicorn_engine.mem_map(data_start, next_page_size(x86Assembled.data_section_size), uc.PROT_ALL);

    // Set up some stack space & set ptr in RSP
    let stack_len = 8 * 1024;
    console.log("Creating stack space, start =", hex(stack_start), "minSize =", stack_len);
    unicorn_engine.mem_map(stack_start, next_page_size(stack_len), uc.PROT_ALL);
    unicorn_engine.mem_write(stack_start, generate_arr(stack_len));


    let initial_rsp = stack_start + stack_len - 8;
    unicorn_engine.reg_write_i64(uc.X86_REG_RSP, initial_rsp);

    // Write the code to memory
    console.log("Writing", interpretableCode.length, "bytes of code to memory");
    unicorn_engine.mem_map(x86Assembled.code_start_address, next_page_size(interpretableCode.length), uc.PROT_ALL);
    unicorn_engine.mem_write(x86Assembled.code_start_address, interpretableCode);

    // 0x11ff8 = 0x10000 + 0x01ff8


    // Start at the entry point (usually the "main" symbol)
    console.log("Executing code starting at", hex(code_start), ", setting rip for main to", hex(x86Assembled.entrypoint_address), "(offset", x86Assembled.entrypoint_address - code_start + ")");
    try {
        // The timeout option doesn't work in webassembly; however we can restrict the number of instructions to run (in case of infinite loops)
        let max_instructions = 500000;
        unicorn_engine.emu_start(x86Assembled.entrypoint_address, x86Assembled.code_start_address + interpretableCode.length, 0, max_instructions);

        if (!normal_end) {
            throw 'Max instruction count of ' + max_instructions + ' exceeded (infinite loop protection)';
        }
    } catch (e) {
        if (!normal_end) {
            throw e;
        }
    }

    // Program output
    var irax = unicorn_engine.reg_read_i64(uc.X86_REG_RAX);
    console.log("RAX value:", irax);
}
