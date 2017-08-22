// ==UserScript==
// @name        Catagolue Reloaded
// @namespace   None
// @description Various useful tweaks to Catagolue object pages.
// @include     *://catagolue.appspot.com/object/*
// @version     3.8
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// separators used for breadcrumb navigation links and search links
var breadcrumbSeparator = " » "; // Alternatively: > or ›
var genericSeparator    = " • ";

// list of search providers to link to on object pages.
var searchProviders = new Object;

searchProviders["LifeWiki"]          = "http://conwaylife.com/w/index.php?title=Special%3ASearch&profile=all&fulltext=Search&search=";
searchProviders["ConwayLife forums"] = "http://conwaylife.com/forums/search.php?terms=all&author=&fid[]=3&fid[]=4&fid[]=5&fid[]=7&fid[]=11&fid[]=9&fid[]=2&fid[]=14&fid[]=12&sc=1&sf=all&sr=posts&sk=t&sd=d&st=0&ch=300&t=0&submit=Search&keywords=";
searchProviders["Google"  ]          = "https://encrypted.google.com/search?q=";

// width and height of the universe used for RLE conversion. User-configurable
// (options), with a default of 100x100.
// * NOTE 1: 40x40 is the maximum object size apgsearch will recognize; larger
// objects are classified as PATHOLOGICAL.
// * NOTE 2: however, user-supplied apgcodes CAN encode objects exceeding this.
// We therefore use 100x100 as a compromise. RLE for patterns exceeding this 
// will be truncated, but in practice this should be fairly rare.
// Example of a pattern that actually exceeds this:
// xp7_0g8k4raabaar4k8gzangbac4a1a4cabgnazcc0v0esxse0v0ccz0q6he19202
// 91eh6qz1pe1pld8q8dlp1ep1zcikbaey1eabkiczcq2t1d17f71d1t2qcz32ql5d0
// j0j0d5lq23zy239g93zy2okukozy2gpppgzy212n21zwggwcp0pcwggzck5qab0c0
// c0baq5kcz3lkb8b8efe8b8bkl3z3k2dlnwgwnld2k3z8p7o9ab151ba9o7p8z056o
// 78p404p87o65z3jgf073x370fgj3z5u0t5j25852j5t0u5zw122d55d55d221
var universeSize = 100;

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

		// FIXME: this must come after addNavLinks; it needs the searchParagraph that addNavLinks adds.
//		identifyJslifeObject(params); // disabled until data files are completed.

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
		refNode.parentNode.append(newNode);

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

	// create an array to hold the pattern.
	var pattern = emptyUniverse(universeSize, universeSize);

	// is this an oversized pattern?
	var oversized = false;

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

					if((x >= universeSize) || (y >= universeSize))
						oversized = true;
					else
						// set the cell for this bit.
						pattern[x][y] = 1;
				}
			}
		}
	}

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
	var pattern   = patternObject["pattern"];
	var bx        = patternObject["bx"];
	var by        = patternObject["by"];
	var rule      = patternObject["rule"];
	var oversized = patternObject["oversized"];

	// RLE pattern
	// the first line is a header.
	var RLE = "x = " + (bx + 1) + ", y = " + (by + 1) + ", rule = " + ruleSlashedUpper(rule) + "\n";

	// note truncated pattern, if necessary.
	if(oversized)
		RLE += "#C PATTERN EXCEEDS " + universeSize + "x" + universeSize + " BOUNDING BOX - TRUNCATED\n";

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

// sort the sample soups on a Catagolue object page by symmetry.
function handleSampleSoups(params) {

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

	// we want to have soup links pop up an overlay with a textarea. In order 
	// to do this, we set an onclick handler on the links below that calls a
	// function doing this. This function must live in the document, however,
	// so we inject it now.
	injectScript("sampleSoupOverlay.js");

	// furthermore, we need to inject Paul Johnston's MD5 script, since
	// Javascript lacks any built-in support for computing MD5 hashes.
	injectScript("md5.js");

	// finally, we need to insert Peter-Paul Koch's element dragging script,
	// so that the soup overlay can be dragged around the page with the mouse.
	injectScript("dragondrop.js");

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

	// iterate through symmetries and add new links.
	var symmetries = Object.keys(soupLinks).sort();
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
		tableRow.appendChild(tableCell1);

		// create a link to the main census page for this rulesym.
		var censusLink = document.createElement("a");
		censusLink.href        = "/census/" + params["rule"] + "/" + symmetry;
		censusLink.textContent = symmetry;
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
			link.setAttribute("onclick", 'return !overlaySoup("' + link.href + '", ' + (j + 1).toString() + ', ' + numSoups.toString() + ')');

			// put link in this table cell.
			tableCell3.appendChild(link);
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
	var imgLink = "https://catagolue.appspot.com/pic/" + apgcode + "/" + rule + "/pic.svg";

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

	var rule     = params["rule"];
	var prefix   = params["prefix"];
	var symmetry = params["symmetry"];
	var apgcode  = params["apgcode"];

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

}

// identify objects from Jason Summers' jslife20121230 object collection.
function identifyJslifeObject(params) {
	
	var prefix  = params["prefix"];
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

			// each line contains the code and description for one object.
			for(var i = 0; i < jslifeLines.length; i++) {
				
				// split line into apgcode and description. Note that it is
				// not possible to use the split method, as this does not stop
				// splitting but instead simply discards further elements.
				var spacePos      = jslifeLines[i].indexOf(" ");
				var jslifeApgcode = jslifeLines[i].substr(0, spacePos);
				var jslifeDesc    = jslifeLines[i].substr(spacePos + 1);

				// is this our current object?
				if(jslifeApgcode == apgcode) {

					// find info paragraph.
					var infoParagraph = document.getElementById("infoParagraph");

					// add note that this object is in jslife.
					infoParagraph.appendChild(document.createTextNode("This object appears in jslife-20121230: " + jslifeDesc));
					infoParagraph.appendChild(document.createElement("br"));

					// make sure info paragraph is visible.
					infoParagraph.style.display = "";

				}
			}

	    });

	// fire off request.
	jslifeRequest.open("GET", jslifeURL);
	jslifeRequest.send();

}

// ### MAIN ###
MAIN();
