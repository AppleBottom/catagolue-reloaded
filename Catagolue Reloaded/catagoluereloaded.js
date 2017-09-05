// ==UserScript==
// @name        Catagolue Reloaded
// @namespace   None
// @description Various useful tweaks to Catagolue object pages.
// @include     *://catagolue.appspot.com/object/*
// @version     4.2
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

// number of sample soups to group in a chunk.
var sampleSoupChunkSize = 5;

// list of search providers to link to on object pages.
var searchProviders = new Object;

searchProviders["LifeWiki"]          = "http://conwaylife.com/w/index.php?title=Special%3ASearch&profile=all&fulltext=Search&search=";
searchProviders["ConwayLife forums"] = "http://conwaylife.com/forums/search.php?terms=all&author=&fid[]=3&fid[]=4&fid[]=5&fid[]=7&fid[]=11&fid[]=9&fid[]=2&fid[]=14&fid[]=12&sc=1&sf=all&sr=posts&sk=t&sd=d&st=0&ch=300&t=0&submit=Search&keywords=";
searchProviders["Google"  ]          = "https://encrypted.google.com/search?q=";

var catagolueBaseUrl = "https://catagolue.appspot.com/";

// width and height of the universe used for RLE conversion. User-configurable
// (options), with a default of 100x100.
// * NOTE 1: 40x40 is the maximum object size apgsearch up to version 3.x 
// will recognize; larger objects are classified as PATHOLOGICAL. Version 4.x
// recognizes larger objects and encodes them using greedy apgcodes, subject
// to certain other, moderate constraints.
// * NOTE 2: Catagolue itself has always handled greedy apgcodes encoding 
// larger objects quite well. We therefore use 250x250 as a compromise. RLE 
// for patterns exceeding this will be truncated, but in practice this should
// be fairly rare. (Famous last words!)
var universeSize = localStorage.universeSize || 250;

// MAIN function.
function MAIN() {

	// read page parameters
	var params = readParams();

	if(params != null) {

		// do our work.
		addNavLinks         (params);
		handleSampleSoups   (params);
		objectToRLE         (params);
		addImgLink          (params);
		handleComments      (params);

		// FIXME: this must come after addNavLinks; it needs the 
		// searchParagraph that addNavLinks adds.
		identifyJslifeObject(params);

		// FIXME: this should come after identifyJslifeObject so the elements
		// will appear in the right order.
		addApgcodeSubheading(params);

	} else {

		// this shouldn't happen on pages where this script actually runs.
		console.log("Could not read page parameters.");

	}
}

/****************************
 * General helper functions *
 ****************************/

// upper-case the first character of a string.
function ucFirst(str) {
	// guard against empty strings; str[0] will throw an error for those.
	if (!str) return str;

	return str[0].toUpperCase() + str.slice(1);
}

// return canonical URL for an object.
function canonicalObjectUrl(params) {
	var url = catagolueBaseUrl + "object/" + params["apgcode"] + "/" + params["rule"];

	// symmetry may be null if it could not be parsed from the URL.
	if(params["symmetry"])
		url += "/" + params["symmetry"];

	return url;
}

/*********************************
 * HTML-related helper functions *
 *********************************/

// find the heading containing the object's code
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

	var hrRow  = document.createElement("tr");
	var hrCell = document.createElement("td");
	var hr     = document.createElement("hr");

	// HACK: hardcoded colspan=3.
	hrCell.colSpan             = "3";
	hrCell.style.paddingTop    = "0";
	hrCell.style.paddingBottom = "0"
	hr.    style.margin        = "0";


	node.  appendChild(hrRow);
	hrRow. appendChild(hrCell);
	hrCell.appendChild(hr);

}

