// ==UserScript==
// @name        Catagolue extension function library
// @namespace   None
// @description Function library for other extension scripts
// @include     *://catagolue.appspot.com/
// @version     1.0
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// separators used for breadcrumb navigation links and search links
var breadcrumbSeparator = " » "; // Alternatively: > or ›
var genericSeparator    = " • ";

// symbols to use for collapsed/expanded comments. These should match the
// values in scripts/comments.js .
var commentCollapsedSymbol = "▶ " // U+25B6 BLACK RIGHT-POINTING TRIANGLE
var commentExpandedSymbol  = "▼ " // U+25BC BLACK DOWN-POINTING TRIANGLE

// separator used for numbers.
var numberSeparator = "\u2009"; // U+2009 THIN SPACE, aka &thinsp;

// where does Catagolue live, anyway?
var catagolueBaseUrl = "https://catagolue.appspot.com/";

/****************************
 * General helper functions *
 ****************************/

// upper-case the first character of a string.
function ucFirst(str) {
	// guard against empty strings; str[0] will throw an error for those.
	if (!str) return str;

	return str[0].toUpperCase() + str.slice(1);
}

// reverse a string.
function reverse(str) {
	// guard against empty strings
	if (!str) return str;

	return str.split('').reverse().join('');
}

// add separators to a number. This is called "commify" for historical
// reasons.
function commify(number, separator) {

	// default separator if none is passed
	if(!separator)
		separator = numberSeparator;

	// try and parse number.
	var matches = /^(\d+)(\.\d+)?$/.exec(number.toString());

	// unparsable? Return as-is.
	if(!matches)
		return number;

	var reverseNumberStr = "";
	var decimalDigits    = "";

	if(matches[2]) {
		reverseNumberStr = reverse(matches[1].toString());
		decimalDigits    = matches[2];
	} else
		reverseNumberStr = reverse(number.toString());
	
	// NOTE: there's probably a better way of doing this.
	reverseNumberStr = reverseNumberStr.replace(/(\d{3})(?=\d)(?!\d*\.)/g, "$1" + reverse(separator));

	return reverse(reverseNumberStr) + decimalDigits;
}

/*********************************
 * HTML-related helper functions *
 *********************************/

// find page's title heading
function findTitleHeading() {

	// find the content div; the heading is (currently) its first H2 child.
	// note that we really need to search for a H2 here; other functions may
	// insert elements into the content div before it, notably the breadcrumbs
	// navigation.
	var content = document.getElementById("content");
	if(content)
		for(var candidate = content.firstElementChild; candidate; candidate = candidate.nextElementSibling) {
			if(candidate.tagName == "H2")
				return candidate;
		}

	// this shouldn't happen unless the page layout changes.
	return null;

}

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

// insert a new node after a given reference node.
// FIXME: this should probably check the reference node does, in fact, have a
// parent.
function insertAfter(newNode, refNode) {

	// find reference node's next sibling
	var nextNode = refNode.nextSibling;

	if(nextNode)
		// if the reference node isn't the last child, insert the new node
		// before the next sibling node.
		refNode.parentNode.insertBefore(newNode, nextNode);

	else
		// if the reference node is the last child, append the new node to the
		// parent node.
		refNode.parentNode.appendChild(newNode);

}

// add a new class to a node.
function addClass(node, className) {

	if(node.getAttribute("class"))
		node.setAttribute("class", node.getAttribute("class") + " " + className);
	else
		node.setAttribute("class", className);

}

// inject a new script into the current page.
// NOTE: only scripts listed in web_accessible_resources in the manifest file
// can be injected this way.
function injectScript(injectedScript) {

	// create a new script element
	var script = document.createElement("script");

	// script type and source URL
	script.type = "text/javascript";
	script.src  = chrome.extension.getURL("scripts/" + injectedScript);

	// append script to document
	document.getElementsByTagName("head")[0].appendChild(script);

}

// create and return a hyperlink
function makeLink(linkTarget, linkText) {

	// create a new "a" element
	var link = document.createElement("a");

	link.href        = linkTarget;
	link.textContent = linkText;

	return link;

}

/****************************************
 * General GoL-related helper functions *
 ****************************************/

// convert a rulestring to slashed uppercase notation, e.g. "B3/S23" instead
// of "b3s23" etc. Generations rules such as g3b3s23 are converted to e.g.
// 23/3/3, and Larger than Life rules such as r7b65t95s65t114 become e.g.
// R7,C0,M1,S65..114,B65..95,NM. Note that named rules (e.g. "tlife") are left
// alone, as are neighborhood conditions in non-totalistic rules in Hensel
// notation.
function ruleSlashedUpper(params) {

	var formattedrule;

	if(params["generations"])
		formattedrule = params["s"] + "/" + params["b"] + "/" + params["states"];

	else if(params["largerthanlife"])
		formattedrule = "R" + params["range"] + ","
			              + "C0,M1,"
			              + "S" + params["smin"] + ".." + params["smax"] + ","
			              + "B" + params["bmin"] + ".." + params["bmax"] + ","
			              + "NM";

	else if(params["nontotalistic"] || params["outertotalistic"])
		formattedrule = "B" + params["b"] + "/S" + params["s"];

	else
		formattedrule = params["rule"];

	// we cheat a bit here and assume that the topology we got does indeed
	// conform to the guidelines set forth in
	// http://conwaylife.com/wiki/Catagolue_naming_conventions . If it does
	// not, this will not produce a valid topology that tools such as Golly
	// will understand, but there's little we can do about that.
	if(params["topology"])
		// don't you wish Javascript had an equivalent of Perl's tr/// 
		// operator?
		formattedrule += ":" + params["topology"].replace("x", ",").replace("f", "*").replace("p", "+");

	return formattedrule;

}

// determine whether a given symmetry is "official" or not.
function isOfficialSymmetry(symmetry) {
	switch(symmetry) {
		case "C1":
		case "C2_1":
		case "C2_2":
		case "C2_4":
		case "C4_1":
		case "C4_4":
		case "D2_+1":
		case "D2_+2":
		case "D2_x":
		case "D4_+1":
		case "D4_+2":
		case "D4_+4":
		case "D4_x1":
		case "D4_x4":
		case "D8_1":
		case "D8_4":
		case "8x32":
		case "4x64":
		case "2x128":
		case "1x256":
		case "SS":
			return true;

		default:
			return false;

	}
}

// determine whether a given symmetry is a test symmetry. By convention, all
// test symmetries should end in _Test (case-insensitively), but the under-
// score has not always been included, e.g. in 
// https://catagolue.appspot.com/census/b3s23/75pTEST .
function isTestSymmetry(symmetry) {
	return (symmetry.slice(-4).toLowerCase() == "test");
}

// return canonical URL for an object.
function canonicalObjectUrl(params) {
	var url = catagolueBaseUrl + "object/" + params["apgcode"] + "/" + params["rule"];

	// symmetry may be null if it could not be parsed from the URL.
	if(params["symmetry"])
		url += "/" + params["symmetry"];

	return url;
}

