
var QR = (function (dom) {

    // Private Members
    var size;
    var bitBuffer;

    // Private Methods

    // Public Members
    QR.prototype.scale = 1;
    QR.prototype.mask = function (i, j) { return false; };
    QR.prototype.canvas = null;
    QR.prototype.ctx = null;
    QR.prototype.data = "";

    // Constructor
    // @param version !required
    // @param scale
    // @param color
    // @param element
    function QR(version, scale, color, el) {
        try {
            if (arguments.length == 0) {
                throw new Error("QR() must be passed a version number");
                return void(0);
            }
        } catch (e) {
            console.error(e.message);
        }

        // TODO: assert parameters are correct
        this.version = version;
        this.setColor(color ? color : "#000000");
        this.setScale(scale ? scale : 8);

        size = 4 * this.version + 17;
        bitBuffer = new Uint8ClampedArray(size * size);

        if (typeof el === "undefined" || el === null) {
            this.setCanvas(dom.createElement("canvas"));
        } else {
            this.setCanvas(el);
        }
    }

    // Static Methods
    QR.drawAll = function () {
        var qrObjects = [];
        Array.prototype.forEach.call(dom.querySelectorAll("canvas.qr"), function (el) {
            var version = parseInt(el.getAttribute("data-version"));
            var scale = parseInt(el.getAttribute("data-scale"));
            var color = el.getAttribute("data-color");
            var mask = parseInt(el.getAttribute("data-mask"));

            if (isNaN(version)) {
                console.error("Invalid QR version specified: " + version);
                return;
            }
            var qr = new QR(version);
            qr.setScale(isNaN(scale) ? 8 : scale);
            qr.setColor(color);
            qr.setCanvas(el);
            if (!isNaN(mask)) qr.setMask(mask);

            var base64 = el.getAttribute("data-bits");
            if (typeof base64 === "undefined" || base64 === null) {
                base64 = "";
            }
            var buffer = qr.getBitBuffer();

            qr.setBitMatrix(QR.loadBase64(base64, buffer));

            qr.draw();
            qrObjects.push(qr);
        });
        window.qr = qrObjects;
    };

    QR.loadBase64 = function (b64, buffer) {
        // TODO: assert that data does not exceed size of buffer
        // var buffer = new Uint8ClampedArray(size * size);
        var str = atob(b64);

        for (var i = 0; i < str.length; i++) {
            buffer[i] = str.charCodeAt(i);
        }

        return buffer;
    };

    QR.makeBase64 = function (buffer) {
        return btoa(String.fromCharCode.apply(null, buffer))
    };

    QR.getBit = function (index, buffer) {
        if (0 <= index && index < buffer.length) {
            var byteIndex = Math.floor(index / 8);
            var value = buffer[byteIndex];
            var offset = index % 8;
            var bitmask = 1 << offset;
            // console.log(value.toString(2));
            // console.log(bitmask.toString(2));
            return (value & bitmask) >> offset;
        } else {
            throw new RangeError("Attempted access of an out-of-range index in buffer");
        }
    };

    // Public Methods
    QR.prototype.setBitMatrix = function (bits) {
        if (typeof bits === "string") {

        } else {
            bitBuffer = bits;
        }
        // TODO: parse bitBuffer and set data?
    };

    QR.prototype.getBitBuffer = function (convert) {
        if (convert) {
            return toDataStr(bitBuffer);
        } else {
            return bitBuffer;
        }
    };

    // QR.prototype.setData = function (str) {
    //     // TODO: set mode from data analysis
    //     this.data = str;
    // };

    // QR.prototype.setDataFromBase64 = function (b64) {
    //     this.data = btoa(b64)
    // };

    // QR.prototype.generateBase64 = function () {
    //     return atob(this.data);
    // };

    QR.prototype.setCanvas = function (el) {
        // TODO: assert that el is a canvas element
        this.canvas = el;
        this.ctx = this.canvas.getContext("2d");

        // Resize canvas to fit QR code
        this.canvas.width = (size + 8) * this.scale;
        this.canvas.height = (size + 8) * this.scale;
    };

    QR.prototype.setColor = function (color) {
        this.color = color;
    };

    QR.prototype.setScale = function (scale) {
        this.scale = scale;
    };

    QR.prototype.setMask = function (m) {
        try {
            if (m === false) {
                this.mask = function (i, j) { return false; };
            } else if (typeof m === "function") {
                if (m.length !== 2) {
                    throw new Error("The mask function must take two arguments: function (i, j) {...}");
                } else {
                    this.mask = m;
                }
            } else if (typeof m === "number") {
                if (0 <= m && m <= 7) {
                    switch (m) {
                        case 0: this.mask = function (i, j) { return (i + j) % 2 === 0; }; break;
                        case 1: this.mask = function (i, j) { return j % 2 === 0; }; break;
                        case 2: this.mask = function (i, j) { return i % 3 === 0; }; break;
                        case 3: this.mask = function (i, j) { return (i + j) % 3 === 0; }; break;
                        case 4: this.mask = function (i, j) { return (Math.floor(i / 3) + Math.floor(j / 2)) % 2 === 0; }; break;
                        case 5: this.mask = function (i, j) { return ((i * j) % 2) + ((i * j) % 3) === 0; }; break;
                        case 6: this.mask = function (i, j) { return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0; }; break;
                        case 7: this.mask = function (i, j) { return (((i + j) % 2) + ((i * j) % 3)) % 2 === 0; }; break;
                        default: this.mask = function (i, j) { return false; }; break;
                    }
                } else {
                    throw new Error("QR.setMask(m): parameter must be between 0 and 7 inclusive")
                }
            } else {
                throw new Error("Unknown mask: QR.setMask(m) takes a number 0-7 or a mask function");
            }
        } catch (e) {
            console.error(e.message);
        }
    };

    QR.prototype.drawModule = function (i, j) {
        this.ctx.fillRect(
            this.scale * (4 + i),
            this.scale * (4 + j),
            this.scale,
            this.scale
        );
    };

    QR.prototype.fillModuleRect = function (left, top, width, height) {
        this.ctx.fillRect(
            this.scale * (4 + left),
            this.scale * (4 + top),
            width * this.scale,
            height * this.scale
        );
    };

    QR.prototype.clearModuleRect = function (left, top, width, height) {
        this.ctx.clearRect(
            this.scale * (4 + left),
            this.scale * (4 + top),
            width * this.scale,
            height * this.scale
        );
    };

    // Masking rules:
    // data == 1 && mask == 1 => skip
    // data == 0 && mask == 1 => write
    // data == 1 && mask == 0 => write
    // data == 0 && mask == 0 => skip

    QR.prototype.fillSolid = function (mask) {
        var maskBit, dataBit;

        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                maskBit = mask ? this.mask(i, j) : 0;
                dataBit = 1;
                if (dataBit ^ maskBit) this.drawModule(i, j);
            }
        }
    };

    QR.prototype.fillEmpty = function (mask) {
        var maskBit, dataBit;

        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                maskBit = mask ? this.mask(i, j) : 0;
                dataBit = 1;
                if (dataBit ^ maskBit) this.drawModule(i, j);
            }
        }
    };

    QR.prototype.fillRandom = function (mask) {
        var maskBit, dataBit;

        for (var i = 0; i < size; i++) {
            for (var j = 0; j < size; j++) {
                maskBit = mask ? this.mask(i, j) : 0;
                dataBit = Math.random() < 0.5;
                if (dataBit ^ maskBit) this.drawModule(i, j);
            }
        }
    };

    QR.prototype.fillFromBuffer = function (buffer, mask) {
        var maskBit, dataBit, i, j;

        for (i = size - 1; i >= 0; i--) {
            for (j = size - 1; j >= 0; j--) {
                maskBit = mask ? this.mask(i, j) : 0;
                dataBit = QR.getBit(i * size + j, buffer);
                if (dataBit ^ maskBit) this.drawModule(i, j);
            }
        }
    };

    QR.prototype.drawFinderPattern = function (left, top) {
        this.clearModuleRect(left - 1, top - 1, 9, 9);
        this.fillModuleRect(left, top, 7, 7);
        this.clearModuleRect(left + 1, top + 1, 5, 5);
        this.fillModuleRect(left + 2, top + 2, 3, 3);
    };

    QR.prototype.drawAlignmentPatterns = function (left, top) {
        this.fillModuleRect(left - 2, top - 2, 5, 5);
        this.clearModuleRect(left - 1, top - 1, 3, 3);
        this.drawModule(left, top);
    };

    QR.prototype.drawTimingPatterns = function () {
        this.clearModuleRect(8, 6, size - 15, 1);
        this.clearModuleRect(6, 8, 1, size - 15);
        for (var i = 8; i < size - 7; i += 2) {
            this.drawModule(6, i);
            this.drawModule(i, 6);
        }
    };

    QR.prototype.draw = function () {
        this.ctx.fillStyle = this.color;
        this.clearModuleRect(-4, -4, size + 8, size + 8);
        
        // this.fillRandom(true);
        this.fillFromBuffer(bitBuffer, true);
        // Finder patterns
        this.drawFinderPattern(0, 0);
        this.drawFinderPattern(0, size - 7);
        this.drawFinderPattern(size - 7, 0);
        // Dark module
        this.drawModule(8, size - 8);
        // Timing patterns
        this.drawTimingPatterns();
        // Alignment patterns
        // this.drawAlignmentPatterns();
    };

    return QR;

})(window.document);