// read and return apgcode, rulestring etc.
function readParams() {

	// regular expression to extract apgcode and rulestring from page URL
	var locRegex  = /object\/(.*?)\/(.*)/;

	// regular expression to extract query string from page URL
	var locRegex2 = /object\?(.*)/;

	// regular expression to extract prefix and encoded object from apgcode
	var codeRegex = /^(.*?)_(.*)$/;

	// hash of extracted page parameters
	var params = new Object;

	// we may not be able to extract/determine the symmetry or topology, so 
	// just set them to null explicitely.
	params["symmetry"] = null;
	params["topology"] = null;
	params["toposym" ] = null;

	// parameters extracted from URL go here.
	
	// Handle "regular" locations, e.g.
	// https://catagolue.appspot.com/object/xs4_33/b3s23/C1
	var matches = locRegex.exec(document.location);
	if(matches) {

		params["apgcode"] = matches[1];

		// the rulestring may or may not contain the symmetry as well.
		// Normally it won't, but if the user came from a page that our
		// symmetry injector script ran on, it will.
		if(matches[2].indexOf("/") == -1) {

			params["rule"    ] = matches[2];

		} else {

			var pieces = matches[2].split("/", 2);

			params["rule"    ] = pieces[0];

			// the symmetry might include an optional topology, separated
			// from the actual symmetry by a tilde; see the LifeWiki article
			// at http://conwaylife.com/wiki/Catagolue_naming_conventions and
			// http://conwaylife.com/forums/viewtopic.php?p=50407#p50407 for
			// details.
			if(pieces[1].indexOf("~") != -1) {
				morePieces = pieces[1].split("~", 2);

				params["topology"] = morePieces[0];
				params["symmetry"] = morePieces[1];

			} else
				params["symmetry"] = pieces[1];

			// either way, we save the unseparated topology~symmetry string as 
			// well, since it may come in handy later.
			params["toposym"] = pieces[1];

		}

	} else {

		// handle search-based locations, e.g.
		// http://catagolue.appspot.com/object?apgcode=xs10_69ar&rule=b3s2-i34q
		matches = locRegex2.exec(document.location);

		// if neither of these regexes matched, we give up.
		if(!matches)
			return null;

		// query parameters, e.g. "apgcode=xs10_69ar&rule=b3s2-i34q"
		var queryParameterString = matches[1];

		// split these into individual key/value pairs and look at each.
		var queryParameters = queryParameterString.split("&");
		for(var i = 0; i < queryParameters.length; i++) {

			// split this pair into key and value.
			var pieces = queryParameters[i].split("=", 2);

			if(pieces[0] == "apgcode")
				params["apgcode" ] = pieces[1];
			else if(pieces[0] == "rule")
				params["rule"    ] = pieces[1];
			else if(pieces[0] == "symmetry") {

				// again, the symmetry might include an optional topology, 
				// separated from the actual symmetry by a tilde; see the 
				// LifeWiki article at 
				// http://conwaylife.com/wiki/Catagolue_naming_conventions and
				// http://conwaylife.com/forums/viewtopic.php?p=50407#p50407 
				// for details.
				// FIXME: it probably isn't such a good idea to duplicate the
				// above code here; put it in a common subroutine or so.
				if(pieces[1].indexOf("~") != -1) {
					morePieces = pieces[1].split("~", 2);

					params["topology"] = morePieces[0];
					params["symmetry"] = morePieces[1];

				} else
					params["symmetry"] = pieces[1];

				// either way, we save the unseparated topology~symmetry 
				// string as well, since it may come in handy later.
				params["toposym"] = pieces[1];
			
			} else
				console.log("Unknown query parameter: " + queryParameters[i]);

		}
		
	}

	// at this point, we SHOULD have extract an apgcode at the very least. If
	// not, bail out.
	if(!params["apgcode"])
		return null;

	// pathologicals do not have an object code apart from the prefix
	// itself.
	if(params["apgcode"] == "PATHOLOGICAL") {

		params["prefix"] = "PATHOLOGICAL";
		params["object"] = "";

	} else {

		// separate prefix from code proper.
		// FIXME: shouldn't simply assume this succeeds, I guess.
		var pieces = codeRegex.exec(params["apgcode"]);

		params["prefix" ] = pieces[1];
		params["object" ] = pieces[2];

	}

	// we now classify the rule. For starters, we set all possible types to
	// false.
	params["largerthanlife" ] = false;
	params["generations"    ] = false;
	params["nontotalistic"  ] = false;
	params["outertotalistic"] = false;

	// by default, rules also have 2 states (dead and live).
	params["states"         ] = 2;

	if(params["rule"].substr(0, 1) == "r") {
		params["largerthanlife"] = true;

		// attempt to extract info on Larger than Life rules. If this doesn't
		// work, bail out.
		var matches = /^r(\d+)b(\d*)t(\d*)s(\d*)t(\d*)$/.exec(params["rule"]);

		if(matches) {
			params["range"] = matches[1];
			params["bmin" ] = matches[2];
			params["bmax" ] = matches[3];
			params["smin" ] = matches[4];
			params["smax" ] = matches[5];
		} else
			return null;

	} else if(params["rule"].substr(0, 1) == "g") {
		params["generations"] = true;

		// attempt to extract info on Generations rules. If this doesn't work,
		// bail out.
		var matches = /^g(\d+)b([^s]*)s(.*)$/.exec(params["rule"]);

		if(matches) {
			params["states"] = matches[1];
			params["b"     ] = matches[2];
			params["s"     ] = matches[3];
		} else
			return null;

	} else {

		// attempt to extract info on isotropic rules.
		var matches = /^b([^s]*)s(.*)$/.exec(params["rule"]);

		// note that this will have failed if we're dealing with one of the 
		// two grandfathered rulenames ("tlife" and "klife"). Since there's
		// only two, we simply special-case these.
		if(matches) {
			params["b"] = matches[1];
			params["s"] = matches[2];
		} else if(params["rule"] == "tlife") {
			params["b"] = "3";
			params["s"] = "2-i34q";
		} else if(params["rule"] == "klife") {
			params["b"] = "34n";
			params["s"] = "23";
		} else
			return null;
		
		if(!/^[0-8]*$/.test(params["b"]) || !/^[0-8]*$/.test(params["s"]))
			params["nontotalistic"  ] = true;
		else
			params["outertotalistic"] = true;

	}

	// We could try to extract information on bounded grids here when 
	// params["topology"] is set, but we don't have a need for the specific
	// details yet, and there's a fair few topologies supported by e.g. Golly;
	// see http://golly.sourceforge.net/Help/bounded.html for the specifics.

	// other parameters go here.

	// find title heading
	var titleHeading = findTitleHeading();

	// if this object has a name (other than its apgcode), remember that.
	if(titleHeading.textContent != params["apgcode"])
		params["name"] = titleHeading.textContent;
	else
		params["name"] = "";

	// return final collection of parameters.
	return params;

}

