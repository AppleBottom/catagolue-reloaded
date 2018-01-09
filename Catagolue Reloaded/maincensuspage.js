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

    // word-wrap census links (so very long rules don't break the layout).
	// NOTE: we don't actually do that right now because it looks worse this
	// way.
//	wordwrapCensusLinks();

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

// word-wrap census links
function wordwrapCensusLinks() {

	var links = document.getElementsByTagName("a");
	for(var i = 0; i < links.length; i++) {

		var link = links[i];
		if(/^\/census\/.*\//.test(link.getAttribute("href")))
			link.style.wordBreak = "break-all"; // overflowWrap = "break-word";

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
