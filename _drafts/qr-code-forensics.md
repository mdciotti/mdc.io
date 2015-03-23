---
layout: post
title:  "QR Code Forensics"
date:   2015-03-04 09:30:00
categories: crypto
math: true
feature: true
scripts: [qr.js]
background: "/img/journal/fire.jpg"
photo_credit: "Public Domain Archives"
photo_credit_url: "http://publicdomainarchive.com/public-domain-images-fire-wood-dark-night-black-orange-warm/"
description: "An interactive exploration of how to extract the contents of an unscannable QR code"
lede: "QR Codes are everywhere, from item tracking to product packaging to bitcoin addresses. They are incredibly resilient to damage and deformation, but what happens if no matter what you try, it still won't scan? It turns out we can still sometimes read the data by cracking it open manually."
---

[![][fez-screen-preview]][fez-screen]{:class="pixelated"}

I've spent some time recently with [FEZ][fez], the indie video game from Phil Fish and Renaud Bedárd. It's a fantastic gem, and I wholeheartedly recommend it if you're into puzzle games. If taking your time collecting all the items and solving all the puzzles sounds like you, this game is for you. Plus, the [soundtrack][fez-ost] is *amazing*.

<canvas id="qr-editor" class="pixelated"
	data-version="2"
	data-scale="16"
	data-color="#111111"
	data-background="#CCCCCC"
	data-mask=""
	data-patterns="15"
	data-bits="">
</canvas>
<script>
(function () {
	var el = document.getElementById("qr-editor");
	// el.style.cursor = "none";
	var qrEditor = QR.fromCanvas(el);
	window.qrEditor = qrEditor;
	var buffer = qrEditor.getBitBuffer();
	var size = qrEditor.size;
	var button = 0;

	qrEditor.draw();

	qrEditor.draw = function (e) {
		var j = Math.floor((e.pageX - e.target.offsetLeft) / this.scale) - 4;
		var i = Math.floor((e.pageY - e.target.offsetTop) / this.scale) - 4;
		this.ctx.save();
		this.clear();
		// this.fillFromBuffer(buffer, false);

		// this.ctx.globalAlpha = 0.5;
		this.ctx.fillStyle = "#888888";
		this.drawPatterns();
		// this.ctx.globalAlpha = 1.0;
		this.ctx.fillStyle = this.color;
		this.drawBuffer(false);

		var leftMouseDown = button === 1;
		var rightMouseDown = button === 3;

		// console.log(leftMouseDown, rightMouseDown);

		if (0 <= j && j < size && 0 <= i && i < size) {
			if (leftMouseDown || rightMouseDown) {
				var bit = (leftMouseDown && !e.shiftKey) ? 1 : 0;
				// QR.setBit(i * size + j, bit, buffer);
				this.setModule(i, j, bit);
			}
		} else {
			this.ctx.globalAlpha = 0.25;
		}

		// Draw grid
		this.ctx.save();
		this.ctx.translate(this.margin * this.scale, this.margin * this.scale);
		// this.ctx.translate(-0.5, -0.5);
		this.ctx.strokeStyle = "#888888";
		this.ctx.beginPath();
		for (var line = 0; line <= size; line++) {
			this.ctx.moveTo(0, line * this.scale);
			this.ctx.lineTo(size * this.scale, line * this.scale);
			this.ctx.moveTo(line * this.scale, 0);
			this.ctx.lineTo(line * this.scale, size * this.scale);
		}
		this.ctx.stroke();
		this.ctx.restore();

		this.ctx.fillStyle = e.shiftKey ? "#0055AA" : "#AA0000";
		this.drawModule(i, j, 1, false);
		this.ctx.restore();
	};

	el.addEventListener("mousedown", function (e) {
		e.preventDefault();
		// Normalize mouse button
		if (!e.which && typeof e.button !== "undefined") {
			button = (e.button & 1 ? 1 : (e.button & 2 ? 4 : (e.button & 4 ? 2 : 0)));
		} else {
			button = e.which;
		}
		qrEditor.draw.call(qrEditor, e);
	});
	el.addEventListener("mouseup", function (e) {
		button = 0;
	});
	// MouseEvent.button is not set properly on mousemove
	el.addEventListener("mousemove", qrEditor.draw.bind(qrEditor));
	el.addEventListener("contextmenu", function (e) {
		e.preventDefault();
		return false;
	});
})();
</script>