// create and return a hyperlink
function makeLink(linkTarget, linkText) {

	// create a new "a" element
	var link = document.createElement("a");

	link.href        = linkTarget;
	link.textContent = linkText;

	return link;

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

// debugging function: return a pattern object as a string, suitable for
// visual inspection (e.g. using console.log).
// FIXME: this isn't particularly useful for multistate rules right now.
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
	// FIXME: hardcoded ASCII values mean this would probably fail
	// on EBCDIC platforms... but somehow that doesn't seem like
	// a high-priority issue.
	for(var i = 97; i <= 122; i++) {
		code = code.replace(new RegExp("y" + String.fromCharCode(i), "g"), "0".repeat(i - 83));
	}

	// finally, replace w and x with 2 and 3 zeroes, respectively.
	// NOTE: this needs to come last so yw and yx will be handled correctly.
	code = code.replace(new RegExp("w", "g"), "00");
	code = code.replace(new RegExp("x", "g"), "000");

	return code;

}

// Convert an object (represented by its apgcode, sans prefix) to a pattern.
function apgcodeToPattern(params, object, rule) {

	// extract values
	var states = params["states"];

	// create an array to hold the pattern.
	var pattern = emptyUniverse(universeSize, universeSize);

	// is this an oversized pattern?
	var oversized = false;

	// bounding box; this is computed en passant.
	var bx = 0;
	var by = 0;

	// decode w/x/y
	object = apgcodeDecodeWXY(object);

	// split object's apgcode into layers.
	var layers = object.split("_");

	for(var currentLayer = 0; currentLayer < layers.length; currentLayer++) {

		// split layer into strips.
		var strips = layers[currentLayer].split("z");

		for(var currentStrip = 0; currentStrip < strips.length; currentStrip++) {

			// split strip into characters.
			var characters = strips[currentStrip].split("");

			for(var currentCharacter = 0; currentCharacter < characters.length; currentCharacter++) {
				var charCode = characters[currentCharacter].charCodeAt(0);

				// decode character. Letters a-v denote numbers 10-31.
				// FIXME: hardcoded ASCII values mean this would probably fail
				// on EBCDIC platforms... but somehow that doesn't seem like
				// a high-priority issue.
				var number = 0;
				if((charCode >= 48) && (charCode <= 57))
					number = charCode - 48;
				else if((charCode >= 97) && (charCode <= 118))
					number = charCode - 87;

				// each character encodes five bits.
				for(var bit = 0; bit <= 4; bit++) {

					var x = currentCharacter;
					var y = currentStrip * 5 + bit;

					// If a bit is set...
					if(number & (Math.pow(2, bit))) {

						// take note of bounding box.
						if(x > bx)
							bx = x;

						if(y > by)
							by = y;

						if((x >= universeSize) || (y >= universeSize))
							oversized = true;
						else
							// set (or adjust) the cell for this bit.
							// (Don't you wish Javascript had autovivification,
							// or (absent that) a sane grip on definedness and
							// undefined/null values?)
							if(typeof pattern[x][y] === "undefined")
								pattern[x][y]  = Math.pow(2, currentLayer);
							else
								pattern[x][y] += Math.pow(2, currentLayer);
					}
				}
			}
		}
	}

	// at this point, all cells are (basically) in the right state, but for 
	// Generations rules, the ordering of the states is jumbled: 0 is dead, 1 
	// is live, and 2,6,10,14,18,22,... are the remaining states, in REVERSE
	// "chronological" order. We therefore need to "adjust" these states.
	if(states > 2)
		for(var x = 0; x < Math.min(bx + 1, universeSize); x++)
			for(var y = 0; y < Math.min(by + 1, universeSize); y++)
				if(typeof pattern[x][y] !== "undefined")
					if(pattern[x][y] > 1)
						pattern[x][y] = states - (pattern[x][y] - 2) / 4 - 1;
					
	var ret = new Object();

	ret["pattern"  ] = pattern;
	ret["bx"       ] = bx;
	ret["by"       ] = by;
	ret["rule"     ] = rule;
	ret["oversized"] = oversized;

	return ret;
}

/********************************
 * RLE-related helper functions *
 ********************************/

// see http://golly.sourceforge.net/Help/formats.html#rle for more information
// on the RLE format used by e.g. Golly.

// return an encoded RLE run.
function RLEAddRun(count, state, states) {

	var ret = "";

	if(count > 1)
		ret += count.toString();

	if(states == 2)
		// in two-state rules, dead cells are encoded as "b", live cells as 
		// "o".
		ret += (state ? "o" : "b");

	else if(!state)
		// in multi-state rules, dead cells are encoded as "."...
		ret += ".";

	else {
		// ...and live cells are encoded as A,...,X,pA,...,pX,qA,...,qX,...,
		// yA,...yO. (Note that a maximum of 255 states are supported.)
		var stateSegment = Math.trunc(state / 24);
		var stateOffset  =            state % 24;

		// FIXME: hardcoded ASCII values mean this would probably fail
		// on EBCDIC platforms... but somehow that doesn't seem like
		// a high-priority issue.
		if(stateSegment)
			ret += String.fromCharCode(stateSegment + 111);

		ret += String.fromCharCode(stateOffset + 64);
	}

	return ret;
}

