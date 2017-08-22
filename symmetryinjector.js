// ==UserScript==
// @name        Catagolue Census Page updates
// @namespace   None
// @description Add symmetry to links to Catagolue object pages to support breadcrumbs navigation.
// @include     *://catagolue.appspot.com/census/*
// @version     1.0
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// MAIN function.
function MAIN() {

	// read page parameters
	var params = readParams();

	if(params != null) {

		// do our work.
		fixObjectLinks(params);

	}
}

/*********************************
 * HTML-related helper functions *
 *********************************/

// read and return apgcode, rulestring etc.
function readParams() {

	// regular expression to extract rule, symmetry and prefix from URL
	var locRegex = /census\/(.*?)\/(.*?)\/(.*?)/;

	var matches = locRegex.exec(document.location);
	if(matches) {

		// FIXME: there should probably be some sanity checking here, just
		// in case Catagolue's URL scheme changes in the future.

		var params = new Object;

		// parameters extracted from URL
		params["rule"]     = matches[1];
		params["symmetry"] = matches[2];
		params["prefix"]   = matches[3];

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

// add symmetry to object links.
function fixObjectLinks(params) {

	var rule     = params["rule"];
	var symmetry = params["symmetry"];

	// regular expression to extract symmetries from sample soup links
	var objectPageRegex = new RegExp("object/.*?/" + rule + "$");
  
	// parse links on this page
	// , and convert HTMLCollection to an array so it 
	// won't be "live" and change underneath us when we remove those links.
//	var links = Array.prototype.slice.call(document.getElementsByTagName("a"));
	var links = document.getElementsByTagName("a");
	for(var i = 0; i < links.length; i++) {
	  
		var link	   = links[i];
		var linkTarget = link.getAttribute("href");
	  
		var matches	= objectPageRegex.exec(linkTarget);
		if(matches) {

			link.setAttribute("href", linkTarget + "/" + symmetry);
			link.style.wordBreak = "break-all";
		  
		}
	}

}

// ### MAIN ###
MAIN();
