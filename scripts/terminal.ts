import '../node_modules/xterm/lib/xterm.js';

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

declare class Terminal {
    constructor(a: any);
    open(a: HTMLElement);
    write(s: string);
    onKey(a: any);

    options: any;
};

export class MemeAssemblyTerminal {
    private term: Terminal;

    private inputAllowed = false;

    // Input bytes not yet processed
    private inputBuffer: Uint8Array;
    private inputBufferEventElement: HTMLElement;

    constructor(element: HTMLElement) {
        this.term = new Terminal({
            theme: terminalTheme,
        });
        this.term.open(element);

        // Write init message
        this.term.write('This is the MemeAssembly terminal. Run your code to see some output.\n\r');

        this.inputBuffer = new Uint8Array();

        this.inputBufferEventElement = document.createElement('div');

        this.setInputAllowed(false);
        this.term.onKey(this.handleKeyInput(this));
    }

    private mergeBuffers = (arrayOne: Uint8Array, arrayTwo: Uint8Array) => {
        if (arrayOne.length === 0) return arrayTwo;
        let mergedArray = new Uint8Array(arrayOne.length + arrayTwo.length);
        mergedArray.set(arrayOne);
        mergedArray.set(arrayTwo, arrayOne.length);
        return mergedArray;
    }

    private handleKeyInput = (thisref: MemeAssemblyTerminal) => {
        return (input: { key: string; domEvent: KeyboardEvent; }, _: void) => {
            // Length is 1 for printable characters, e.g. "a", "ö" etc; however not for special keys
            if (!thisref.inputAllowed || input.key.length !== 1) return;

            let inputBytes = new TextEncoder().encode(input.key);
            if (inputBytes.length === 0) return;

            thisref.inputBuffer = this.mergeBuffers(thisref.inputBuffer, inputBytes);
            if (thisref.inputBuffer.length === 0) return;

            const event = new Event('buffer');
            thisref.inputBufferEventElement.dispatchEvent(event);
        }
    }

    private byteToStr = (byte: number) => {
        return new TextDecoder().decode(Uint8Array.from([byte]));
    }

    public readByte = () => {
        let readFirstBufferByte = () => {
            let byte = this.inputBuffer[0];
            this.inputBuffer = this.inputBuffer.slice(1);
            return Promise.resolve(this.byteToStr(byte));
        }

        if (this.inputBuffer.length > 0) {
            return readFirstBufferByte();
        }

        let ia = this.setInputAllowed;
        ia(true);

        // The next time something is put in the buffer we return it
        return new Promise((resolve) => {
            this.inputBufferEventElement.addEventListener('buffer', async function () {
                ia(false);
                resolve(await readFirstBufferByte());
            }, {
                once: true,
            });
        })
    }

    public setInputAllowed = (allowed: boolean) => {
        this.inputAllowed = allowed;
        this.term.options.cursorBlink = allowed;
    }


    private normalize = (input: string) => {
        return input.replace("\n", "\n\r")
    }

    public write = (input: string) => {
        this.term.write(this.normalize(input));
    }

    public writeLine = (line: string) => {
        this.term.write(this.normalize(line) + '\n\r');
    }
}

