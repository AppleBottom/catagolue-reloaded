// ==UserScript==
// @name        Catagolue main census page tweaks
// @namespace   None
// @description Tweaks for Catagolue's main census overview page
// @include     *://catagolue.appspot.com/census
// @include     *://catagolue.appspot.com/census/
// @version     1.0
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// MAIN function.
function MAIN() {

	// convert unordered lists to ordered.
	convertLists();

	// adjust content DIV width.
	adjustContentWidth();

}

/*********************************
 * HTML-related helper functions *
 *********************************/

// create a new element based on an existing one (there is no built-in way to 
// simply "convert" an element to a new type).
// Code: "James", https://stackoverflow.com/a/2207198
function makeNewElementFromElement(tag, elem) {

    var newElem = document.createElement(tag);
	var attr    = elem.attributes;
	var attrLen = attr.length;

    // Copy children 
    elem = elem.cloneNode(true);
    while (elem.firstChild) {
        newElem.appendChild(elem.firstChild);
    }

    // Copy DOM properties
    for (var i in elem) {
        try {
            var prop = elem[i];
            if (prop && i !== 'outerHTML' && (typeof prop === 'string' || typeof prop === 'number')) {
                newElem[i] = elem[i];
            }
        } catch(e) { /* some props throw getter errors */ }
    }

    // Copy attributes
    for (var i = 0; i < attrLen; i++) {
        newElem.setAttribute(attr[i].nodeName, attr[i].nodeValue);
    }

    // Copy inline CSS
    newElem.style.cssText = elem.style.cssText;

    return newElem;
}

// adjust an element's width
function adjustElementWidth(element) {

	// get element's computed style
	var elementStyle = window.getComputedStyle(element);

	// set minimum width and unset width
	element.style.minWidth = elementStyle.width;
	element.style.width    = "unset";

}

/***********************
 * Major functionality *
 ***********************/

// convert unordered lists to ordered.
function convertLists() {

	// parse lists on this page, and convert HTMLCollection to an array so it 
	// won't be "live" and change underneath us when we remove those links.
	var lists = Array.prototype.slice.call(document.getElementsByTagName("ul"));
	for(var i = 0; i < lists.length; i++) {

		var list    = lists[i];
		var newList = list.parentNode.replaceChild(makeNewElementFromElement("ol", list), list);

	}

}

// page layout may break if outer-totalistic rulestrings get overly long. To
// prevent this, replace the hard-coded with with a minimum width.
function adjustContentWidth() {

	// find some divs...
	var contentDiv = document.getElementById("content");
	var centerDiv  = document.getElementById("centerDiv");

	// ...and adjust their widths.
	adjustElementWidth(contentDiv);
	adjustElementWidth(centerDiv );
	
	centerDiv.style.display = "inline-block";
	contentDiv.style.padding = "0 19px";

	// there are several navbar elements all sharing the same ID, so using
	// document.getElementById does not work here.
	var navbarDivs = document.querySelectorAll("[id='cl_navbar']");
	for(var i = 0; i < navbarDivs.length; i++)
		adjustElementWidth(navbarDivs[i]);

}

// ### MAIN ###
MAIN();
