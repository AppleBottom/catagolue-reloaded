/*** ELEMENT DRAG AND DROP SUPPORT SCRIPT ***/

/*****************************************************************************
 * NOTE: script taken from http://www.quirksmode.org/js/dragdrop.html , with *
 * the following changes:                                                    *
 *     a) removed keyboard dragging.                                         *
 *     b) added ability to ignore mouse clicks in a specified child.         *
 * Event handlers taken from http://www.quirksmode.org/js/eventSimple.html . *
 * Both written by ppk Peter-Paul Koch; no license given, but implied to be  *
 * permissive.                                                               *
 *****************************************************************************/

function addEventSimple(obj,evt,fn) {
	if (obj.addEventListener)
		obj.addEventListener(evt,fn,false);
	else if (obj.attachEvent)
		obj.attachEvent('on'+evt,fn);
}

function removeEventSimple(obj,evt,fn) {
	if (obj.removeEventListener)
		obj.removeEventListener(evt,fn,false);
	else if (obj.detachEvent)
		obj.detachEvent('on'+evt,fn);
}

dragDrop = {
	initialMouseX: undefined,
	initialMouseY: undefined,
	startX: undefined,
	startY: undefined,
	draggedObject: undefined,
	excludedObject: undefined,
	initElement: function (element, excl) {
		if (typeof element == 'string')
			element = document.getElementById(element);
		if (typeof excl == 'string')
			excl = document.getElementById(excl);
		element.onmousedown = dragDrop.startDragMouse;
		excludedObject = excl;
	},
	startDragMouse: function (e) {
		if(e.target == excludedObject)
			return true;
		dragDrop.startDrag(this);
		var evt = e || window.event;
		dragDrop.initialMouseX = evt.clientX;
		dragDrop.initialMouseY = evt.clientY;
		addEventSimple(document,'mousemove',dragDrop.dragMouse);
		addEventSimple(document,'mouseup',dragDrop.releaseElement);
		return false;
	},
	startDrag: function (obj) {
		if (dragDrop.draggedObject)
			dragDrop.releaseElement();
		dragDrop.startX = obj.offsetLeft;
		dragDrop.startY = obj.offsetTop;
		dragDrop.draggedObject = obj;
		obj.className += ' dragged';
	},
	dragMouse: function (e) {
		var evt = e || window.event;
		var dX = evt.clientX - dragDrop.initialMouseX;
		var dY = evt.clientY - dragDrop.initialMouseY;
		dragDrop.setPosition(dX,dY);
		return false;
	},
	setPosition: function (dx,dy) {
		dragDrop.draggedObject.style.left = dragDrop.startX + dx + 'px';
		dragDrop.draggedObject.style.top = dragDrop.startY + dy + 'px';
	},
	releaseElement: function() {
		removeEventSimple(document,'mousemove',dragDrop.dragMouse);
		removeEventSimple(document,'mouseup',dragDrop.releaseElement);
		dragDrop.draggedObject.className = dragDrop.draggedObject.className.replace(/dragged/,'');
		dragDrop.draggedObject = null;
	}
}
