---
layout: post
title:  "Manual Decryption of a Broken QR Code"
date:   2015-03-04 09:30:00
categories: crypto
math: true
scripts: [qr.js]
---

A word of caution: this journal entry includes spoilers for FEZ. I highly recommend playing the game 'organically,' that is, without spoilers or foreknowledge of certain game mechanics. I've made an effort to conceal potential spoilers, but as always, proceed with caution.

![][fez-screen]

I've spent some time recently with [FEZ][fez], the indie video game from Phil Fish and Renaud Bedárd. It's a fantastic gem of a game, and I wholeheartedly recommend it if you're into slow-paced puzzle games. If taking your time collecting all the items and solving all the puzzles sounds like you, this game is for you.

## Problem

At one point in the game, there is a room with what looks like a QR code engraved into the wall. However, there seems to be parts missing, not to mention that some of it is covered up by objects in the foreground.

![FEZ QR Code][screenshot]{: class="spoiler"}

This is problematic because no QR code scanner that I have tried can read it. Thankfully, QR codes are designed with an algorithm ([Reed–Solomon error correction][RSEC]) which allow it to be read correctly even if some of the code is mangled or missing. This does not help the scanner, however, because there is simply too much information missing or covered up. Knowing that the code must meet some basic format requirements, can we reconstruct the original QR code so that we can read the original data?

## Extracting the QR Code

Because a scanner cannot read the code directly from the in-game graphics, I extracted what I could see of the code with a graphics editing program.

<canvas class="qr" data-version="2" data-scale="8" data-color="#222222" data-mask="" data-bits="AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcA=="></canvas>

## Extracting Format Information

QR codes are well-defined data structures originally used in the Japanese automotive industry. There are many *versions* of QR codes; each version $$v$$ is a specific size $$s$$ defined by the equation:

$$ s = 4 v + 17 $$

The FEZ QR code is 25 modules by 25 modules, where a *module* describes one white or black square in the code. This size indicates that the code is of version 2.

Every QR code has several required features: finder patterns, timing patterns, alignment pattern(s), a format specifier, and a dark module. See the diagram below for how these are laid out in the QR code.

![Diagram of QR features][qr-features]

## References

1. [Thonky QR Code Tutorial][thonky]

<script>QR.drawAll()</script>

[fez-screen]: http://lorempixel.com/1440/480/technics/8/
[fez]: http://www.fezgame.com/
[screenshot]: http://lorempixel.com/640/360/technics/4/
[RSEC]: https://en.wikipedia.org/wiki/Reed%E2%80%93Solomon_error_correction
[qr-fragment]: #
[qr-features]: http://www.thonky.com/qr-code-tutorial/function-patterns2.png
[thonky]: http://www.thonky.com/qr-code-tutorial/
