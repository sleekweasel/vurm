
function minix(a) {
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
    var ceiling = document.getElementById('ceiling').offsetTop;
	var children = document.getElementsByTagName("div");
// var cwid = parseInt(flow[0].style.width) + ygap;
	var cwid = parseInt(children[0].offsetWidth) + ygap;
	var dwid = window.innerWidth;
	var cols = Math.max(Math.floor(dwid / cwid), 1);
	var sameColCount = cols == document.oldCols;
	document.oldCols = cols;
	var coff = dwid - cwid * cols;
	coff = coff / (cols + 1);
	cwid += coff;
	var colheight = new Array(cols);
	for (var i = 0; i < colheight.length; ++i) {
		colheight[i] = ceiling;
	}
	for (var i = 0; i < children.length; ++i) {
		var child = children[i];
			var style = child.style;
			var mincol = minix(colheight);
			var top = colheight[mincol];
			var left = coff + mincol * cwid;
			if (style.targetTop === undefined || (sameColCount && !document.stillTicking)) {
				style.isTop = top;
				style.top = style.isTop + "px";
				style.isLeft = left;
				style.left = style.isLeft + "px";			
			}
			style.targetTop = top;
			style.targetLeft = left;
			colheight[mincol] += parseInt(child.clientHeight) + ygap;
	}
	if (!sameColCount) {
		document.stillTicking = 1;
	}
}
function drift() {
	document.stillTicking = 0;
	var speed = 9;
	var speedp = speed + 1;
	var children = document.body.childNodes;
	for (var i = 0; i < children.length; ++i) {
		if (children[i].id == "flow") {
			var style = children[i].style;
			var ttop = style.targetTop;
			var tleft = style.targetLeft;
			style.isTop = (style.isTop * speed + ttop) * 1.0 / speedp;
			style.isLeft = (style.isLeft * speed + tleft) * 1.0 / speedp;
			var top = Math.floor(style.isTop);
			var left = Math.floor(style.isLeft);
			style.top = top + "px";
			style.left = left + "px";
			if (ttop != top || tleft != left) {
				document.stillTicking = 1;
			}
		}
	}
}
function tick() {
	var dimensionsChanged = (window.innerHeight != document.oldInnerHeight) || (window.innerWidth != document.oldInnerWidth);
	if (dimensionsChanged) {
		reflow();
		document.oldInnerHeight = window.innerHeight;
		document.oldInnerWidth = window.innerWidth;
	}
	if (document.stillTicking) {
		drift();
	}
}