A word of caution: this journal entry includes spoilers for FEZ. I highly recommend playing the game 'organically,' that is, without spoilers or foreknowledge of certain game mechanics. I've made an effort to conceal potential spoilers, but if you intend to play the game, read with caution.
{: class="soft"}

## Problem

At one point in the game, there is a room with what looks like a QR code engraved into the wall. However, there seems to be parts missing, not to mention that some of it is covered up by objects in the foreground.

![FEZ QR Code][screenshot]{: class="pixelated spoiler"}

This is problematic because no QR code scanner that I have tried can read it. Thankfully, QR codes are designed with an algorithm ([Reed–Solomon error correction][RSEC]) which allow it to be read correctly even if some of the code is mangled or missing. This does not help the scanner, however, because there is simply too much information missing or covered up. Knowing that the code must meet some basic format requirements, can we reconstruct the original QR code so that we can read the original data?

## Reproducing the QR Code

Because a scanner cannot read the code directly from the in-game graphics, I extracted what I could see of the code with a graphics editing program.

<canvas class="pixelated qr"
	data-version="2"
	data-scale="8"
	data-color="#222222"
	data-background="#CCCCCC"
	data-mask=""
	data-patterns="0"
	data-bits="AMD8AQAJAoDQBQCkCwBZFwCsIABUfwCQAAAkLAAfzgHkCQDI9gGM5waAzI6zFwEWn1RDPF8AUuP8mdcIwondxfSpS/1GV0rroEKcfwigAQ==">
</canvas>

Unfortunately this still did not scan. I knew QR codes adhere to a standard format, so I figured there might be missing information that I can confidently fill in.

## Extracting Format Information

QR codes are well-defined data structures originally used in the Japanese automotive industry. There are many *versions* of QR codes; each version $$v$$ is a specific (square) size $$s$$ defined by the function:

$$ s(v) = 4 v + 17 $$

The FEZ QR code fragment is 25 modules by 25 modules, where a *module* describes one light or dark square in the QR code. This size indicates that the fragment is a version 2 QR code.

Every QR code has several required features: finder patterns, alignment patterns, timing patterns, and a dark module. See the diagram below for how these are laid out in the QR code.

<ol style="float: right; line-height: 2.75; width:50%;" id="qr-features-key">
	<li><a class="button" data-patterns="1">Finder patterns</a></li>
	<li><a class="button" data-patterns="2">Alignment patterns</a></li>
	<li><a class="button" data-patterns="4">Timing patterns</a></li>
	<li><a class="button" data-patterns="8">Dark module</a></li>
</ol>
<canvas id="qr-features" class="pixelated"
	data-version="8"
	data-scale="5"
	data-color="#222222"
	data-background="#CCCCCC"
	data-mask=""
	data-patterns="15"
	data-bits="">
</canvas>
<script>
(function makeFeaturesQR() {
	var el = document.getElementById("qr-features");
	var qrFeatures = QR.fromCanvas(el);
	var patternBuffer = qrFeatures._patternMask;
	qrFeatures.patterns = 0;

	qrFeatures.draw = function (pattern) {
		qrFeatures.clear();
		qrFeatures.ctx.fillStyle = "#BBBBBB";
		qrFeatures.drawExternalBuffer(patternBuffer, false, false);

		qrFeatures.ctx.fillStyle = "#888888";
		qrFeatures.patterns = QR.ALL_PATTERNS;
		qrFeatures.drawPatterns();

		qrFeatures.ctx.fillStyle = "#111111";
		qrFeatures.patterns = pattern;
		qrFeatures.drawPatterns();
	};

	qrFeatures.draw(0);

	var list = document.getElementById("qr-features-key").children;
	var pattern = QR.ALL_PATTERNS;

	Array.prototype.forEach.call(list, function (li) {
		var button = li.children[0];
		button.addEventListener("mouseover", function highlightFeature(e) {
			pattern = parseInt(button.getAttribute("data-patterns"));
			qrFeatures.draw(pattern);
		});
		button.addEventListener("mouseout", function unhighlightFeatures(e) {
			qrFeatures.draw(0);
		});
	});
})();
</script>