// convert a pattern to an RLE string.
function patternToRLE(params, patternObject) {
	
	// extract values
	var states    = params["states"];
	var name      = params["name"  ];

	// extract values
	var pattern   = patternObject["pattern"  ];
	var bx        = patternObject["bx"       ];
	var by        = patternObject["by"       ];
	var oversized = patternObject["oversized"];

	// RLE pattern
	var RLE = "";

	// add pattern name, if known.
	if(name)
		RLE += "#N " + ucFirst(name) + "\n";

	// add object page URL.
	RLE += "#C " + canonicalObjectUrl(params) + "\n";

	// note truncated pattern, if necessary.
	if(oversized)
		RLE += "#C PATTERN EXCEEDS " + universeSize + "x" + universeSize + " BOUNDING BOX - TRUNCATED\n";

	// RLE header
	RLE += "x = " + (bx + 1) + ", y = " + (by + 1) + ", rule = " + ruleSlashedUpper(params) + "\n";

	// if necessary, adjust bx and by for the purpose of encoding the pattern.
	// This keeps us from accessing pattern cells that don't actually exist
	// in the loop further down.
	// NOTE: bx and by are the maximum array indices seen; since the 
	// pattern[][] array is zero-indexed, these need to be set to one LESS
	// than universeSize.
	if(bx >= universeSize)
		bx = universeSize - 1;

	if(by >= universeSize)
		by = universeSize - 1;

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
					currentLine += RLEAddRun(runCount, currentState, states);

				// begin a new run
				currentState = cell;
				runCount     = 1;

			} else
				// continue ongoing run
				runCount++;

		}

		// wrap up current run, unless it's dead cells.
		if(currentState)
			currentLine += RLEAddRun(runCount, currentState, states);

		// reset run.
		runCount     = 0;
		currentState = "NONE";

		// if this isn't the last line, begin a new one.
		if(i < by)
			currentLine += "$";
	}

	// wrap up RLE
	RLE += currentLine + "!\n";

	// tighten up runs of consecutive pattern linebreaks (i.e. $ characters)
	RLE = RLE.replace(/(\${3,})/g, function(match, p1, offset, string) {
			return (p1.length.toString() + "$");
		});

	return RLE;

}

/***********************
 * Major functionality *
 ***********************/

