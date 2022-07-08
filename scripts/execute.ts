import { AssemblerResult } from './assemble';

declare const uc;

function next_page_size(byte_size: number | bigint): number {
    byte_size = (typeof byte_size == 'number') ? byte_size : Number(byte_size);

    return Math.ceil(byte_size / 4096) * 4096;
}

function hex(addr: number | bigint) {
    return "0x" + addr.toString(16);
}

const base_return_arr = Uint8Array.from([0x00, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const base_return_addr = 0x9000;

function generate_arr(length: number) {

    let arr = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        arr[i] = base_return_arr[i % base_return_arr.length];
    }

    return arr;
}

export async function executeMemeAssemblyCode(
    translateMemeAssemblyCode: (code: string, compilerOutputLineCallback: (l: string) => void) => Promise<string>,
    assembleX86Code: (inputText: string, instr_start_address: bigint, data_start_address: bigint, entrypoint: string | null | undefined) => Promise<AssemblerResult>,
    codeInput: string,
    lineCallback: (l: string) => void,
    syscallWrite: (r: string) => void,
    syscallRead: (c: number) => Promise<Uint8Array>,
) {
    let x86Code = await translateMemeAssemblyCode(codeInput, lineCallback);
    console.log("Translated output:\n", x86Code);

    const code_start = 0x100000;
    const stack_start = 0x10000;
    const data_start = 0x1000;

    let x86Assembled = await assembleX86Code(x86Code, BigInt(code_start), BigInt(data_start), "main");

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


    let codeOffset = Number(x86Assembled.entrypoint_address);

    // This hook prevents crashing when we pop an invalid address from the stack at the end
    unicorn_engine.hook_add(uc.HOOK_CODE, function (handle, addr_lo, addr_hi, size) {
        if (addr_lo == base_return_addr && addr_hi == 0 && size <= 0) {
            console.log("Accessed instructions at the marked end return point, so now it's over")
            handle.emu_stop();
            normal_end = true;
            codeOffset = -1;
            return;
        }
    });


    // Add a hook for syscalls
    // This hook is actually called *twice* by the engine, I'm not 100% sure why it happens.
    // To prevent this we just handle every second syscall
    let syscallBuffer = new Uint8Array();
    let syscallReadCount = 0;

    let readInterrupt = "interrupt: read";
    let writeInterrupt = "interrupt: write";

    let syscallWriteStr = "";
    const syscallHandler = function (handle) {
        let syscall_num = handle.reg_read_i64(uc.X86_REG_RAX);

        let rdi = handle.reg_read_i64(uc.X86_REG_RDI);
        let rsi = handle.reg_read_i64(uc.X86_REG_RSI);
        let rdx = handle.reg_read_i64(uc.X86_REG_RDX);

        codeOffset = handle.reg_read_i64(uc.X86_REG_RIP) + 2;

        switch (syscall_num) {
            case 0: {
                // READ syscall MUST read from stdin
                if (rdi != 0) {
                    throw 'READ syscall: cannot read from non-stdin (!= 0) fds, but tried ' + rdi;
                }

                if (syscallBuffer.byteLength >= rdx) {
                    console.log("read: have enough in buf");

                    handle.mem_write(rsi, syscallBuffer.slice(0, rdx));
                    syscallBuffer = syscallBuffer.slice(rdx);

                    return;
                }

                console.log("read: need more in buf");

                //Ask for the buffer to be filled as much as necessary
                syscallReadCount = rdx - syscallBuffer.byteLength;

                console.log("stopping emu ...");
                throw readInterrupt;
            }
            case 1: {
                // WRITE syscall MUST write to stdout or stderr
                // Actually this also supports also "writing" to stdin, as this also works in certain circumstances: https://stackoverflow.com/a/7680234
                if (rdi != 0 && rdi != 1 && rdi != 2) {
                    throw 'WRITE syscall: cannot write non-std{out,err} (!= 1,2) fds, but tried ' + rdi;
                }

                let result_buf = handle.mem_read(rsi, rdx);
                syscallWriteStr = new TextDecoder().decode(result_buf);

                throw writeInterrupt;
            }
            default:
                throw 'Syscall: unsupported RAX value ' + syscall_num;
        }
    };

    let stopped = false;
    unicorn_engine.hook_add(uc.HOOK_INSN, function (handle) {
        if (stopped) return;

        try {
            syscallHandler(handle);
        } catch (e) {
            stopped = true;
            handle.emu_stop();
            throw e;
        }
    }, null, 1, 0, uc.X86_INS_SYSCALL);

    // unicorn_engine.hook_add(uc.HOOK_CODE, function (handle) {
    //     // RIP in this case points current instruction, let's see if it's a syscall
    //     let rip = handle.reg_read_i64(uc.X86_REG_RIP);
    //     let mem = handle.mem_read(rip, 2);

    //     // Syscall: 0x0f05
    //     // Technically there might be a longer instruction that starts with this, but I don't care
    //     if (mem[0] == 0xf && mem[1] == 0x5) {
    //         console.log("calling syscall")
    //         syscallHandler(handle);
    //     }
    // }, { c: false }, 1, 0);

    console.log("Creating data section, start =", hex(data_start), "minSize =", x86Assembled.data_section_size);
    unicorn_engine.mem_map(data_start, (next_page_size(x86Assembled.data_section_size)), uc.PROT_ALL);

    // Set up some stack space & set ptr in RSP
    let stack_len = 8 * 1024;
    console.log("Creating stack space, start =", hex(stack_start), "minSize =", stack_len);
    unicorn_engine.mem_map(stack_start, next_page_size(stack_len), uc.PROT_ALL);
    unicorn_engine.mem_write(stack_start, generate_arr(stack_len));


    let initial_rsp = stack_start + stack_len - 8;
    unicorn_engine.reg_write_i64(uc.X86_REG_RSP, initial_rsp);

    // Write the code to memory
    console.log("Writing", interpretableCode.length, "bytes of code to memory");
    unicorn_engine.mem_map(Number(x86Assembled.code_start_address), next_page_size(interpretableCode.length), uc.PROT_ALL);
    unicorn_engine.mem_write(Number(x86Assembled.code_start_address), interpretableCode);


    // Start at the entry point (usually the "main" symbol)
    console.log("Executing code starting at", hex(code_start), ", setting rip for main to", hex(x86Assembled.entrypoint_address), "(offset", Number(x86Assembled.entrypoint_address) - code_start + ")");
    try {
        // The timeout option doesn't work in webassembly; however we can restrict the number of instructions to run (in case of infinite loops)
        let max_instructions = 500000;

        // Since we cannot call syscallRead from the actual syscall handler, we always stop execution and restart it after we put something in the buffer
        while (true) {
            try {
                console.log(normal_end, codeOffset);
                
                unicorn_engine.emu_start(codeOffset, Number(x86Assembled.code_start_address) + interpretableCode.length, 0, max_instructions);
                if (normal_end || codeOffset < 0) {
                    break;
                }
            } catch (i) {
                console.log(i);
                switch (i) {
                    case readInterrupt:
                        syscallBuffer = await syscallRead(syscallReadCount);
                        break;
                    case writeInterrupt:
                        syscallWrite(syscallWriteStr);
                        continue;
                    default:
                        throw i;
                }
            }

            stopped = false;
        }

        if (!normal_end) {
            throw 'Max instruction count of ' + max_instructions + ' exceeded (infinite loop protection)';
        }
    } catch (e) {
        if (!normal_end) {
            throw e;
        }
    }

    // Program output
    let irax = unicorn_engine.reg_read_i64(uc.X86_REG_RAX);

    lineCallback(`Program ended with exit code ${irax}`);
}
