// ==UserScript==
// @name        Catagolue individual census pages tweaks
// @namespace   None
// @description Tweaks for Catagolue's individual census pages
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
		addNavLinks           (params);
		commifyNumbers        (params);
		adjustTitle           (params);
		adjustIntroParagraph  (params);
//		markOfficialSymmetries(params);

	}
}

/*********************************
 * HTML-related helper functions *
 *********************************/

// read and return apgcode, rulestring etc.
function readParams() {

	// regular expression to extract apgcode and rulestring from page URL
	var locRegex  = /census\/(.*)/;

	// hash of extracted page parameters
	var params = new Object;

	// we may not be able to extract/determine some (or all) of these, so 
	// just set them to null explicitely.
	params["topology"] = null;
	params["symmetry"] = null;
	params["toposym" ] = null;
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

	if(params["topology"]) {

		// attempt to extract information on topology. So far, we only know
		// how to handle toroidal universes, e.g. T256x256~D2_+1.
		var matches = /^[Tt](\d+)x(\d+)$/.exec(params["topology"]);

		if(matches) {
			params["topology_shape"] = "T";
			params["topology_bx"   ] = matches[1];
			params["topology_by"   ] = matches[2];
		}
	}

	// other parameters go here.

	// return final collection of parameters.
	return params;

}

/***********************
 * Major functionality *
 ***********************/

// add navigation, search links etc.
// FIXME: rename this, or break it up. Or both.
function addNavLinks(params) {

	var rule         = params["rule"        ];
	var topology     = params["topology"    ];
	var symmetry     = params["symmetry"    ];
	var toposym      = params["toposym"     ];
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

	var ruleLink = makeLink("/census/" + rule, rule);

	// make sure layout doesn't break for rules such as 
	// B2ekin3cekanyqjr4cekainyqjrtwz5cekainyqjr6cekain7ce8/
	// S01ce2cekain3cekainyqjr4cekainyqjrtwz5cekainyqjr6cekain7ce8.
	ruleLink.style.wordBreak = "break-all"; // overflowWrap = "break-word";
	navigationParagraph.appendChild(ruleLink);

	// symmetry may be null if we're on the rule's "pick-a-symmetry" overview page.
	if(symmetry) {

		navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));

		// if there was a symmetry, there might also have been a topology, but
		// this isn't guaranteed.
		// NOTE 1: there aren't any topology overview pages (yet?).
		// NOTE 2: putting the topology before the symmetry is an arbitrary
		// choice, they really are on equal footing.
		if(topology) {
//			navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + topology, topology));
			navigationParagraph.appendChild(document.createTextNode(topology));
			navigationParagraph.appendChild(document.createTextNode(breadcrumbSeparator));
			navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + toposym, symmetry));
		} else
			navigationParagraph.appendChild(makeLink("/census/" + rule + "/" + symmetry, symmetry));

		// prefix may be null, just like symmetry.
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

function commifyNumbers(params) {

	// if we have a prefix, we're looking at an overview page, e.g. "b3s23/C1/xs4".
	if(params["prefix"]) {
		var fourthChildren = document.querySelectorAll("td:nth-child(4)");
		for(var i = 0; i < fourthChildren.length; i++) {
			fourthChildren[i].textContent = commify(fourthChildren[i].textContent);

			// this really doesn't below here, but it's convenient.
			fourthChildren[i].style.textAlign = "right";
		}
	}
}

// adjust census title (both the document title and the main title heading)
// to reflect the current rule/symmetry/prefix, as applicable.
function adjustTitle(params) {

	var rule     = params["rule"    ];
	var symmetry = params["symmetry"];
	var prefix   = params["prefix"  ];

	// find title heading
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

	// word-wrap title heading, to avoid breakage on such rulesyms as
	// B2ekin3cekanyqjr4cekainyqjrtwz5cekainyqjr6cekain7ce8/
	// S01ce2cekain3cekainyqjr4cekainyqjrtwz5cekainyqjr6cekain7ce8/C1 .
	titleHeading.style.wordBreak = "break-all"; // overflowWrap = "break-word";

	// adjust document title. We could try splicing in the titleAmendment, but
	// it's easier to just create the whole thing anew.
	document.title = "Census" + titleAmendment + " - Catagolue";

}

// adjust introductory paragraph on rule/symmetry overview pages to show
// some extra information.
function adjustIntroParagraph(params) {

	// find title heading.
	var titleHeading   = findTitleHeading();

	// find introductory paragraph.
	var introParagraph = titleHeading.nextElementSibling;

	// there may be an extra paragraph after the title heading saying that
	// there's uncommitted hauls not included in the census. If so, the real
	// intro paragraph is "one further down", as it were.
	if(/uncommitted hauls/.test(introParagraph.textContent))
		introParagraph = introParagraph.nextElementSibling;

	// attempt to parse information out of intro paragraph.
	var matches = /The\s+following\s+census\s+was\s+compiled\s+from\s+([\d\s]+)\s+committed\s+hauls\s+containing\s+([\d\s]+)\s+objects\s+generated\s+from\s+([\d\s]+)\s+soups\./.exec(introParagraph.textContent);

	if(matches) {
		var numHauls   = parseInt(matches[1].replace(/[^\d]/g, ""));
		var numObjects = parseInt(matches[2].replace(/[^\d]/g, ""));
		var numSoups   = parseInt(matches[3].replace(/[^\d]/g, ""));

		// numSoups might be 0. If it is not, numHauls is necessarily != 0 as
		// well, so we don't need to test for that. numObjects might still be
		// 0, however.
		if(numSoups) {
			var introParagraphAmendment  = " (⌀ " 
				+ commify((numObjects / numSoups).toFixed(2)) + " objects/soup, "
				+ commify((numSoups   / numHauls).toFixed(0)) + " soups/haul)."

			// remove trailing period...
			introParagraph.lastChild.textContent = introParagraph.lastChild.textContent.replace(/\.$/, "");

			// ...and append new information.
			introParagraph.appendChild(document.createTextNode(introParagraphAmendment));
		}

	}

}

// mark official symmetries on rule overview pages.
function markOfficialSymmetries(params) {

	var rule     = params["rule"    ];
	var symmetry = params["symmetry"];

	// only run on rule overview pages, not the more specific ones also
	// including a symmetry (or even more).
	if(symmetry)
		return;

	// find list items
	var content   = document.getElementById("content");
	var listItems = content.getElementsByTagName("li");

	// iterate over all list items found and extract the census link; if the
	// symmetry it lists is "official", adjust the link's style to make it
	// stand out.
	for(var listItemIndex = 0; listItemIndex < listItems.length; listItemIndex++) {
		var censusLink = listItems[listItemIndex].firstElementChild;

		var matches = /\/(.*)$/.exec(censusLink.textContent);
		if(matches)
			if(isOfficialSymmetry(matches[1]))
				censusLink.style.fontWeight = "bold";
//			else if(isTestSymmetry(matches[1]))
//				censusLink.style.fontStyle  = "italic";

	}

}

// ### MAIN ###
MAIN();