// sort the sample soups on a Catagolue object page by symmetry.
function handleSampleSoups(params) {

	var apgcode = params["apgcode"];
	var name    = params["name"   ];

	// regular expression to extract symmetries from sample soup links
	var symRegex   = /hashsoup\/(.*?)\/.*?\/(.*?)$/;

	// hash of arrays containing sample soup links, grouped by symmetry
	var soupLinks  = new Object();

	// total number of sample soups
	var totalSoups = 0;
  
	// paragraph holding the sample soups.
	var sampleSoupsParagraph = findSampleSoupsParagraph();

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
	table.id                    = "sampleSoupTable";
	table.style.backgroundColor = "#a0ddcc";
	table.style.border          = "2px solid";
	table.style.borderRadius    = "10px";
	table.style.width           = "100%";

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

	// Compute list of symmetries and sort it, disregarding prefixes.
	// Don't you wish Javascript had a) better syntax for .map and .sort, to
	// facilitate Schwartzian transforms, and b) a cmp operator? In Perl, this
	// would be something like along the lines of the following:
    // my $symmetries = map  { $_->[0] } 
	//                  sort { $b->[1] cmp $a->[1] or $b->[0] cmp $a->[0] } 
	//                  map  { [ m/^(i*(.*))$/ ] } 
	//                  keys %soupLinks;
	// which is much more concise.
	var symmetries = Object.keys(soupLinks)
		.map(function(element) {
			var elementWithoutPrefixes = element.replace(/^i*/, "");

			return [ element, elementWithoutPrefixes ];
		})
		.sort(function (a, b) {
			if(a[1] > b[1])
				return 1;
			else if(a[1] < b[1])
				return -1;
			else
				if(a[0] > b[0])
					return 1;
				else if(a[0] < b[0])
					return -1;
				else
					return 0;
		})
		.map(function(element) {
			return element[0];
		});

	// iterate through symmetries and add new links.
	for(var i = 0; i < symmetries.length; i++) {

		var symmetry = symmetries[i];
		var numSoups = soupLinks[symmetry].length;

		// add a hr between table rows, for the sake of looks.
		appendHR(table);

		// create a new row holding the soup links for this symmetry.
		var tableRow = document.createElement("tr");
		table.appendChild(tableRow);

		// create a table cell indicating the symmetry.
		var tableCell1 = document.createElement("td");

		// if we don't specify this, then setting word-break: break-all on
		// the link further down will cause the cell to shrink too much. 200
		// px is about the largest amount of space that "reasonable" (test)
		// symmetries require, but the exact number could be changed in the 
		// future, if necessary.
		// FIXME: find a better solution for word-breaking long symmetry names
		// that require this kind of kludge.
		tableCell1.style.minWidth = "200px";

		tableRow.appendChild(tableCell1);

		// create a link to the main census page for this rulesym.
		var censusLink = document.createElement("a");
		censusLink.href        = "/census/" + params["rule"] + "/" + symmetry;
		censusLink.textContent = symmetry;

		// keep long symmetry names from breaking our layout. See e.g. the
		// "marquee" symmetry (since deleted, but its sample soups remain)
		// on https://catagolue.appspot.com/object/xq4_27deee6/b3s23/ .
		censusLink.style.wordBreak = "break-all";

		tableCell1.appendChild(censusLink);

		// create a table cell indicating the number of sample soup.
		var tableCell2 = document.createElement("td");
		tableCell2.textContent = numSoups;
		tableRow.appendChild(tableCell2);

		// create a table cell holding the sample soup links.
		var tableCell3 = document.createElement("td");
		for(var j = 0; j < numSoups; j++) {

			var link = soupLinks[symmetry][j];

			// modify link so that when the user's browsing with Javascript
			// enabled, clicking it pops up an overlay with the sample soup
			// in a textarea.
			// NOTE: returning false here keeps the link's href from being
			// loaded after the function has run. Note further that returning
			// false FROM the function does not work.
			link.setAttribute("onclick", 'return !overlaySoup("' + link.href + '", ' + (j + 1).toString() + ', ' + numSoups.toString() + ', "' + apgcode + '", "' + name + '")');

			// also set a title on this link.
			link.setAttribute("title", symmetry + ": soup " + (j + 1).toString() + " of " + numSoups.toString());

			// put link in this table cell.
			tableCell3.appendChild(link);
			tableCell3.appendChild(document.createTextNode("\u00a0")); // U+00A0 NO-BREAK SPACE (=&nbsp;)

			// in order to group sample soup links into chunks, we insert some
			// extra space after each chunk. Note that U+2003 EM SPACE is non-
			// breaking, so the regular space following it is necessary to get
			// proper line-wrapping.
			if(!((j + 1) % sampleSoupChunkSize)) {
				tableCell3.appendChild(document.createTextNode("\u2003 ")); // U+2003 EM SPACE (=&emsp;)
			}

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
	var pattern = apgcodeToPattern(params, object, rule);
	var RLE     = patternToRLE    (params, pattern);

	// find the "Comments" H2
	var commentsH2 = findCommentsH2();

	// create a new heading for the RLE code.
	var RLEHeading = document.createElement("h3");
	RLEHeading.textContent = "RLE";

	// create "select all" link for RLE code.
	var RLESelectAll     = document.createElement("p");
	var RLESelectAllLink = document.createElement("a");

	RLESelectAll.style.marginTop    = 0;
	RLESelectAll.style.marginBottom = "0.5em";
	RLESelectAll.style.fontFamily   = "monospace";

	RLESelectAllLink.href        = "#";
	RLESelectAllLink.textContent = "Select All";
	RLESelectAllLink.setAttribute("onclick", 'document.getElementById("RLETextArea").select(); return false');

	RLESelectAll.appendChild(RLESelectAllLink);

	// create a textarea for the RLE code.
	var RLETextArea = document.createElement("textarea");
	RLETextArea.id          = "RLETextArea";
	RLETextArea.style.width = "100%";
	RLETextArea.rows        = "10";
	RLETextArea.readOnly    = true;
	RLETextArea.textContent = RLE;

	// insert the new nodes.
	commentsH2.parentNode.insertBefore(RLEHeading,   commentsH2);
	commentsH2.parentNode.insertBefore(RLESelectAll, commentsH2);
	commentsH2.parentNode.insertBefore(RLETextArea,  commentsH2);

}

// add a link to the SVG image of an object.
function addImgLink(params) {

	var apgcode = params["apgcode"];
	var rule    = params["rule"  ];

	// construct link to SVG image for this object
	var imgLink = catagolueBaseUrl + "pic/" + apgcode + "/" + rule + "/pic.svg";

	// find the "Comments" H2
	var commentsH2 = findCommentsH2();

	// create a new heading for the image link.
	var imgLinkHeading = document.createElement("h3");
	imgLinkHeading.textContent = "SVG link";

	// create "select all" link for image link.
	var imgLinkSelectAll     = document.createElement("p");
	var imgLinkSelectAllLink = document.createElement("a");

	imgLinkSelectAll.style.marginTop    = 0;
	imgLinkSelectAll.style.marginBottom = "0.5em";
	imgLinkSelectAll.style.fontFamily   = "monospace";

	imgLinkSelectAllLink.href        = "#";
	imgLinkSelectAllLink.textContent = "Select All";
	imgLinkSelectAllLink.setAttribute("onclick", 'document.getElementById("imgLinkTextArea").select(); return false');

	imgLinkSelectAll.appendChild(imgLinkSelectAllLink);

	// create link to open image
	imgLinkOpenImageLink = document.createElement("a");

	imgLinkOpenImageLink.href        = imgLink;
	imgLinkOpenImageLink.target      = "_blank";
	imgLinkOpenImageLink.textContent = "View";

	imgLinkSelectAll.appendChild(document.createTextNode(genericSeparator));
	imgLinkSelectAll.appendChild(imgLinkOpenImageLink);

	// create a textarea for the image link.
	var imgLinkTextArea = document.createElement("textarea");

	// set textarea attributes.
	imgLinkTextArea.id          = "imgLinkTextArea";
	imgLinkTextArea.style.width = "100%";
	imgLinkTextArea.rows        = "1";
	imgLinkTextArea.readOnly    = true;
	imgLinkTextArea.textContent = imgLink;

	// insert the new nodes.
	commentsH2.parentNode.insertBefore(imgLinkHeading,   commentsH2);
	commentsH2.parentNode.insertBefore(imgLinkSelectAll, commentsH2);
	commentsH2.parentNode.insertBefore(imgLinkTextArea,  commentsH2);

}

// add navigation, search links etc.
// FIXME: rename this, or break it up. Or both.
function addNavLinks(params) {

	var rule     = params["rule"    ];
	var prefix   = params["prefix"  ];
	var symmetry = params["symmetry"];
	var topology = params["topology"];
	var toposym  = params["toposym" ];
	var apgcode  = params["apgcode" ];
	var name     = params["name"    ];

	// if symmetry is not set, default to C1.
	if(!symmetry)
		symmetry = "C1";

	// find heading containing the object's code and main content div.
	var titleHeading = findTitleHeading();
	var contentDiv   = titleHeading.parentNode;

	// also modify title heading to wrap particularly long codes such as
	// xp84_ybiu0okk6k46o8bp4ozyb47o3egf86lklabqjsjqa4ogkczyc11x113wmlggxgglm
	// zw3iajaqjk46y76s1u2o14441o2u1s6y864kjqajai3zwiv0er8q6he8y08oggy01cjkma
	// 6amkjc1y1ggo8y08eh6q8re0viz0c4gf8ck3sj426gu1622q5kq2sgw12721xgs2qk5q22
	// 61ug624js3kc8fg4czy019ld2odw58v2xv08q2qfx4224xfq2q80vx2v85wdo2dl91zy51
	// 23ap69q32qa51221wgoo8y21221lq22rk1uh23032zy0g8g2ug624js1622q5kq2sgy6gs
	// 2qk5q2262sj426is0g8gzg08kkld2odw58v2xv08q2qfx1221xfq2q80vx2v85wdo2dlkk
	// 80gz19o7gphu1ehi3034jqaa512210g88ci7ic88g12215aaqj4303ihe1uhpg7o91z02f
	// gbmoab43y9o4p6p32323p6p4oy834baombgf2z06226226113y8314ba8c111c8ab413y7
	// 3116226226zyjg88r5go8o8oglb886kk8g0s4zyj11w12261u2uilp53878bu0v9zyt146
	// w311311w32
	titleHeading.style.overflowWrap = "break-word"; // or .style.wordBreak = "break-all"; ?

	// create new paragraphs for navigation and search links.
	var navigationParagraph = document.createElement("p");
	var searchParagraph     = document.createElement("p");

	// add IDs so we can find these later.
	navigationParagraph.id = "navigationParagraph";
	searchParagraph.id     = "searchParagraph";

	// insert navlink paragraph before title heading
	contentDiv.insertBefore(navigationParagraph, titleHeading);
	
	// insert search paragraph after title heading. (Why is there no 
	// Node.insertAfter in Javascript?)
	insertAfter(searchParagraph, titleHeading);

	// add breadcrumb links to navigation paragraph
	navigationParagraph.appendChild(document.createTextNode("You are here: "));
	navigationParagraph.appendChild(makeLink("/census/", "Census"));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule, rule));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));

	// there may or may not have been a topology.
	// NOTE 1: there aren't any topology overview pages (yet?).
	// NOTE 2: putting the topology before the symmetry is an arbitrary choice,
	// they really are on equal footing.
	if(topology) {
//		navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + topology, topology));
		navigationParagraph.appendChild(document.createTextNode(topology));
		navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
		navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + toposym, symmetry));
	} else
		navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry, symmetry));

	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry + "/" + prefix, prefix));

	// add search links to search paragraph
	searchParagraph.appendChild(document.createTextNode("Search by apgcode: "));
	for (var searchProvider in searchProviders) {
		searchParagraph.appendChild(makeLink(searchProviders[searchProvider] + apgcode, searchProvider));
		searchParagraph.appendChild(document.createTextNode(genericSeparator));
	}

	// we added an extra separator after the last search link; remove that.
	searchParagraph.removeChild(searchParagraph.lastChild);

	// if object name is known, allow searching by name.
	if(name) {
		searchParagraph.appendChild(document.createElement("br"));
		searchParagraph.appendChild(document.createTextNode("Search by name: "));

		for (var searchProvider in searchProviders) {
			searchParagraph.appendChild(makeLink(searchProviders[searchProvider] + name, searchProvider));
			searchParagraph.appendChild(document.createTextNode(genericSeparator));
		}

		// we added an extra separator after the last search link; remove that.
		searchParagraph.removeChild(searchParagraph.lastChild);
	}


}

