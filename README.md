# [MemeAssembly Playground](https://memeasm.010.one)
This is an online editor & playground for [MemeAssembly](https://kammt.github.io/MemeAssembly). Its concept is similar to the [Go Playground](https://go.dev/play/), but the way it works is quite different.

Please note that **this project is in a very beta state** and doesn't work that well right now. Some syscalls (write, read) are implemented, but I am aware of some bugs that I have currently not found the solution for.

### How it works
This project makes extensive use of [WebAssembly](https://webassembly.org/). To compile and run a program, the following steps happen:
1. The program is translated to the `x86_64`-Assembly text representation using the [MemeAssembly compiler](https://kammt.github.io/MemeAssembly)
   * In order to get the compiler running on the web, I compiled it with [emscripten](https://emscripten.org/)
2. The resulting `x86_64`-Assembly text is assembled using my [assembly-script](https://github.com/xarantolus/assembly-script) assembler written in Rust, resulting in `x86_64` binary code that could[^1] run on a real CPU
   * The main assembly work is done using the [`iced-x86` crate](https://github.com/icedland/iced/blob/master/src/rust/iced-x86/README.md)
3. This assembled binary code is then run using the [Unicorn CPU Emulator](https://www.unicorn-engine.org/) compiled for WebAssembly
   * The WebAssembly version of this emulator was created by [@AlexAltea](https://github.com/AlexAltea/unicorn.js), [my fork](https://github.com/xarantolus/unicorn.js) just makes sure the compilation works with newer emscripten versions
4. Hooks are added to catch syscalls and do the correct actions (e.g. for reading/writing data from/to the terminal) that would happen on a real Linux system
   * This syscall handler is quite basic and currently has some bugs where characters are written twice

[^1]: Actually the assembler does some tricks that require a very special memory layout and setup to actually run the program, but the website/emulator implements that environment
