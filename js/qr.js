
var QR = (function (dom) {
    "use strict";

    function pad(str, len, c) {
        while (str.length < len) {
            str = c + str;
        }
        return str;
    }

    function inspect(bits, len) {
        console.log(pad(bits.toString(2), len, "0"));
        // return bits;
    }

    // Constructor
    // @param version !required
    // @param scale
    // @param color
    // @param element
    function QR(version, scale, color, el) {
        try {
            if (arguments.length === 0) {
                throw new Error("QR() must be passed a version number");
            }
        } catch (e) {
            console.error(e.message);
        }

        // TODO: assert parameters are correct
        this.version = version;

        this.setColor(color ? color : "#000000");
        // this.setBackground(bgColor ? bgColor : "none");
        this.setScale(scale ? scale : 8);
        // this.setMode(mode ? mode : QR.ALPHANUMERIC);


        var byteSize = Math.ceil(this.size * this.size / 8);
        this._bitBuffer = new Uint8ClampedArray(byteSize);
        // console.log(this._bitBuffer);

        if (typeof el === "undefined" || el === null) {
            this.setCanvas(dom.createElement("canvas"));
        } else {
            this.setCanvas(el);
        }

        // this.init();
    }

    // Static Members
    QR.FINDER_PATTERN    = 1 << 0;
    QR.ALIGNMENT_PATTERN = 1 << 1;
    QR.TIMING_PATTERN    = 1 << 2;
    QR.DARK_MODULE       = 1 << 3;
    QR.ALL_PATTERNS      = 15;

    // Encoding Modes
    QR.END = 0;
    QR.NUMERIC = 1;
    QR.ALPHANUMERIC = 2;
    QR.STRUCTURED_APPEND = 3;
    QR.BYTE = 4;
    QR.FNC1_FIRST = 5;
    QR.ECI = 7;
    QR.KANJI = 8;
    QR.FNC1_SECOND = 9;

    // QR.FORMAT_MASK = 0b101010000010010;
    QR.FORMAT_MASK = 0x5412;

    QR.NO_MASK = function (i, j) { return 0; };

    // Private Static Members
    var ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

    // Create a list of the alignment locations
    // All of the (x,y) coordinates can be generated from this list by permutation
    function getAlignmentLocations(v) {
        if (v < 2) return [];
        var n = Math.floor(v / 7) + 1;

        var locations = new Array(n);
        for (var i = 0; i <= n; i++) {
            locations[i] = 6 + 2 * Math.floor(i * 4 * (v + 1) / (2 * n));
        }
        return locations;
    }

    // Creates a bit mask with all reserved locations (patterns) as 0
    // and all open locations as 1
    // This desperately needs to be refactored, it is very much a hacked-together approach
    function createPatternMask(size, patterns, alignmentLocations, format) {
        var byteSize = Math.ceil(size * size / 8);
        var buffer = new Uint8ClampedArray(byteSize);

        var isFinderPattern = false,
            isTimingPattern = false,
            isFormatString = false,
            isPattern = false,
            bit;

        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                if (format) {
                    isFormatString = (i === 8) && (j <= 8 || j >= size - 8) ||
                    (j === 8) && (i <= 8 || i > size - 8);
                }

                isPattern = isFormatString;
                bit = isPattern ? 0 : 1;
                QR.setBit(i * size + j, bit, buffer);
            }
        }

        // Add finder patterns
        if (patterns & QR.FINDER_PATTERN) {
            for (i = 0; i < 8; i++) {
                for (j = 0; j < 8; j++) {
                    QR.setBit(i * size + j, 0, buffer);
                    QR.setBit((size - 1 - i) * size + j, 0, buffer);
                    QR.setBit(i * size + (size - 1 - j), 0, buffer);
                }
            }
        }

        // Add format string
        // if (format) {
        //     for (i = size - 8; i)
        // }

        // Add timing pattern
        if (patterns & QR.TIMING_PATTERN) {
            for (i = size - 9; i >= 8; i--) {
                QR.setBit(6 * size + i, 0, buffer);
                QR.setBit(i * size + 6, 0, buffer);
            }
        }

        // Add dark module
        if (patterns & QR.DARK_MODULE) {
            QR.setBit((size - 8) * size + 8, 0, buffer);
        }

        // Add alignment patterns
        if (patterns & QR.ALIGNMENT_PATTERN) {
            var lastIndex = alignmentLocations.length - 1;
            var pi, pj;
            for (var a = lastIndex; a >= 0; a--) {
                for (var b = lastIndex; b >= 0; b--) {
                    pi = alignmentLocations[a];
                    pj = alignmentLocations[b];

                    if (a === 0 && b === 0 ||
                        a === 0 && b === lastIndex ||
                        b === 0 && a === lastIndex) {
                        continue;
                    }
                    var start = (pi - 2) * size + (pj - 2);
                    for (var bi = 0; bi < 25; bi++) {
                        QR.setBit(start + Math.floor(bi / 5) * size + (bi % 5), 0, buffer);
                    }
                }
            }
        }

        return buffer;
    }

    // Static Methods
    QR.fromCanvas = function (el) {
        var version = parseInt(el.getAttribute("data-version"));
        var scale = parseInt(el.getAttribute("data-scale"));
        var color = el.getAttribute("data-color");
        var bgColor = el.getAttribute("data-background");
        var mask = parseInt(el.getAttribute("data-mask"));
        var patterns = parseInt(el.getAttribute("data-patterns"));

        if (isNaN(version)) {
            console.error("Invalid QR version specified: " + version);
            return;
        }
        var qr = new QR(version);
        qr.setScale(isNaN(scale) ? 8 : scale);
        qr.setColor(color);
        qr.setBackground(bgColor);
        qr.setCanvas(el);
        if (!isNaN(mask)) qr.setMask(mask);
        if (!isNaN(patterns)) qr.patterns = patterns;

        var base64 = el.getAttribute("data-bits");
        if (typeof base64 === "undefined" || base64 === null) {
            base64 = "";
        }
        var buffer = qr.getBitBuffer();

        qr.setBitBuffer(QR.loadBase64(base64, buffer));

        return qr;
    };

    QR.drawAll = function () {
        var qrObjects = [];
        Array.prototype.forEach.call(dom.querySelectorAll("canvas.qr"), function (el) {
            var qr = QR.fromCanvas(el);
            qr.draw();
            qrObjects.push(qr);
        });
        window.qr = qrObjects;
    };

    QR.loadBase64 = function (b64, buffer) {
        // TODO: assert that data does not exceed size of buffer
        // var buffer = new Uint8ClampedArray(this.size * this.size);
        var str = atob(b64);

        for (var i = 0; i < str.length; i++) {
            buffer[i] = str.charCodeAt(i);
        }

        return buffer;
    };

    QR.makeBase64 = function (buffer) {
        return btoa(String.fromCharCode.apply(null, buffer));
    };

    // Gets the bit at the specified index in buffer
    QR.getBit = function (index, buffer) {
        var byteIndex = Math.floor(index / 8);
        if (0 <= byteIndex && byteIndex < buffer.length) {
            var byteValue = buffer[byteIndex];
            var offset = index % 8;
            var bitmask = 1 << offset;

            // buffer.getUint8(byteIndex, byteValue & bitmask) >> offset;
            return (byteValue & bitmask) >> offset;
        } else {
            throw new RangeError("Attempted access of an out-of-range index in buffer");
        }
    };

    // Sets the bit to value at the specified index in buffer
    QR.setBit = function (index, value, buffer) {
        var byteIndex = Math.floor(index / 8);
        if (0 <= byteIndex && byteIndex < buffer.length) {
            var byteValue = buffer[byteIndex];
            var offset = index % 8;
            var bitmask = 1 << offset;

            // buffer.setUint8(byteIndex, );
            buffer[byteIndex] = (value
                ? byteValue | bitmask
                : byteValue & ~bitmask);
        } else {
            throw new RangeError("Attempted access of an out-of-range index in buffer");
        }
    };

    QR.prototype = {
        // Private Members
        _version: null,
        _size: null,
        _bitBuffer: null,
        _format: null,
        _patterns: QR.ALL_PATTERNS,

        // Public Members
        scale: 1,
        canvas: null,
        ctx: null,
        content: "",
        margin: 4,
        numCodewords: null,

        get version () {
            return this._version;
        },
        set version (value) {
            this._version = value;
            this._size = 4 * this._version + 17;
            this._alignmentLocations = getAlignmentLocations(this.version);
            this._patternMask = createPatternMask(this._size, this._patterns, this._alignmentLocations, this._format);
        },

        get size () {
            return this._size;
        },

        get patterns () {
            return this._patterns;
        },
        set patterns (flags) {
            this._patterns = flags & QR.ALL_PATTERNS;
            this._patternMask = createPatternMask(this._size, this._patterns, this._alignmentLocations, this._format);
        },

        get format () {
            return this._format;
        },
        set format (value) {
            this._format = value & 0x7FFF;
            this._patternMask = createPatternMask(this._size, this._patterns, this._alignmentLocations, this._format);

            // TODO: set total number of codewords based on EC level and version
            // this.numCodewords = len;
        },

        get errorCorrection () {
            // var mask = 0b110000000000000;
            var mask = 0x6000;
            if (this.format === null) return 0;
            return (this.format & mask) >> 13;
        },
        set errorCorrection (value) {
            // var mask = 0b110000000000000;
            var mask = 0x6000;
            if (this.format === null) this.format = 0;
            this.format |= mask;
            this.format &= (value << 13) & mask;
        },

        get mask () {
            // var mask = 0b001110000000000;
            var mask = 0x1C00;
            if (this.format === null) return 0;
            return (this.format & mask) >> 10;
        },
        set mask (value) {
            // var mask = 0b001110000000000;
            var mask = 0x1C00;
            if (this.format === null) this.format = 0;
            this.format |= mask;
            this.format &= (value << 10) & mask;
        },

        get generator () {
            // var mask = 0b000001111111111;
            var mask = 0x03FF;
            if (this.format === null) return 0;
            return this.format & mask;
        },
        set generator (value) {
            // var mask = 0b000001111111111;
            var mask = 0x03FF;
            if (this.format === null) this.format = 0;
            this.format |= mask;
            this.format &= value & mask;
        }
    };

    // Public Methods
    QR.prototype.setBitBuffer = function (bits) {
        if (typeof bits === "string") {

        } else {
            this._bitBuffer = bits;
        }
        // TODO: parse this._bitBuffer and set data?
    };

    QR.prototype.getBitBuffer = function () {
        return this._bitBuffer;
    };

    QR.prototype.getModule = function (row, col, mask) {
        var bit = QR.getBit(row * this.size + col, this._bitBuffer);
        if (mask) bit = bit ^ this.isMasked(row, col);
        return bit;
    };

    QR.prototype.setModule = function (row, col, data) {
        QR.setBit(row * this.size + col, data, this._bitBuffer);
    };

    QR.prototype.readFormatString = function () {
        var format = 0;
        var i = 0;
        // Right
        while (i < 6) {
            format |= this.getModule(8, i) << (14 - i++);
        }
        // Corner
        format |= this.getModule(8, 7) << (14 - i++);
        format |= this.getModule(8, 8) << (14 - i++);
        format |= this.getModule(7, 8) << (14 - i++);
        // Up
        while (i < 15) {
            format |= this.getModule(14 - i, 8) << (14 - i++);
        }

        return format ^ QR.FORMAT_MASK;
    };

    QR.prototype.readAlternateFormatString = function () {
        var format = 0;
        var i = 0;
        // Up
        while (i < 7) {
            format |= this.getModule(this.size - 1 - i, 8) << (14 - i++);
        }
        // Right
        while (i < 15) {
            format |= this.getModule(8, this.size - 15 + i) << (14 - i++);
        }

        return format ^ QR.FORMAT_MASK;
    };

    QR.prototype.parseFormatString = function () {
        // TODO: check both format strings for errors
        // this.format = this.readFormatString();
        this.format = this.readAlternateFormatString();
    };

    QR.prototype.parseBlockEncoding = function () {
        this.bitScanner.mode = this.readMode();
        var lenBitSize = this.getCharacterCountSize();

        var len = 0;
        for (var i = 0; i < lenBitSize; ) {
            len |= this.readNextBit(true) << (lenBitSize - ++i);
        }

        // TODO: what happens when there is a remainder here?
        switch (this.bitScanner.mode) {
            // TODO: other encoding modes here?
            case QR.NUMERIC: this.bitScanner.count = len / 3; break;
            case QR.ALPHANUMERIC: this.bitScanner.count = len / 2; break;
            case QR.BYTE:
            case QR.KANJI:
            default: this.bitScanner.count = len; break;
        }
    };

    QR.prototype.readMode = function () {
        var mode = 0;
        // this.resetBitScanner();

        for (var i = 0; i < 4; i++) {
            mode |= this.readNextBit(true) << (3 - i);
        }

        return mode;
    };

    QR.prototype.getCharacterCountSize = function () {
        var size = 0;

        if (this.version <= 9) {
            switch (this.bitScanner.mode) {
                case QR.NUMERIC: size = 10; break;
                case QR.ALPHANUMERIC: size = 9; break;
                case QR.BYTE: size = 8; break;
                case QR.KANJI: size = 8; break;
                case QR.ECI: size = 6; break;
                default: size = 0; break;
            }
        } else if (this.version <= 26) {
            switch (this.bitScanner.mode) {
                case QR.NUMERIC: size = 12; break;
                case QR.ALPHANUMERIC: size = 11; break;
                case QR.BYTE: size = 16; break;
                case QR.KANJI: size = 10; break;
                case QR.ECI: size = 6; break;
                default: size = 0; break;
            }
        } else if (this.version <= 40) {
            switch (this.bitScanner.mode) {
                case QR.NUMERIC: size = 14; break;
                case QR.ALPHANUMERIC: size = 13; break;
                case QR.BYTE: size = 16; break;
                case QR.KANJI: size = 12; break;
                case QR.ECI: size = 6; break;
                default: size = 0; break;
            }
        } else {
            console.error("Unknown version");
        }
        return size;
    };

    QR.prototype.bitScanner = {
        isUp: true,
        isRight: true,
        row: 0,
        col: 0,
        index: 0,
        color: "#000000",
        mode: null,
        count: 0
    };

    QR.prototype.resetBitScanner = function () {
        this.bitScanner.row = this.size - 1;
        this.bitScanner.col = this.size - 1;
        this.bitScanner.isUp = true;
        this.bitScanner.isRight = true;
        this.bitScanner.index = this.size * this.size - 1;
        this.bitScanner.color = "#000000";
        this.bitScanner.mode = null;
        this.bitScanner.count = 0;
    };

    QR.prototype.getNextIndex = function () {
        var newIndex;
        var skip;
        this.ctx.globalAlpha = 0.8;
        do {
            this.ctx.fillStyle = skip ? "#FFFFFF" : this.bitScanner.color;
            this.drawModule(this.bitScanner.row, this.bitScanner.col, 1, false);

            if (this.bitScanner.isRight) {
                --this.bitScanner.col;
                this.bitScanner.isRight = false;
            } else {
                ++this.bitScanner.col;
                if (this.bitScanner.isUp) {
                    --this.bitScanner.row;
                    if (this.bitScanner.row < 0) {
                        this.bitScanner.isUp = false;
                        this.bitScanner.row = 0;
                        this.bitScanner.col -= 2;
                    }
                } else {
                    ++this.bitScanner.row;
                    if (this.bitScanner.row >= this.size) {
                        this.bitScanner.isUp = true;
                        this.bitScanner.row = this.size - 1;
                        this.bitScanner.col -= 2;
                    }
                }
                this.bitScanner.isRight = true;
            }
            newIndex = this.bitScanner.row * this.size + this.bitScanner.col;
            try {
                skip = QR.getBit(newIndex, this._patternMask) === 0 || this.bitScanner.col < 0;
            } catch (e) {
                skip = false;
            }
        } while (skip);
        return newIndex;
    };

    QR.prototype.readNextBit = function (mask) {
        var bit = 0;
        var maskBit = 0;
        try {
            bit = this.getModule(this.bitScanner.row, this.bitScanner.col);
            maskBit = this.isMasked(this.bitScanner.row, this.bitScanner.col);
            if (mask) bit = bit ^ maskBit;
        } catch (e) {
            console.error(e.message);
        }
        this.bitScanner.index = this.getNextIndex();
        return bit;
    };


    QR.prototype.readNextCodeword = function (mask) {
        var codeword = 0;
        var bitsPerCodeword;

        switch (this.bitScanner.mode) {
            case QR.NUMERIC: bitsPerCodeword = 10; break;
            case QR.ALPHANUMERIC: bitsPerCodeword = 11; break;
            case QR.BYTE: bitsPerCodeword = 8; break;
            case QR.KANJI: bitsPerCodeword = 13; break;
            // TODO: set bitsPerCodeword for other encoding modes
            default: bitsPerCodeword = 0; break;
        }

        // console.log(bitsPerCodeword);

        for (var i = 0; i < bitsPerCodeword; i++) {
            codeword |= this.readNextBit(mask) << (bitsPerCodeword - 1 - i);
        }
        // inspect(codeword, 8);

        if (this.bitScanner.mode === QR.NUMERIC) {
            // TODO: handle other encodings
        } else if (this.bitScanner.mode === QR.ALPHANUMERIC) {
            var char1 = codeword % 45;
            var char2 = (codeword - char1) / 45;
            return ALPHANUMERIC_CHARSET.charAt(char1) + ALPHANUMERIC_CHARSET.charAt(char2);
        } else if (this.bitScanner.mode === QR.BYTE) {
            return String.fromCharCode(codeword);
        } else {
            return codeword;
        }
    };

    // Reads the data from the QR code
    // @param bool mask whether to unmask before reading or not
    // @return string   the content of the QR code.
    QR.prototype.readData = function (mask) {
        var codewords;
        this.draw();
        this.parseFormatString();
        this.setMask(this.mask);
        this.resetBitScanner();

        console.log(this.errorCorrection, this.numCodewords);
        var colors = ["#AA0000", "#AA5500", "#AAAA00", "#00AA00", "#00AAAA", "#0000AA", "#5500AA", "#AA00AA"];

        // Data Codewords
        var data = [];
        for (var b = 0; b < 2; b++) {
            this.parseBlockEncoding();
            console.log(this.bitScanner.mode, this.bitScanner.count);

            codewords = [];
            // for (var i = 0; i < this.bitScanner.count; i++) {
            for (var i = 0; i < this.bitScanner.count; i++) {
                this.bitScanner.color = colors[i % colors.length];
                codewords[i] = this.readNextCodeword(mask);
            }
            data[b] = codewords;
        }

        // End Data Codewords Group
        this.bitScanner.color = "#000000";
        var mode = this.readMode();
        // if (mode === 0)

        // Error Correction Codewords
        // var errorCorrection = [];
        // for (var b = 0; b < 2; b++) {
        //     codewords = [];
        //     for (var i = 0; i < this.bitScanner.count; i++) {
        //         this.bitScanner.color = colors[i % colors.length];
        //         codewords[i] = this.readNextCodeword(mask);
        //     }
        //     errorCorrection[b] = codewords;
        // }
        // return blocks;
        return data[0].join("");
    };

    // QR.prototype.setContent = function (str) {
    //     // TODO: set mode from data analysis
    //     this.content = str;
    // };

    // QR.prototype.setContentFromBase64 = function (b64) {
    //     this.content = btoa(b64)
    // };

    // QR.prototype.generateBase64 = function () {
    //     return atob(this.content);
    // };

    QR.prototype.setCanvas = function (el) {
        // TODO: assert that el is a canvas element
        this.canvas = el;
        this.ctx = this.canvas.getContext("2d");

        // Resize canvas to fit QR code
        this.canvas.width = (this.size + 8) * this.scale;
        this.canvas.height = (this.size + 8) * this.scale;
    };

    QR.prototype.setColor = function (color) {
        this.color = color;
    };

    QR.prototype.setBackground = function (color) {
        this.background = typeof color !== "string" ? null : color;
    };

    QR.prototype.setScale = function (scale) {
        this.scale = scale;

        if (this.canvas) {
            // Resize canvas to fit QR code
            this.canvas.width = (this.size + 8) * this.scale;
            this.canvas.height = (this.size + 8) * this.scale;
        }
    };

    QR.prototype.getMaskModule = QR.NO_MASK;

    QR.prototype.setMask = function (m) {
        try {
            if (m === false) {
                this.getMaskModule = QR.NO_MASK;
            } else if (typeof m === "function") {
                if (m.length !== 2) {
                    throw new Error("The mask function must take two arguments: function (i, j) {...}");
                } else {
                    this.getMaskModule = m;
                }
            } else if (typeof m === "number") {
                if (0 <= m && m <= 7) {
                    switch (m) {
                        case 0: this.getMaskModule =
                            function (i, j) { return (i + j) % 2 === 0 ? 1 : 0; }; break;
                        case 1: this.getMaskModule =
                            function (i, j) { return i % 2 === 0 ? 1 : 0; }; break;
                        case 2: this.getMaskModule =
                            function (i, j) { return j % 3 === 0 ? 1 : 0; }; break;
                        case 3: this.getMaskModule =
                            function (i, j) { return (i + j) % 3 === 0 ? 1 : 0; }; break;
                        case 4: this.getMaskModule =
                            function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0 ? 1 : 0; }; break;
                        case 5: this.getMaskModule =
                            function (i, j) { return ((i * j) % 2) + ((i * j) % 3) === 0 ? 1 : 0; }; break;
                        case 6: this.getMaskModule =
                            function (i, j) { return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0 ? 1 : 0; }; break;
                        case 7: this.getMaskModule =
                            function (i, j) { return (((i + j) % 2) + ((i * j) % 3)) % 2 === 0 ? 1 : 0; }; break;
                        default: this.getMaskModule = QR.NO_MASK; break;
                    }
                } else {
                    throw new Error("QR.setMask(m): parameter must be between 0 and 7 inclusive");
                }
            } else {
                throw new Error("Unknown mask: QR.setMask(m) takes a number 0-7 or a mask function");
            }
        } catch (e) {
            console.error(e.message);
        }
    };

    QR.prototype.isMasked = function (i, j) {
        var isPattern = QR.getBit(i * this.size + j, this._patternMask) ? 1 : 0;
        return this.getMaskModule(i, j) & isPattern;
    };

    QR.prototype.drawModule = function (i, j, data, clear) {
        if (clear) {
            if (this.background !== null) {
                this.ctx.save();
                this.ctx.fillStyle = this.background;
                this.ctx.fillRect(
                    this.scale * (this.margin + j),
                    this.scale * (this.margin + i),
                    this.scale,
                    this.scale
                );
                this.ctx.restore();
            } else {
                this.ctx.clearRect(
                    this.scale * (this.margin + j),
                    this.scale * (this.margin + i),
                    this.scale,
                    this.scale
                );
            }
        }
        if (data) {
            this.ctx.fillRect(
                this.scale * (this.margin + j),
                this.scale * (this.margin + i),
                this.scale,
                this.scale
            );
        }
    };

    QR.prototype.fillModuleRect = function (left, top, width, height) {
        this.ctx.fillRect(
            this.scale * (this.margin + left),
            this.scale * (this.margin + top),
            width * this.scale,
            height * this.scale
        );
    };

    QR.prototype.clearModuleRect = function (left, top, width, height) {
        if (this.background !== null) {
            this.ctx.save();
            this.ctx.fillStyle = this.background;
            this.ctx.fillRect(
                this.scale * (this.margin + left),
                this.scale * (this.margin + top),
                width * this.scale,
                height * this.scale
            );
            this.ctx.restore();
        } else {
            this.ctx.clearRect(
                this.scale * (this.margin + left),
                this.scale * (this.margin + top),
                width * this.scale,
                height * this.scale
            );
        }
    };

    // | d | m | rule  |
    // |:-:|:-:|:------|
    // | 0 | 0 | skip  |
    // | 0 | 1 | write |
    // | 1 | 0 | write |
    // | 1 | 1 | skip  |

    QR.prototype.fillSolid = function (mask, clear) {
        var maskBit;

        for (var i = 0; i < this.size; i++) {
            for (var j = 0; j < this.size; j++) {
                maskBit = mask ? this.isMasked(i, j) : 0;
                this.drawModule(i, j, 1 ^ maskBit, clear);
            }
        }
    };

    QR.prototype.fillEmpty = function (mask, clear) {
        var maskBit;

        for (var i = 0; i < this.size; i++) {
            for (var j = 0; j < this.size; j++) {
                maskBit = mask ? this.isMasked(i, j) : 0;
                this.drawModule(i, j, maskBit, clear);
            }
        }
    };

    QR.prototype.fillRandom = function (mask, clear) {
        var maskBit, dataBit;

        for (var i = 0; i < this.size; i++) {
            for (var j = 0; j < this.size; j++) {
                maskBit = mask ? this.isMasked(i, j) : 0;
                dataBit = Math.random() < 0.5;
                this.drawModule(i, j, dataBit ^ maskBit, clear);
            }
        }
    };

    QR.prototype.drawBuffer = function (mask, clear) {
        var maskBit, dataBit, i, j;

        try {
            for (i = this.size - 1; i >= 0; i--) {
                for (j = this.size - 1; j >= 0; j--) {
                    maskBit = mask ? this.isMasked(i, j) : 0;
                    dataBit = this.getModule(i, j);
                    this.drawModule(i, j, dataBit ^ maskBit, clear);
                }
            }
        } catch (e) {
            console.error(e.message);
        }
    };

    QR.prototype.drawExternalBuffer = function (buffer, mask, clear) {
        var maskBit, dataBit, i, j;

        try {
            for (i = this.size - 1; i >= 0; i--) {
                for (j = this.size - 1; j >= 0; j--) {
                    maskBit = mask ? this.isMasked(i, j) : 0;
                    // dataBit = this.getModule(i, j);
                    dataBit = QR.getBit(i * this._size + j, buffer);
                    this.drawModule(i, j, dataBit ^ maskBit, clear);
                }
            }
        } catch (e) {
            console.error(e.message);
        }
    };

    QR.prototype.drawFinderPattern = function (left, top) {
        this.clearModuleRect(left - 1, top - 1, 9, 9);
        this.fillModuleRect(left, top, 7, 7);
        this.clearModuleRect(left + 1, top + 1, 5, 5);
        this.fillModuleRect(left + 2, top + 2, 3, 3);
    };

    QR.prototype.drawAlignmentPatterns = function () {
        if (this.version > 1) {
            var i, j;

            for (var a = this._alignmentLocations.length - 1; a >= 0; a--) {
                for (var b = this._alignmentLocations.length - 1; b >= 0; b--) {
                    i = this._alignmentLocations[a];
                    j = this._alignmentLocations[b];

                    if (i === 6 && j === 6 ||
                        i === 6 && j === (this.size - 7) ||
                        j === 6 && i === (this.size - 7)) {
                        continue;
                    }

                    this.clearModuleRect(j - 2, i - 2, 5, 5);
                    this.fillModuleRect(j - 2, i - 2, 5, 5);
                    this.clearModuleRect(j - 1, i - 1, 3, 3);
                    this.drawModule(i, j, 1);
                }
            }
        }
    };

    QR.prototype.drawTimingPatterns = function () {
        this.clearModuleRect(8, 6, this.size - 15, 1);
        this.clearModuleRect(6, 8, 1, this.size - 15);
        for (var i = 8; i < this.size - 7; i += 2) {
            this.drawModule(6, i, 1);
            this.drawModule(i, 6, 1);
        }
    };

    QR.prototype.drawFormat = function (clear) {
        var format = this.format ^ QR.FORMAT_MASK;
        // Main format string (top left)
        // var format = 0;
        var i = 0;
        // Right
        while (i < 6) {
            this.drawModule(8, i, (format >> (14 - i++)) & 1, clear);
        }
        // Corner
        this.drawModule(8, 7, (format >> (14 - i++)) & 1, clear);
        this.drawModule(8, 8, (format >> (14 - i++)) & 1, clear);
        this.drawModule(7, 8, (format >> (14 - i++)) & 1, clear);
        // Up
        while (i < 15) {
            this.drawModule(14 - i, 8, (format >> (14 - i++)) & 1, clear);
        }

        // Alternate format string
        i = 0;
        // Up
        while (i < 7) {
            this.drawModule(this.size - 1 - i, 8, (format >> (14 - i++)) & 1, clear);
        }
        // Right
        while (i < 15) {
            this.drawModule(8, this.size - 15 + i, (format >> (14 - i++)) & 1, clear);
        }
    };

    QR.prototype.drawPatterns = function () {
        if (this.patterns & QR.FINDER_PATTERN) {
            this.drawFinderPattern(0, 0);
            this.drawFinderPattern(0, this.size - 7);
            this.drawFinderPattern(this.size - 7, 0);
        }
        if (this.patterns & QR.DARK_MODULE) {
            this.drawModule(this.size - 8, 8, 1, true);
        }
        if (this.patterns & QR.TIMING_PATTERN) {
            this.drawTimingPatterns();
        }
        if (this.patterns & QR.ALIGNMENT_PATTERN) {
            this.drawAlignmentPatterns();
        }
    };

    QR.prototype.clear = function () {
        this.clearModuleRect(
                -this.margin,
                -this.margin,
                this.size + 2 * this.margin,
                this.size + 2 * this.margin);
    };

    QR.prototype.draw = function (clear) {
        console.log(this.background);
        if (clear !== false) this.clear();
        this.ctx.fillStyle = this.color;

        // if (this.)
        this.drawBuffer(true, clear);
        // }

        this.drawPatterns();
    };

    return QR;

})(window.document);
