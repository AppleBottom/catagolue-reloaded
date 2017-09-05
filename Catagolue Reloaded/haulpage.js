// ==UserScript==
// @name        Catagolue haul page tweaks
// @namespace   None
// @description Tweaks for Catagolue's haul pages
// @include     *://catagolue.appspot.com/haul/*
// @version     1.0
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// MAIN function.
function MAIN() {

	// keep long apgcodes from breaking the page layout.
	wrapLongApgcodes();

	// handle sample soups using the overlay, and also wrap long roots in 
	// hauls.
	handleSampleSoupsAndHaulLinks();

}

/*********************************
 * HTML-related helper functions *
 *********************************/

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

/***********************
 * Major functionality *
 ***********************/

// display sample soups in an overlay. This is a much-simplified version of
// the function with the same name in catagoluereloaded.js.
function handleSampleSoupsAndHaulLinks() {

	// regular expression to extract information from sample soup links
	var symRegex   = /hashsoup\/(.*?)\/.*?\/(.*?)$/;

	// regular expression to extract information from haul links
	var haulRegex  = /haul\/(.*?)\/(.*?)\/([0-9a-f]){32}$/;

	// we want to have soup links pop up an overlay with a textarea. In order 
	// to do this, we set an onclick handler on the links below that calls a
	// function doing this. This function must live in the document, however,
	// so we inject it now.
	injectScript("sampleSoupOverlay.js");

	// furthermore, we need to inject Paul Johnston's MD5, SHA-256 and SHA-256
	// scripts, since Javascript lacks any built-in support for computing 
	// hashes.
	injectScript("md5.js");
	injectScript("sha256.js");
	injectScript("sha512.js");

	// finally, we need to insert Peter-Paul Koch's element dragging script,
	// so that the soup overlay can be dragged around the page with the mouse.
	injectScript("dragondrop.js");

	// parse links on this page. Unlike in catagoluereloaded.js, we don't get 
	// cute with the links, so we don't have to convert HTMLCollection to an 
	// array so it won't be "live" and change underneath us when we remove 
	// those links.

//	var links = Array.prototype.slice.call(document.getElementsByTagName("a"));
	var links = document.getElementsByTagName("a");

	for(var i = 0; i < links.length; i++) {
	  
		var link	   = links[i];
		var linkTarget = link.getAttribute("href");

		if(symRegex.test(linkTarget)) {

			// in order to figure out the apgcode, we go up from the link to
			// its parent (a table cell), then to the previous element (also
			// a table cell), and then to that element's first child (another
			// link, pointing to the object we're interested in.
			var parent        = link.parentNode;
			var olderUncle    = parent.previousElementSibling;
			var cousin        = olderUncle.firstElementChild;
			var apgcode       = cousin.textContent;

			// a name might also be mentioned after the link, and we want it.
			var youngerCousin = cousin.nextSibling;
			var name          = "";

			if(youngerCousin)
				name = youngerCousin.textContent.replace(/\s*[()]\s*/g, "");

			// have this link handled by our injected soup overlay script.
			// The third and fourth parameter would be this sample soup's
			// number and the total number of sample soups for the given
			// symmetry, respectively, but since we're on a haul page rather 
			// than an object page, these values are undefined, so we'll just
			// pass 0, which the overlay script will know how to handle.
			link.setAttribute("onclick", 'return !overlaySoup("' + link.href + '", 0, 0, "' + apgcode + '", "' + name + '");');
		  
		} else if(haulRegex.test(linkTarget))
			// we use this opportunity to also word-wrap long roots in haul
			// links; this should perhaps be in its own function, but we're
			// already iterating over all links here, so... why not, eh? See
			// https://catagolue.appspot.com/haul/b3s23/Saka_Test?committed=2
			// for why this matters.
			link.style.wordBreak = "break-all";

	}
}

function wrapLongApgcodes() {

	// there are several navbar elements all sharing the same ID, so using
	// document.getElementById does not work here.
	var apgcodeTds = document.querySelectorAll("td:nth-child(2)");
	for(var i = 0; i < apgcodeTds.length; i++)
		apgcodeTds[i].style.wordBreak = "break-all"; // .style.overflowWrap = "break-word"; doesn't work here.

}

// ### MAIN ###
MAIN();
