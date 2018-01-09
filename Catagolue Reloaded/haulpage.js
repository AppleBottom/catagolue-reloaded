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

	// read page parameters
	var params = readParams();

	if(params != null) {

		// keep long apgcodes from breaking the page layout.
		wrapLongApgcodes(params);

		// handle sample soups using the overlay, and also wrap long roots in 
		// hauls.
		handleSampleSoupsAndHaulLinks(params);

		// add commas to numbers where appropriate.
		commifyNumbers(params);

	} else {

		// this shouldn't happen on pages where this script actually runs.
		console.log("Could not read page parameters.");

	}

}

/********************
 * Helper functions *
 ********************/

// read and return apgcode, rulestring etc.
function readParams() {

	var pieces = document.location.pathname.split("/");
	if(pieces) {

		var params = new Object;

		// parameters extracted from URL
		params["rule"    ] = pieces[2];
		params["symmetry"] = pieces[3];

		if(pieces.length >= 4)
			params["root"] = pieces[4];

		// other parameters
		// (none yet)

		return params;
	}

	// location didn't match.
	return null;

}

/***********************
 * Major functionality *
 ***********************/

// display sample soups in an overlay. This is a much-simplified version of
// the function with the same name in catagoluereloaded.js.
function handleSampleSoupsAndHaulLinks(params) {

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

			if(youngerCousin && /\(.*\)/.test(youngerCousin.textContent))
				name = youngerCousin.textContent.replace(/\s*[()]\s*/g, "");

			if(!name)
				name = "";

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

function wrapLongApgcodes(params) {

	if(params["root"]) {
		// we're on an individual haul page, e.g. 
		// https://catagolue.appspot.com/haul/b3s23/C1/2c43a2e731b9c600a7021c12436e68d0 .

		// there are several navbar elements all sharing the same ID, so using
		// document.getElementById does not work here.
		var apgcodeTds = document.querySelectorAll("td:nth-child(2), td:nth-child(3)");
		for(var i = 0; i < apgcodeTds.length; i++)
			apgcodeTds[i].firstElementChild.style.wordBreak = "break-all"; // .style.overflowWrap = "break-word"; doesn't work here.
	}

}

function commifyNumbers(params) {

	if(!params["root"]) {
		// we're on a haul overview page, e.g.
		// https://catagolue.appspot.com/haul/b3s23/C1 .

		var children = document.querySelectorAll("td:nth-child(3), td:nth-child(4)");
		for(var i = 0; i < children.length; i++) {

			children[i].textContent = commify(children[i].textContent);

			// avoid linebreaks if numberSeparator happens to be a whitespace 
			// character.
			children[i].style.whiteSpace = "nowrap";

			// technically this doesn't belong in this function, but it's too
			// convenient to set it here not to.
			children[i].style.textAlign  = "right";
		}

	} else {
		// we're on an individual haul page, e.g. 
		// https://catagolue.appspot.com/haul/b3s23/C1/2c43a2e731b9c600a7021c12436e68d0 .

		// commify numbers in object table.
		// NOTE: the table may have 3 or 4 columns, depending on whether the
		// server decides to include object images.
		var children = document.querySelectorAll("td:last-child");
		for(var i = 0; i < children.length; i++) {

			// note: the table cell contains not just a number, but a number a
			// number followed by a linebreak and a bunch of sample soup links.
			// we therefore pick the first child node to work on, which 
			// happens to be a text node containing the number we want.
			var node = children[i].firstChild;
			node.textContent = commify(node.textContent);

			// avoid linebreaks if numberSeparator happens to be a whitespace 
			// character. We could set this on node (the text node) rather 
			// than children[i] (the table cell), but setting it on the cell
			// leads to an overall tighter layout. It also has the potential to
			// layout breakage if there's too many sample soup links, but in
			// practice this shouldn't happen, as Catagolue only displays so
			// many to begin with.
			children[i].style.whiteSpace = "nowrap";

			// this really doesn't belong here, but it's convenient to have 
			// it here.
			children[i].style.textAlign  = "right";
		}

		// find intro paragraph
		var titleHeading = findTitleHeading();
		var introParagraph = titleHeading.nextElementSibling.nextElementSibling;

		// attempt to parse info from intro paragraph
		var introParagraphRegex = /It contains (\d+) objects \((\d+) distinct\) generated from (\d+) soups./;
		var matches = introParagraphRegex.exec(introParagraph.textContent);
		if(matches) {

				// commify numbers
				var numObjects  = commify(matches[1]);
				var numDistinct = commify(matches[2]);
				var numSoups    = commify(matches[3]);

				// we could try to splice the numbers in, but it's easier to
				// simply reassemble the entire intro paragraph from scratch.
				introParagraph.textContent = "It contains " + numObjects + " objects (" + numDistinct + " distinct) generated from " + numSoups + " soups.";

		}
	}
}

// ### MAIN ###
MAIN();

