// Request Animation Frame Shim (courtesy of Erik Möller)
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelRequestAnimationFrame = window[vendors[x]+
          'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

function parseHexColor(hexStr) {
	var r, g, b;
	r = parseInt(hexStr.substr(1, 2), 16);
	g = parseInt(hexStr.substr(3, 2), 16);
	b = parseInt(hexStr.substr(5, 2), 16);
	return [r, g, b];
}
function toRGBstr(c) {
	return "rgb(" + c.map(Math.floor).join(",") + ")";
}

var Flower = function (opts) {
	// opts = _.defaults({})
	this.dots = opts.dots;
	this._scale = opts.scale / 10;
	this._logScale = Math.exp(opts.scale / 10);
	this.offset = opts.offset;
	this.grow = opts.grow;
	this.spacing = opts.spacing;
	this.ctx = opts.context;
	this.themes = opts.themes;
	this._theme = opts.theme;
	this._oldTheme = opts.theme;
	this.fgColor = opts.themes[opts.theme].fgColor;
	this.bgColor = opts.themes[opts.theme].bgColor;
	this.t0 = Date.now();
	this.easeDuration = 5000;
	this.animator = null;
	this.easing = function (t, d) {
		return (t==d) ? 1 : 1 - Math.pow(2, -10 * t/d);
	};
	this.offsetX = 0;
	this.offsetY = 0;
};

Flower.prototype = {
	get scale() {
		return this._scale * 10;
	},
	set scale(val) {
		this._scale = val / 10;
		this._logScale = Math.exp(val / 10);
	},
	get theme() {
		return this._theme;
	},
	set theme(val) {
		this._oldTheme = this._theme;
		this._theme = val;
		this.t0 = Date.now();
		this.transition();
	},
	draw: function () {
		var ctx = this.ctx;
		var r, // radius
			diagonal,
			s = this._logScale,
			n = this.dots,
			o = this.offset,
			fg = this.fgColor,
			bg = this.bgColor,
			w = ctx.canvas.width,
			h = ctx.canvas.height;

		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, w, h);

		ctx.save();
		ctx.translate(w / 2, h / 2);
		ctx.translate(this.offsetX, this.offsetY);
		ctx.fillStyle = fg;

		r = this.spacing * s / Math.sin(Math.PI / n);
		diagonal = Math.sqrt(w*w + h*h)/2;

		for (var c = 0; r < diagonal; c++) {
			if (c >= o) {
				for (var i = 0; i < n; i++) {
					var theta = c % 2 ? (i * 2 * Math.PI + Math.PI) / n : i * 2 * Math.PI / n;
					ctx.beginPath();
					ctx.arc(r * Math.cos(theta), r * Math.sin(theta), s, 0, 2 * Math.PI, false);
					ctx.fill();
				}
			}
			r += 2 * s;
			s += Math.log(this.grow) * 4 * s / n;
		}

		ctx.restore();
		
		return this;
	},
	transition: function () {
		this.animator = window.requestAnimationFrame(this.transition.bind(this));

		var t = Date.now();
		var dt = t - this.t0,

			o = this.themes[this._oldTheme],
			n = this.themes[this._theme],

			oldBg = parseHexColor(o.bgColor),
			oldFg = parseHexColor(o.fgColor),
			newBg = parseHexColor(n.bgColor),
			newFg = parseHexColor(n.fgColor),
			curBg = [0,0,0],
			curFg = [0,0,0],
			p;

		if (dt > this.easeDuration) {
			window.cancelAnimationFrame(this.animator);
			this.bgColor = n.bgColor;
			this.fgColor = n.fgColor;
			return;
		}

		p = this.easing(dt, this.easeDuration);

		for (var c = 0; c < 3; c++) {
			curBg[c] = oldBg[c] + p * (newBg[c] - oldBg[c]);
			curFg[c] = oldFg[c] + p * (newFg[c] - oldFg[c]);
		}

		this.bgColor = toRGBstr(curBg);
		this.fgColor = toRGBstr(curFg);

		this.draw();
	}
};

function drawHarmonograph(ctx, A, f, p, d) {
	var x, y;

	function pos(i, t) {
		return A[i] * Math.sin(f[i] * t + p[i]) * Math.exp(-d[i] * t);
	}

	ctx.beginPath();

	for (var t = 0; t < 100; t += 0.01) {
		x = pos(0, t) + pos(1, t);
		y = pos(2, t) + pos(3, t);
		ctx.lineTo(x, y);
	}
	ctx.stroke();
}

