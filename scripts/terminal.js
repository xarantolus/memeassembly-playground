var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import '../dependencies/xterm.js';
const terminalTheme = {
    foreground: '#EAEAEA',
    background: '#121110',
    cursor: '#d0d0d0',
    black: '#000000',
    brightBlack: '#000000',
    red: '#fd5ff1',
    brightRed: '#fd5ff1',
    green: '#87c38a',
    brightGreen: '#94fa36',
    yellow: '#ffd7b1',
    brightYellow: '#f5ffa8',
    blue: '#85befd',
    brightBlue: '#96cbfe',
    magenta: '#b9b6fc',
    brightMagenta: '#b9b6fc',
    cyan: '#85befd',
    brightCyan: '#85befd',
    white: '#e0e0e0',
    brightWhite: '#e0e0e0'
};
export class MemeAssemblyTerminal {
    constructor(element) {
        this.inputAllowed = false;
        this.mergeBuffers = (arrayOne, arrayTwo) => {
            if (arrayOne.length === 0)
                return arrayTwo;
            let mergedArray = new Uint8Array(arrayOne.length + arrayTwo.length);
            mergedArray.set(arrayOne);
            mergedArray.set(arrayTwo, arrayOne.length);
            return mergedArray;
        };
        this.handleKeyInput = (thisref) => {
            return (input, _) => {
                // Length is 1 for printable characters, e.g. "a", "ö" etc; however not for special keys
                if (!thisref.inputAllowed || input.key.length !== 1)
                    return;
                let inputBytes = new TextEncoder().encode(input.key.replace("\r", "\n"));
                if (inputBytes.length === 0)
                    return;
                thisref.inputBuffer = this.mergeBuffers(thisref.inputBuffer, inputBytes);
                if (thisref.inputBuffer.length === 0)
                    return;
                const event = new Event('buffer');
                thisref.inputBufferEventElement.dispatchEvent(event);
            };
        };
        this.byteToStr = (byte) => {
            return new TextDecoder().decode(Uint8Array.from([byte]));
        };
        this.readByte = (thisref) => {
            let readFirstBufferByte = () => {
                let byte = thisref.inputBuffer[0];
                thisref.inputBuffer = thisref.inputBuffer.slice(1);
                return Promise.resolve(byte);
            };
            if (thisref.inputBuffer.length > 0) {
                return readFirstBufferByte();
            }
            let ia = thisref.setInputAllowed;
            ia(true);
            // The next time something is put in the buffer we return it
            return new Promise((resolve) => {
                thisref.inputBufferEventElement.addEventListener('buffer', function () {
                    return __awaiter(this, void 0, void 0, function* () {
                        ia(false);
                        resolve(readFirstBufferByte());
                    });
                }, {
                    once: true,
                });
            });
        };
        this.setInputAllowed = (allowed) => {
            this.inputAllowed = allowed;
            this.term.options.cursorBlink = allowed;
        };
        this.normalize = (input) => {
            return input.replace("\n", "\n\r");
        };
        this.writeByte = (input) => {
            this.term.write(Uint8Array.from([input]));
            if (input == '\n'.charCodeAt(0)) {
                this.term.write('\r');
            }
        };
        this.write = (input) => {
            this.term.write(this.normalize(input));
            this.term.scrollToBottom();
        };
        this.writeLine = (line) => {
            this.term.write(this.normalize(line) + '\n\r');
            this.term.scrollToBottom();
        };
        this.term = new Terminal({
            theme: terminalTheme,
        });
        const fitAddon = new FitAddon.FitAddon();
        this.term.loadAddon(fitAddon);
        this.inputBuffer = new Uint8Array();
        this.inputBufferEventElement = document.createElement("div");
        this.term.open(element);
        this.term.onKey(this.handleKeyInput(this));
        window.addEventListener('resize', function () {
            fitAddon.fit();
        });
        fitAddon.fit();
        // Write init message
        this.term.write('This the terminal 👋  Run your code to see some output.\n\r');
    }
    clear() {
        this.term.clear();
    }
    focus() {
        this.term.focus();
    }
}
