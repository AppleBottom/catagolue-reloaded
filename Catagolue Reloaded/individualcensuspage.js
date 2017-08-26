// ==UserScript==
// @name        Catagolue individual census pages tweaks
// @namespace   None
// @description Tweaks for Catagolue's individual census pages
// @include     *://catagolue.appspot.com/census/*
// @version     1.0
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// separator used for breadcrumb navigation links
var breadcrumbSeparator = " » "; // Alternatively: > or ›

// MAIN function.
function MAIN() {

	// read page parameters
	var params = readParams();

	if(params != null) {

		// do our work.
		addNavLinks(params);
		adjustTitle(params);

	}
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

// read and return apgcode, rulestring etc.
function readParams() {

	// regular expression to extract apgcode and rulestring from page URL
	var locRegex  = /census\/(.*)/;

	// hash of extracted page parameters
	var params = new Object;

	// we may not be able to extract/determine some of these, so just set them
	// to null explicitely.
	params["symmetry"] = null;
	params["prefix"  ] = null;
	params["offset"  ] = null;

	// parameters extracted from URL go here.
	
	var matches = locRegex.exec(document.location);
	if(matches) {

		// the rulestring may or may not contain the symmetry as well.
		// Normally it won't, but if the user came from a page that our
		// symmetry injector script ran on, it will.
		if(matches[1].indexOf("/") == -1) {

			params["rule"    ] = matches[1];

		} else {

			var pieces = matches[1].split("/");

			params["rule"    ] = pieces[0];
			params["symmetry"] = pieces[1];

			if(pieces.length > 2) {
				var morePieces = pieces[2].split("?offset=");

				params["prefix"] = morePieces[0];

				if(morePieces.length > 1) {
					params["offset"] = parseInt(morePieces[1]);

					var infoText        = findTitleHeading().nextElementSibling.textContent;
					var infoTextMatches = /Displaying (\d+) to (\d+) of (\d+) objects/.exec(infoText);
					if(infoTextMatches) {
						params["minimumindex"] = parseInt(infoTextMatches[1]);
						params["maximumindex"] = parseInt(infoTextMatches[2]);
						params["totalobjects"] = parseInt(infoTextMatches[3]);
					}

				}

			}

		}
	
	} else
		// this shouldn't happen -- if the location doesn't match the above
		// regex, we shouldn't run in the first place.
		return null;

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

	// other parameters go here.

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

	return formattedrule;

}

/***********************
 * Major functionality *
 ***********************/

// add navigation, search links etc.
// FIXME: rename this, or break it up. Or both.
function addNavLinks(params) {

	var rule         = params["rule"        ];
	var symmetry     = params["symmetry"    ];
	var prefix       = params["prefix"      ];
	var offset       = params["offset"      ];
	var minimumIndex = params["minimumindex"];
	var maximumIndex = params["maximumindex"];

	// find heading containing the object's code and main content div.
	var titleHeading = findTitleHeading();
	var contentDiv   = titleHeading.parentNode;

	// create new paragraph for navigation.
	var navigationParagraph = document.createElement("p");

	// add IDs so we can find it later.
	navigationParagraph.id = "navigationParagraph";

	// insert navlink paragraph before title heading
	contentDiv.insertBefore(navigationParagraph, titleHeading);
	
	// add breadcrumb links to navigation paragraph
	navigationParagraph.appendChild(document.createTextNode("You are here: "));
	navigationParagraph.appendChild(makeLink("/census/", "Census"));
	navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
	navigationParagraph.appendChild(makeLink("/census/" + rule, rule));

	// symmetry may be null if we're on the rule's "pick-a-symmetry" overview page.
	if(symmetry) {
		navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
		navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry, symmetry));

		// prefix may likewise be null.
		if(prefix) {
			navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
			navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry + "/" + prefix, prefix));

			// And so may offset.
			if(offset) {
				navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
				navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry + "/" + prefix + "?offset=" + offset, minimumIndex.toString() + "-" + maximumIndex.toString()));
			}

		}

	}

}

function adjustTitle(params) {

	var rule     = params["rule"    ];
	var symmetry = params["symmetry"];
	var prefix   = params["prefix"  ];

	// find heading containing the object's code and main content div.
	var titleHeading = findTitleHeading();

	var titleAmendment = ": " + ruleSlashedUpper(params);

	// symmetry may be null if we're on the rule's "pick-a-symmetry" overview
	// page.
	if(symmetry)
		titleAmendment += "/" + symmetry;

	// Similarly, prefix may be null if we're on the rule's main census rather
	// than an object category page. Note that prefix should only be available
	// if symmetry is as well, but we'll make sure anyway.
	if(symmetry && prefix)
		titleAmendment += ": " + prefix;

	// adjust title heading
	titleHeading.appendChild(document.createTextNode(titleAmendment));

	// adjust document title. We could try splicing in the titleAmendment, but
	// it's easier to just create the whole thing anew.
	document.title = "Census" + titleAmendment + " - Catagolue";

}

// ### MAIN ###
MAIN();