var Logo = {
	ctx: null,
	color: "#222222",
	params: {
		A: [48, 48, 48, 48],
		f: [2, 3, 3, 2],
		p: [1/16, 3/2, 13/15, 1],
		d: [0.02, 0.0315, 0.02, 0.02]
	},
	render: function () {
		this.ctx.save();
		this.ctx.clearRect(0, 0, 600, 600);
		this.ctx.translate(300, 120);
		this.ctx.rotate(this.params.theta);
		this.ctx.strokeStyle = this.color;
		this.ctx.lineWidth = 0.5;
		drawHarmonograph(this.ctx, this.params.A, this.params.f, this.params.p, this.params.d);
		this.ctx.restore();
	}
};

function loop() {
	var result = window.requestAnimationFrame(loop);
	Logo.params.theta = (Logo.params.theta + 0.002) % (2 * Math.PI);
	Logo.params.p[0] = (Logo.params.p[0] + 0.002) % (2 * Math.PI);
	Logo.params.p[1] = (Logo.params.p[1] - 0.005) % (2 * Math.PI);
	Logo.params.p[2] = (Logo.params.p[2] - 0.007) % (2 * Math.PI);
	Logo.params.p[3] = (Logo.params.p[3] + 0.003) % (2 * Math.PI);
	Logo.render();
	return result;
}

var verbs = ["enjoy", "admire", "love", "like"];
var nouns = ["mathematics", "algorithms", "cryptography", "physics", "design", "typography", "minimalism", "efficiency", "technology", "photography", "puzzles"];

window.addEventListener('load', function () {
	var bg_canvas = document.getElementById('bg');
	var bg_ctx = bg_canvas.getContext('2d');
	bg_canvas.width = window.innerWidth;
	bg_canvas.height = window.innerHeight;

	var subtitle = document.querySelector('#intro p.subtitle');
	var v = verbs[Math.floor(verbs.length * Math.random())];
	var n = nouns[Math.floor(nouns.length * Math.random())];
	subtitle.innerHTML = "I " + v + " " + n + ".";

	var themeList = {
		"light": {
			bgColor: "#e8e8e8",
			fgColor: "#eeeeee"
		},
		"dark": {
			bgColor: "#111111",
			fgColor: "#181818"
		},
		"red": {
			bgColor: "#cc3333",
			fgColor: "#d83838"
		},
		"green": {
			bgColor: "#33cc33",
			fgColor: "#38d838"
		},
		"blue": {
			bgColor: "#00aced",
			fgColor: "#00aff8"
		},
		"yellow": {
			bgColor: "#cccc33",
			fgColor: "#d8d838"
		}
	};

	var p = new Flower({
		dots: 160,
		scale: 0,
		offset: 18,
		spacing: 5,
		grow: 5,
		themes: themeList,
		theme: "light",
		context: bg_ctx
	}).draw();
	
	// function toggleTheme() {
	// 	var classes = document.body.classList;

	// 	classes.toggle('dark');
	// 	// p.theme = Logo.theme = classes.contains('dark') ? "dark" : "light";
		
	// 	if (classes.contains('dark')) {
	// 		p.theme = "dark";
	// 		Logo.color = "#eeeeee";
	// 	} else {
	// 		p.theme = "light";
	// 		Logo.color = "#222222";
	// 	}

	// 	p.draw();
	// 	Logo.render();
	// }

	// Logo.el = document.getElementById('logo');
	// Logo.ctx = Logo.el.getContext('2d');
	// Logo.render();
	// var logoAnimator = loop();

	// var gui = new dat.GUI();
	// gui.add(Logo.params, 'R').min(0).max(128).step(1);
	// gui.add(Logo.params, 'r').min(-128).max(128).step(1);
	// gui.add(Logo.params, 'O').min(0).max(128).step(1).listen();

	window.addEventListener('resize', function () {
		bg_canvas.width = window.innerWidth;
		bg_canvas.height = window.innerHeight;
		p.draw();
	}, false);

	// document.getElementById('theme').addEventListener('click', toggleTheme, false);
	window.addEventListener('keyup', function (e) {
		// console.log(e.which);
		if (e.which == 27) toggleTheme();
	}, false);

}, false);