function handleComments(params) {

	// regex to extract metadata for all comments.
	var commentsHeaderRegex = /^Displaying\scomments\s+(\d+)\s+to\s+(\d+).$/;

	// regex to extract metadata for a single comment.
	var commentHeaderRegex = /^On\s+(\d{4}-\d{2}-\d{2})\s+at\s+(\d{2}:\d{2}:\d{2})\s+UTC,\s+(< >)?(.*?)(<\/b>)?\s+wrote:$/;

	// the page's main content div.
	var contentDiv  = document.getElementById("content");

	// collection of comments (i.e. "comtent" divs).
	var commentDivs = new Array();

	// comments header, i.e. the paragraph containing e.g. "Displaying 
	// comments 1 to 1."
	var commentsHeader;

	// comments are not identified other than by all sharing the id "comment",
	// and by being children of contentDiv. This means easy methods of
	// extracting them from the page are out; we have to bite the bullet and
	// hunt for them. Note that each comment div contains a single inner
	// div with the id "comtent", which is what we're interested in.
	for(var commentCandidate = contentDiv.firstElementChild; commentCandidate; commentCandidate = commentCandidate.nextElementSibling) {

		// also look for the comments header on the side.
		// (Side note: why does nodeName contain upper-case names? This isn't
		// HTML 3.2.)
		if(commentCandidate.nodeName == "P")
			if(commentsHeaderRegex.test(commentCandidate.innerHTML))
				commentsHeader = commentCandidate;

		// verify if node has the right id.
		if(commentCandidate.getAttribute("id") == "comment")

			// iterate through all of this comment's children to find the
			// "comtent".
			for(var comtentCandidate = commentCandidate.firstElementChild; comtentCandidate; comtentCandidate = comtentCandidate.nextElementSibling) {

				// again, we need to make sure that node has the right id.
				if(comtentCandidate.getAttribute("id") == "comtent")
					commentDivs.push(comtentCandidate);

			}

	}

	// return early if there's no comments on the page.
	if(!commentDivs.length)
		return;

	// inject comment handler script; this takes care of actually expanding/
	// collapsing comments.
	injectScript("comments.js");

	// iterate through all comments.
	for(var i = 0; i < commentDivs.length; i++) {

		// extract relevant elements
		var commentDiv    = commentDivs[i];
		var commentHeader = commentDiv.firstElementChild;

		// the comment body may consist of several successive HTML elements.
		// we therefore introduce a new intermediate div containing them, for
		// the sake of easily being able to act on all of them at once.
		// NOTE: for an example of this, see e.g. the first (oldest) comment on
		// xp16_y57ey9e7zgggy58ogy1go8y5gggz0111y0cogx11x11xgocy0111zy6h
		// y9hz0gggy0631xggxggx136y0gggz111y5231y1132y5111zy5sey9es (Achim's
		// other p16).
		var commentBody   = document.createElement("div");

		// array to hold all the elements making up the comment body
		var commentElements = new Array();

		// we first collect all the element into an array.
		for(var commentElement = commentHeader.nextSibling; commentElement; commentElement = commentElement.nextSibling) {
			commentElements.push(commentElement);
		}
		// only after we're done collecting the elements do we move them and
		// append them as children to the new comment body div.
		// NOTE: the reason this isn't done in ONE loop, without using the
		// array at all, is that these are live elements. If we didn't jump
		// through this extra hoop, then after appending the first comment
		// element to the new comment body div, its nextSibling property would
		// be undefined, as in its new position it did indeed not have any
		// sibling elements. For this reason, we cannot move ANY of the
		// elements until we have found ALL of them.
		for(var j = 0; j < commentElements.length; j++) {
			commentBody.appendChild(commentElements[j]);
		}

		// insert the new comment body div after the comment header.
		insertAfter(commentBody, commentHeader);

		// attempt to match comment regex
		var matches = commentHeaderRegex.exec(commentHeader.innerHTML);
		if(matches) {

			// extract information from matches
			var commentDate = matches[1];
			var commentTime = matches[2];
			var commentAnon = (typeof matches[3] === "undefined");
			var commentName = matches[4];

			// comment name with spaces removed. Note all non-space characters
			// are allowed as part of class names as per the HTML5 spec:
			// https://www.w3.org/TR/html5/infrastructure.html#set-of-space-separated-tokens
			var commentNameClass = commentName.replace(/\s/g, "");

			// add classes to elements according to comment number and author.
			addClass(commentDiv,    "comment        comment-"        + i + " comment-author-"        + commentNameClass);
			addClass(commentHeader, "comment-header comment-header-" + i + " comment-header-author-" + commentNameClass);
			addClass(commentBody,   "comment-body   comment-body-"   + i + " comment-body-author-"   + commentNameClass);

			// create a clickable expander/collapser
			var commentExpander = document.createElement("span");

			// add style and attributes
			commentExpander.style.fontFamily = "monospace";
			commentExpander.style.cursor     = "pointer";
			commentExpander.appendChild(document.createTextNode(commentExpandedSymbol));
			commentExpander.setAttribute("class",   "comment-expander comment-expander-" + i);
			commentExpander.setAttribute("onclick", "return !expandOrCollapse(" + i + ")");

			// insert expander
			commentHeader.insertBefore(commentExpander, commentHeader.firstChild);

		}
		
	}

	// create infrastructure to collapse/expand ALL comments
	var collapseAndExpandLinks = document.createElement("span");
	var collapseAllLink        = document.createElement("a");
	var expandAllLink          = document.createElement("a");

	// style and set attributes on these
	collapseAndExpandLinks.style.fontFamily = "monospace";

	collapseAllLink.href        = "#";
	collapseAllLink.textContent = "Collapse all";
	collapseAllLink.setAttribute("onclick", "expandOrCollapseAll(true); return false");

	expandAllLink.href        = "#";
	expandAllLink.textContent = "Expand all";
	expandAllLink.setAttribute("onclick", 'expandOrCollapseAll(false); return false');

	// assemble elements
	collapseAndExpandLinks.appendChild(document.createTextNode(" ("));
	collapseAndExpandLinks.appendChild(collapseAllLink);
	collapseAndExpandLinks.appendChild(document.createTextNode(genericSeparator));
	collapseAndExpandLinks.appendChild(expandAllLink);
	collapseAndExpandLinks.appendChild(document.createTextNode(")"));

	// if we didn't actually find the comments header earlier, we don't
	// insert the link, but this shouldn't happen unless the page structure
	// as returned by the server changes.
	if(commentsHeader)
		commentsHeader.appendChild(collapseAndExpandLinks);

}

