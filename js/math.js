
// KaTeX auto-render
function renderMath() {
    var each = Array.prototype.forEach;
    var scripts = document.querySelectorAll("script[type^=\"math/tex\"]");
    each.call(scripts, function (s) {
        // console.log(s.type);
        var inline = s.type.indexOf("mode=display") >= 0;
        console.log(s.parentNode);
        
        if (inline) {
            var el = document.createElement("span");
            s.parentNode.insertBefore(el, s);
            katex.render(s.innerText, el);
        } else {
            var el = document.createElement("p");
            s.parentNode.insertBefore(el, s);
            katex.render(s.innerText, el);
        }
    });
}

window.addEventListener('load', function (e) {
    renderMath();
});