Every QR code also has a *format specifier*: a 15-bit string containing metadata about how to decode the QR data. When a QR code is generated, the format string is masked (XOR) with the binary string `101010000010010`. To read the original format data, we must reverse that process. This simply means to XOR the format string with that constant:

$$
\begin{array}{cc}
       & 011000001101000 \\
\oplus & 101010000010010 \\
\hline
       & 110010001111010
\end{array}
$$

The decoded format string is broken down as follows:

<table class="bit-field">
<tr><th colspan="15">Format String Bit Field</th></tr>
<tr class="bits"><td>1</td><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td><td>0</td></tr>
<tr><td colspan="2"><abbr title="Error Correction">EC</abbr></td><td colspan="3">Mask</td><td colspan="10">Format Error Correction</td></tr>
</table>

The first two bits (0, 1) specify the amount of error correction used in the QR code. This allows four possible error correction levels, as detailed in the table below: 

Level                  | Bits | Error Correction
-----------------------|------|---------------------------------
Level L (low)          | `01` | 7% of codewords can be restored
Level M (medium)       | `00` | 15% of codewords can be restored
Level Q (quartile)     | `11` | 25% of codewords can be restored
Level H (high)         | `10` | 30% of codewords can be restored

The FEZ QR fragment encodes with error correction level Q, so 25% of the codewords can be restored.

The next three bits (2, 3, 4) specify the mask. The *mask pattern* is a formula which determines whether or not to flip the status of a single module. In practice, you have a data bit $$d$$ and a mask bit $$m$$, and the resultant bit $$r$$ is given by:

$$ r = d \oplus m $$

There are eight defined mask patterns in the QR specifications. The table below enumerates the formulae for these patterns, where $$i$$ is the row index and $$j$$ is the column index. If the formula returns 1 (evaluates as true), the bit at that index should be flipped.

<!--
Mask | Bits  | Formula
-----|-------|--------
0    | `000` | $$ m_0(i, j) = \left(i + j\right) \mod 2 \equiv 0 $$
1    | `001` | $$ m_1(i, j) = \left(i\right) \mod 2 \equiv 0 $$
2    | `010` | $$ m_2(i, j) = \left(j\right) \mod 3 \equiv 0 $$
3    | `011` | $$ m_3(i, j) = \left(i + j\right) \mod 3 \equiv 0 $$
4    | `100` | $$ m_4(i, j) = \left( \lfloor i / 2 \rfloor + \lfloor j / 3 \rfloor \right) \mod 2 \equiv 0 $$
5    | `101` | $$ m_5(i, j) = \left(\left(i * j\right) \mod 2\right) + \left(\left(i * j\right) \mod 3\right) \equiv 0 $$
6    | `110` | $$ m_6(i, j) = \left( \left(\left(i * j\right) \mod 2\right) + \left(\left(i * j\right) \mod 3\right) \right) \mod 2 \equiv 0 $$
7    | `111` | $$ m_7(i, j) = \left( \left(\left(i + j\right) \mod 2\right) + \left(\left(i * j\right) \mod 3\right) \right) \mod 2 \equiv 0 $$
-->

