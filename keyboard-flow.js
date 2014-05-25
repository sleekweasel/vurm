
function indexOfSmallest(a) {
	var m = 0;
	for (var i = 1; i < a.length; ++i) {
		if (a[m] > a[i]) {
			m = i;
		}
	}
	return m;
}
function reflow() {
	var ygap = 20;
var d=document.getElementById('debug');
    var ceiling = document.getElementById('ceiling').offsetTop;
	var children = document.getElementsByClassName("lobe");
	var colWidth = parseInt(children[0].offsetWidth) + ygap;
	var displWidth = window.innerWidth;
	var colCount = Math.min(Math.max(Math.floor(displWidth / colWidth), 1), 3);
//d.innerHTML = "cw=" + colWidth + " dw=" + displWidth + " cc=" + colCount;
	var gutter = displWidth - colWidth * colCount;
	gutter = gutter / (colCount + 1);
    gutter = Math.min(gutter, 100);
	colWidth += gutter;
    var lgutter = (displWidth + gutter - (colCount) * colWidth)/2;
	var colheight = new Array(colCount);
	for (var i = 0; i < colheight.length; ++i) {
		colheight[i] = ceiling;
	}
	for (var i = 0; i < children.length; ++i) {
		var child = children[i];
        var style = child.style;
        var mincol = indexOfSmallest(colheight);
        var top = colheight[mincol];
        var left = lgutter + mincol * colWidth;
        style.top = top + "px";
        style.left = left + "px";
//d.innerHTML = d.innerHTML + " " + mincol + "--" + colheight[mincol];
        colheight[mincol] += parseInt(child.clientHeight) + ygap;
	}
}
function tick() {
	var dimensionsChanged = (window.innerHeight != document.oldInnerHeight) || (window.innerWidth != document.oldInnerWidth);
	if (dimensionsChanged) {
		reflow();
	}
    document.oldInnerHeight = window.innerHeight;
    document.oldInnerWidth = window.innerWidth;
}
