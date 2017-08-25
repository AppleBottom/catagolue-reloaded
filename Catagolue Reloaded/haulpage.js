// ==UserScript==
// @name        Catagolue haul page tweaks
// @namespace   None
// @description Tweaks for Catagolue's haul pages
// @include     *://catagolue.appspot.com/haul/
// @version     1.0
// @grant       none
// ==/UserScript==

// "On second thought, let's not hack in Javascript. 'tis a silly language."

// MAIN function.
function MAIN() {

	// keep long apgcodes from breaking the page layout.
	wrapLongApgcodes();

}

/***********************
 * Major functionality *
 ***********************/

function wrapLongApgcodes() {

	// there are several navbar elements all sharing the same ID, so using
	// document.getElementById does not work here.
	var apgcodeTds = document.querySelectorAll("td:nth-child(2)");
	for(var i = 0; i < apgcodeTds.length; i++)
		apgcodeTds[i].style.wordBreak = "break-all"; // .style.overflowWrap = "break-word"; doesn't work here.

}

// ### MAIN ###
MAIN();