Mask | Bits  | Formula (integer arithmetic)
-----|-------|-----------------------------
0    | `000` | `m0(i, j) = (i + j) % 2 == 0`
1    | `001` | `m1(i, j) = (i) % 2 == 0`
2    | `010` | `m2(i, j) = (j) % 3 == 0`
3    | `011` | `m3(i, j) = (i + j) % 3 == 0`
4    | `100` | `m4(i, j) = (i / 2 + j / 3) % 2 == 0`
5    | `101` | `m5(i, j) = ((i * j) % 2) + ((i * j) % 3) == 0`
6    | `110` | `m6(i, j) = (((i * j) % 2) + ((i * j) % 3)) % 2 == 0`
7    | `111` | `m7(i, j) = (((i + j) % 2) + ((i * j) % 3)) % 2 == 0`

The mask bits from the FEZ QR code fragment are `001`, which means mask 1 is used. On empty data ($$ d = 0 $$), mask 1 looks like this:

<canvas class="pixelated qr"
	data-version="2"
	data-scale="8"
	data-color="#222222"
	data-background="#CCCCCC"
	data-mask="1"
	data-patterns="0"
	data-bits="">
</canvas>

If we apply this mask to the FEZ QR fragment (which was already masked when generated), we will effectively unmask the data. Combine this with the standard patterns where they were missing, and you get the following:

<canvas class="pixelated qr"
	data-version="2"
	data-scale="8"
	data-color="#222222"
	data-background="#CCCCCC"
	data-mask="1"
	data-patterns="15"
	data-bits="AMD8AQAJAoDQBQCkCwBZFwCsIABUfwCQAAAkLAAfzgHkCQDI9gGM5waAzI6zFwEWn1RDPF8AUuP8mdcIwondxfSpS/1GV0rroEKcfwigAQ==">
</canvas>
<canvas class="pixelated qr"
	data-version="2"
	data-scale="8"
	data-color="#222222"
	data-background="#CCCCCC"
	data-mask="2"
	data-patterns="15"
	data-bits="AJkBAHIBAPwFAKACAMAFAKAiAAAAAID6ABzlzkECSxEaycc4BYzQrT0EtETFB/EWrAMxE+ABNMAD4AMGAAQMEA4GYIgqwKVRAHCJAF75AQ==">
</canvas>
<canvas class="pixelated qr"
	data-version="1"
	data-scale="8"
	data-color="#222222"
	data-background="#CCCCCC"
	data-mask=""
	data-patterns="15"
	data-bits="AAcAoAEAEAAADgDQAAAeAAAAAIgAJ+eZpWqHbMUI1224CQEoNoBcBHhFAKwawOYBTG2A0wEQEwE=">
</canvas>
<canvas class="pixelated qr"
	data-version="1"
	data-scale="8"
	data-color="#222222"
	data-background="#CCCCCC"
	data-mask="3"
	data-patterns="15"
	data-bits="ABMAoAIAYACAAwDAAAA8AAAAAMgArVzaduJ5KmrRDtnZrQA0AkDiA/h1AB4OIAoBfBoA9wiwdwA=">
</canvas>

TODO: make interactive mask applicator that displays decoded output

## References

1. [Thonky QR Code Tutorial][thonky]
2. [Reed–Solomon codes for coders][wikiversity]
3. [DataGenetics: Wounded QR Codes][data-genetics]
4. [FEZ Screenshot][fez-screen-source]

<script>QR.drawAll()</script>

[fez-screen-preview]: /img/journal/fez-screenshot-preview.png
[fez-screen]: http://upload.wikimedia.org/wikipedia/commons/0/08/Fez_%28video_game%29_screenshot_08.png
[fez-ost]: http://disasterpeace.com/album/fez
[fez]: http://www.fezgame.com/
[screenshot]: /img/journal/fez.png
[RSEC]: https://en.wikipedia.org/wiki/Reed%E2%80%93Solomon_error_correction
[qr-features]: http://www.thonky.com/qr-code-tutorial/function-patterns2.png
[thonky]: http://www.thonky.com/qr-code-tutorial/
[wikiversity]: http://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders
[data-genetics]: http://datagenetics.com/blog/november12013/index.html
[fez-screen-source]: http://commons.wikimedia.org/wiki/File:Fez_(video_game)_screenshot_08.png
