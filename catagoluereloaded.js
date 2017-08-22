// ==UserScript==
// @name        Catagolue Reloaded
// @namespace   None
// @description Various useful tweaks to Catagolue object pages.
// @include     https://catagolue.appspot.com/object/*
// @version     2.2
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// separator used for breadcrumb navigation links
var breadcrumbSeparator = " » "; // > ›

// MAIN function.
function MAIN() {

	// read page parameters
	var params = readParams();

	if(params != null) {

		// do our work.
		addNavLinks    (params);
		sortSampleSoups(params);
		objectToRLE    (params);

	} else {

		// this shouldn't happen on pages where this script actually runs.
		console.log("Could not read page parameters.");

	}
}

/*********************************
 * HTML-related helper functions *
 *********************************/

// find the heading containing the object's code
function findTitleHeading() {

	// find the content div; the heading is (currently) its first child.
	var content = document.getElementById("content");
	if(content)
		return content.firstElementChild;

	// this shouldn't happen unless the page layout changes.
	return null;

}

// find the H2 beginning the comments section.
function findCommentsH2() {

	var contentRegex = /Comments \(/;

	// most elements on Catagolue pages do not have ids etc., so instead we 
	// look for the right h2 tag.
	// NOTE: this may break if Catagolue's page layout changes.
	var h2s = document.getElementsByTagName("h2");
	for(var i = 0; i < h2s.length; i++) {
	  
		if(contentRegex.test(h2s[i].textContent)) {
			return h2s[i];
		}
	}

	// not found?
	return null;

}

// find the paragraph containing the sample soup links.
function findSampleSoupsParagraph() {

	// most elements on Catagolue pages do not have ids etc., so instead we
	// look for the right h3 tag; the paragraph we want is the following 
	// element.
	// NOTE: this may break if Catagolue's page layout changes.
	var h3s = document.getElementsByTagName("h3");
	for(var i = 0; i < h3s.length; i++) {
	  
		if(h3s[i].textContent == "Sample occurrences") {
			return h3s[i].nextElementSibling;
		}
	}

	// not found?
	return null;

}

// append a table row containing a hr element to a node (a table, in practice).
function appendHR(node) {

	var hrRow = document.createElement("tr");
	node.appendChild(hrRow);

	// HACK: hardcoded colspan=3.
	var hrCell = document.createElement("td");
	hrCell.setAttribute("colspan", "3");
	hrCell.setAttribute("style", "padding-top: 0; padding-bottom: 0");
	hrRow.appendChild(hrCell);

	var hr = document.createElement("hr");
	hr.setAttribute("style", "margin: 0");
	hrCell.appendChild(hr);

}

// read and return apgcode, rulestring etc.
function readParams() {

	// regular expression to extract apgcode and rulestring from the page URL
	var locRegex = /object\/(.*?)\/(.*)/;

	// regular expression to extract prefix and encoded object from apgcode
	var codeRegex = /^(.*?)_(.*)$/;

	var matches = locRegex.exec(document.location);
	if(matches) {

		var params = new Object;

		// parameters extracted from URL go here.

		params["apgcode"] = matches[1];

		// the rulestring may or may not contain the symmetry as well.
		// Normally it won't, but if the user came from a page that our
		// symmetry injector script ran on, it will.
		if(matches[2].indexOf("/") == -1) {

			params["rule"    ] = matches[2];
			params["symmetry"] = null;

		} else {

			var pieces = matches[2].split("/", 2);

			params["rule"    ] = pieces[0];
			params["symmetry"] = pieces[1];

		}

		// pathologicals do not have an object code apart from the prefix
		// itself.
		if(matches[1] == "PATHOLOGICAL") {

			params["prefix"] = "PATHOLOGICAL";
			params["object"] = "";

		} else {

			// separate prefix from code proper.
			// FIXME: shouldn't simply assume this succeeds, I guess.
			var pieces = codeRegex.exec(matches[1]);

			params["prefix" ] = pieces[1];
			params["object" ] = pieces[2];

		}

		// other parameters go here.
		// (none yet)

		return params;
	}

	// location didn't match.
	return null;

}

// create and return a hyperlink
function makeLink(linkTarget, linkText) {

	// create a new "a" element
	var link = document.createElement("a");

	link.setAttribute("href", linkTarget);
	link.textContent = linkText;

	return link;

}

/****************************************
 * General GoL-related helper functions *
 ****************************************/

// return an empty universe of the desired size
function emptyUniverse(bx, by) {

	// there's no autovivification.
	var universe = new Array(bx);
	for (var i = 0; i < bx; i++) {
		universe[i] = new Array(by);
	}

	return universe;
}

// convert a rulestring to slashed uppercase notation, e.g. "B3/S23" instead
// of "b3s23" etc. Note that named rules (e.g. "tlife") are left alone, as are
// neighborhood conditions in non-totalistic rules in Hensel notation.
function ruleSlashedUpper(rule) {

	rule = rule.replace(new RegExp("b", "g"), "B");
	rule = rule.replace(new RegExp("s", "g"), "/S");

	// we may have introduced double slashes.
	rule = rule.replace(new RegExp("//", "g"), "/");

	return rule;

}

// debugging function: return a pattern object as a string, suitable for
// visual inspection (e.g. using console.log).
function patternToString(patternObject) {

	// string to return
	var strPattern = "";

	// read pattern line by line
	for(var i = 0; i <= patternObject["by"]; i++) {
		for(var j = 0; j <= patternObject["bx"]; j++) {

			// live cells are represented by an O, dead ones by a .
			if(patternObject["pattern"][j][i])
				strPattern += "O";
			else
				strPattern += ".";
		}

		// add a linebreak at the end of each pattern line
		strPattern += "\n";
	}

	return strPattern;
}

/************************************
 * apgcode-related helper functions *
 ************************************/

// decode w/x/y in an apgcode.
// FIXME: there's got to be a more elegant/idiomatic way of doing this.
function apgcodeDecodeWXY(code) {

	// replace y0 to y9 with 4 to 13 zeroes, respectively.
	for(var i = 0; i <= 9; i++) {
		code = code.replace(new RegExp("y" + i.toString(), "g"), "0".repeat(i + 4));
	}

	// replace ya to yz with 14 to 39 zeroes, respectively.
	// NOTE: 97=ord('a'); 122=ord('z').
	for(var i = 97; i <= 122; i++) {
		code = code.replace(new RegExp("y" + String.fromCharCode(i), "g"), "0".repeat(i - 83));
	}

	// finally, replace w and x with 2 and 3 zeroes, respectively.
	// NOTE: this needs to come last so yw and yx will be handled correctly.
	code = code.replace(new RegExp("w", "g"), "00");
	code = code.replace(new RegExp("x", "g"), "000");

	return code;

}

// Convert an object (represented by its apgcode) to a pattern.
function apgcodeToPattern(object, rule) {

	// create a 40x40 array to hold the pattern. Note that 40x40 is the 
	// maximum object size;  larger objects are classified as PATHOLOGICAL on
	// Catagolue.
	var pattern = emptyUniverse(40, 40);

	// decode w/x/y
	object = apgcodeDecodeWXY(object);

	// split object's apgcode into strips.
	var strips = object.split("z");

	// bounding box; this is computed en passant.
	var bx = 0;
	var by = 0;

	for(var i = 0; i < strips.length; i++) {

		// split strip into characters.
		var characters = strips[i].split("");

		for(var j = 0; j < characters.length; j++) {
			var charCode = characters[j].charCodeAt(0);

			// decode character. Letters a-v denote numbers 10-31.
			var number = 0;
			if((charCode >= 48) && (charCode <= 57)) {
				number = charCode - 48;
			} else if((charCode >= 97) && (charCode <= 118)) {
				number = charCode - 87;
			}

			// each character encodes five bits.
			for(var bit = 0; bit <= 4; bit++) {

				var x = j;
				var y = i * 5 + bit;

				// If a bit is set...
				if(number & (Math.pow(2, bit))) {

					// take note of bounding box.
					if(x > bx)
						bx = x;

					if(y > by)
						by = y;

					// and set the cell for this bit.
					pattern[x][y] = 1;
				}
			}
		}
	}

	var ret = new Object();

	ret["pattern"] = pattern;
	ret["bx"     ] = bx;
	ret["by"     ] = by;
	ret["rule"   ] = rule;

	return ret;
}

/********************************
 * RLE-related helper functions *
 ********************************/

// return an encoded RLE run.
function RLEAddRun(count, state) {

	var ret = "";

	if(count > 1)
		ret += count.toString();

	// dead cells are encoded as "b", live cells as "o".
	if(state == 1)
		ret += "o";
	else
		ret += "b";

	return ret;
}

// convert a pattern to an RLE string.
function patternToRLE(patternObject) {

	// extract values
	var pattern = patternObject["pattern"];
	var bx      = patternObject["bx"];
	var by      = patternObject["by"];
	var rule    = patternObject["rule"];

	// RLE pattern
	// the first line is a header.
	var RLE = "x = " + (bx + 1) + ", y = " + (by + 1) + ", rule = " + ruleSlashedUpper(rule) + "\n";

	// state of the ongoing run
	var currentState = "NONE";
	var runCount     = 0;

	var currentLine  = "";

	// read pattern linewise
	for(var i = 0; i <= by; i++) {
		for(var j = 0; j <= bx; j++) {

			// current cell we're looking at
			var cell = pattern[j][i];

			// did we change state?
			if(cell != currentState) {

				// if our line's getting too long, flush it.
				// FIXME: this may actually produce lines slightly longer 
				// than 70 chars. Not a problem in practice, but strictly
				// speaking a violation of the spec.
				if(currentLine.length >= 70) {
					RLE         += currentLine + "\n";
					currentLine  = "";
				}

				// if we have an ongoing run, wrap that up.
				if(currentState != "NONE")
					currentLine += RLEAddRun(runCount, currentState);

				// begin a new run
				currentState = cell;
				runCount     = 1;

			} else
				// continue ongoing run
				runCount++;

		}

		// wrap up current run.
		currentLine += RLEAddRun(runCount, currentState);

		// reset run.
		runCount     = 0;
		currentState = "NONE";

		// if this isn't the last line, begin a new one.
		if(i < by)
			currentLine += "$";
	}

	// wrap up RLE
	RLE += currentLine + "!\n";

	return RLE;

}

/***********************
 * Major functionality *
 ***********************/

// sort the sample soups on a Catagolue object page by symmetry.
function sortSampleSoups(params) {

	// regular expression to extract symmetries from sample soup links
	var symRegex   = /hashsoup\/(.*?)\/.*?\/(.*?)$/;
  
	// hash of arrays containing sample soup links, grouped by symmetry
	var soupLinks  = new Object();

	// total number of sample soups
	var totalSoups = 0;
  
	// paragraph holding the sample soups.
	var sampleSoupsParagraph = findSampleSoupsParagraph();
  
	// parse links on this page, and convert HTMLCollection to an array so it 
	// won't be "live" and change underneath us when we remove those links.
	var links = Array.prototype.slice.call(sampleSoupsParagraph.getElementsByTagName("a"));
	for(var i = 0; i < links.length; i++) {
	  
		var link	   = links[i];
		var linkTarget = link.getAttribute("href");
	  
		var matches	= symRegex.exec(linkTarget);
		if(matches) {

			// there's no autovivification, sigh.
			if(!soupLinks[matches[1]]) {
			  soupLinks[matches[1]] = [];
			}

			totalSoups++;
			soupLinks[matches[1]].push(link);
			link.remove();
		  
		}
	}

	// now that all the links are collected and removed, add a table.
	var table = document.createElement("table");
	table.setAttribute("style", "background-color: #a0ddcc; border: 2px solid; border-radius: 10px; width: 100%");

	// add table headers.
	var headerRow = document.createElement("tr");
	table.appendChild(headerRow);
  
	var header1 = document.createElement("th");
	header1.textContent = "Symmetry";
	headerRow.appendChild(header1);
  
	var header2 = document.createElement("th");
	header2.innerHTML = "#&nbsp;Soups";
	headerRow.appendChild(header2);
  
	var header3 = document.createElement("th");
	header3.textContent = "Sample soup links";
	headerRow.appendChild(header3);

	// insert table into page, replacing the old sample soup paragraph.
	sampleSoupsParagraph.parentNode.replaceChild(table, sampleSoupsParagraph);

	// iterate through symmetries and add new links.
	var symmetries = Object.keys(soupLinks).sort();
	for(var i = 0; i < symmetries.length; i++) {

		// add a hr between table rows, for the sake of looks.
		appendHR(table);

		// create a new row holding the soup links for this symmetry.
		var tableRow = document.createElement("tr");
		table.appendChild(tableRow);

		// create a table cell indicating the symmetry.
		var tableCell1 = document.createElement("td");
		tableRow.appendChild(tableCell1);

		// create a link to the main census page for this rulesym.
		var censusLink = document.createElement("a");
		censusLink.setAttribute("href", "/census/" + params["rule"] + "/" + symmetries[i]);
		censusLink.textContent = symmetries[i];
		tableCell1.appendChild(censusLink);

		// create a table cell indicating the number of sample soup.
		var tableCell2 = document.createElement("td");
		tableCell2.textContent = soupLinks[symmetries[i]].length;
		tableRow.appendChild(tableCell2);

		// create a table cell holding the sample soup links.
		var tableCell3 = document.createElement("td");
		for(var j = 0; j < soupLinks[symmetries[i]].length; j++) {
			tableCell3.appendChild(soupLinks[symmetries[i]][j]);
			tableCell3.appendChild(document.createTextNode(" "));
		}
		tableRow.appendChild(tableCell3);
	  
	}

	// add another hr before the "totals" row.
	appendHR(table);
 
	// now add a row indicating the total number of sample soups.
	var totalsRow = document.createElement("tr");
	table.appendChild(totalsRow);
  
	var totals1 = document.createElement("th");
	totals1.textContent = "Total";
	totalsRow.appendChild(totals1);
  
	var totals2 = document.createElement("th");
	totals2.innerHTML = totalSoups;
	totalsRow.appendChild(totals2);
  
}

// add a textarea with the object in RLE format.
function objectToRLE(params) {

	var prefix = params["prefix"];
	var object = params["object"];
	var rule   = params["rule"  ];

	// regex to test prefix
	var prefixRegex = /^x[pqs]/;

	// only run for known objects.
	if(object == null)
		return;

	// only run for spaceships (xq), oscillators (xp) and still lifes (xs).
	if(!prefixRegex.test(prefix))
		return;

	// convert object to pattern, and pattern to RLE.
	var pattern = apgcodeToPattern(object, rule);
	var RLE     = patternToRLE    (pattern);

	// find the "Comments" H2
	var commentsH2 = findCommentsH2();

	// create a new heading for the RLE code and insert it.
	var RLEHeading = document.createElement("h3");
	RLEHeading.textContent = "RLE";

	commentsH2.parentNode.insertBefore(RLEHeading,  commentsH2);

	// create a textarea for the RLE code and insert it.
	var RLETextArea = document.createElement("textarea");
	RLETextArea.setAttribute("style"    , "width: 100%"      );
	RLETextArea.setAttribute("rows"     , "10"               );
	RLETextArea.setAttribute("readonly" , "readonly"         );
	RLETextArea.textContent = RLE;

	commentsH2.parentNode.insertBefore(RLETextArea, commentsH2);

}

// add navigation
function addNavLinks(params) {

	var rule     = params["rule"];
	var prefix   = params["prefix"];
	var symmetry = params["symmetry"];

	// if symmetry is not set, default to C1.
	if(!symmetry)
		symmetry = "C1";

	// heading containing the object's code
	var titleHeading = findTitleHeading();

	// main content div
	var contentDiv = titleHeading.parentNode;

	// new paragraph for navigation links
	var navigationParagraph = document.createElement("p");

	// insert navigation paragraph before title heading
	contentDiv.insertBefore(navigationParagraph, titleHeading);

	// add breadcrumb links to navigation paragraph
	navigationParagraph.appendChild(document.createTextNode("You are here: "));
	navigationParagraph.appendChild(makeLink("/census/", "Census"));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule + "/", rule));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry + "/", symmetry));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry + "/" + prefix + "/", prefix));

}

// ### MAIN ###
MAIN();