// identify objects from Jason Summers' jslife20121230 object collection.
function identifyJslifeObject(params) {
	
	var prefix  = params["prefix" ];
	var apgcode = params["apgcode"];

	// create info paragraph
	var infoParagraph   = document.createElement("p");

	// find search paragraph
	var searchParagraph = document.getElementById("searchParagraph");

	// insert info paragraph after search links
	insertAfter(infoParagraph, searchParagraph);

	// hide info paragraph by default, and assign it an id so it can be found
	infoParagraph.style.display = "none";
	infoParagraph.id            = "infoParagraph";

	// FIXME: is there a better way to read an extension-local data file than
	// using XMLHttpRequest? Xan's answer to a Stackoverflow question at 
	// https://stackoverflow.com/a/28858129 does not work; Opera 39 complains
	// saying "Uncaught TypeError: chrome.runtime.getPackageDirectoryEntry is
	// not a function", even though 
	// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/getPackageDirectoryEntry
	// indicates it should work.

	// convert extension-local path to URL. Each prefix has its own data file.
	// NOTE: the file must be listed in web_accessible_resources in 
	// manifest.json to be accessible this way.
	jslifeURL = chrome.extension.getURL("data/" + prefix + ".txt");

	// asynchronous request to retrieve the soup. If the file does not exist,
	// the request will fail silently and harmlessly.
	var jslifeRequest = new XMLHttpRequest();

	// once the soup is loaded, put it into the textarea.
	jslifeRequest.addEventListener("load", function() {

			// separate response text into lines and filter out empty lines
			// etc.
			var jslifeLines = jslifeRequest.responseText
				.replace(/(\r\n)|\r|\n/g, '\n')
				.split(/\n+/g)
				.filter(function(element, index, array) {

					if(!element || element.charAt(0) == "#")
						// filter out empty lines and comments
						return false;

					else if(element.substring(0, 3) == "n/a")
						// filter out unencodable objects
						return false

					else
						return true;
				});

			// descriptions collected for this object from jslife
			var jslifeDescs = new Array();

			// each line contains the code and description for one object.
			for(var i = 0; i < jslifeLines.length; i++) {
				
				// split line into apgcode and description. Note that it is
				// not possible to use the split method, as this does not stop
				// splitting but instead simply discards further elements.
				var spacePos      = jslifeLines[i].indexOf(" ");
				var jslifeApgcode = jslifeLines[i].substr(0, spacePos);
				var jslifeDesc    = jslifeLines[i].substr(spacePos + 1);

				// is this our current object?
				if(jslifeApgcode == apgcode)
					jslifeDescs.push(jslifeDesc);

			}

			// did we find anything at all?
			if(jslifeDescs.length) {
				
				// find info paragraph.
				var infoParagraph = document.getElementById("infoParagraph");

				// if there is more than one description, we create a list;
				// otherwise it's just a simple piece of text.
				if(jslifeDescs.length > 1) {
				
					// create a list of descriptions.
					var listOfDescriptions = infoParagraph.appendChild(document.createElement("ul"));

					// add note that this object is in jslife, and add the list.
					infoParagraph.appendChild(document.createTextNode("This object appears in:"));
					infoParagraph.appendChild(listOfDescriptions);

					for(var i = 0; i < jslifeDescs.length; i++) {

						// create a list item for this description
						var listItem = document.createElement("li");

						// fill in description
						listItem.textContent = jslifeDescs[i];

						// append list item to list
						listOfDescriptions.appendChild(listItem);
						
					}
				
				} else {

					// There's only one description to add.
					infoParagraph.appendChild(document.createTextNode("This object appears in: " + jslifeDescs[0]));

				}

				// make sure info paragraph is visible.
				infoParagraph.style.display = "";
			
			}

	    });

	// fire off request.
	jslifeRequest.open("GET", jslifeURL);
	jslifeRequest.send();

}

function addApgcodeSubheading(params) {

	var apgcode = params["apgcode"];
	var name    = params["name"   ];

	// find title heading.
	var titleHeading = findTitleHeading();

	// if this object has a name, its apgcode isn't shown by default, so we 
	// add it as sub-heading.
	if(name) {

		var apgcodeSpan = document.createElement("span");

		apgcodeSpan.textContent    = apgcode;
		apgcodeSpan.style.fontSize = "small";

		titleHeading.appendChild(document.createElement("br"));
		titleHeading.appendChild(apgcodeSpan);

	}

}

// ### MAIN ###
MAIN();
