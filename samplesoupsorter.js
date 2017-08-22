// ==UserScript==
// @name        Catagolue sample soup sorter
// @namespace   None
// @description Sorts sample soup links on Catagolue object pages by symmetry.
// @include     https://catagolue.appspot.com/object/*
// @version     1.1
// @grant       none
// ==/UserScript==

// find the paragraph containing the sample soup links.
function findSampleSoupParagraph() {

	// elements on Catagolue pages do not have ids etc., so instead we look 
	// for the right h3 tag; the paragraph we want is the following element.
	// Note that this may break if Catagolue's page layout changes.
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
		  
	var hrCell = document.createElement("td");
	hrCell.setAttribute("colspan", "3");
	hrCell.setAttribute("style", "padding-top: 0; padding-bottom: 0");
	hrRow.appendChild(hrCell);

	var hr = document.createElement("hr");
	hr.setAttribute("style", "margin: 0");
	hrCell.appendChild(hr);

}

// sort the sample soups on a Catagolue object page by symmetry.
function sortSampleSoups() {

	// regular expression to extract symmetries from sample soup links
	var symRegex   = /hashsoup\/(.*?)\//;
  
	// hash of arrays containing sample soup links, grouped by symmetry
	var soupLinks  = new Object();
  
	// total number of sample soups
	var totalSoups = 0;
  
	// paragraph holding the sample soups.
	var sampleSoupParagraph = findSampleSoupParagraph();
  
	// parse links on this page, and convert HTMLCollection to an array so it 
	// won't be "live" and change underneath us when we remove those links.
	var links = Array.prototype.slice.call(sampleSoupParagraph.getElementsByTagName("a"));
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
	sampleSoupParagraph.parentNode.replaceChild(table, sampleSoupParagraph);

	// iterate through symmetries and add new links.
	var symmetries = Object.keys(soupLinks).sort();
	for(var i = 0; i < symmetries.length; i++) {

		// add a hr between table rows, for the sake of looks.
		appendHR(table);

		// create a new row holding the soup links for this symmetry.
		var tableRow = document.createElement("tr");
		table.appendChild(tableRow);
	  
		var tableCell1 = document.createElement("td");
		tableCell1.textContent = symmetries[i];
		tableRow.appendChild(tableCell1);
	  
		var tableCell2 = document.createElement("td");
		tableCell2.textContent = soupLinks[symmetries[i]].length;
		tableRow.appendChild(tableCell2);
	  
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

// ### MAIN ###
sortSampleSoups();
