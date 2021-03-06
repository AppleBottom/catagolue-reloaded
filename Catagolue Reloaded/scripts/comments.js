/*** INJECTED COMMENT HANDLER SCRIPT ***/

// symbols to use for collapsed/expanded comments. These should match the
// values in catagoluereloaded.js .
var commentCollapsedSymbol = "▶ " // U+25B6 BLACK RIGHT-POINTING TRIANGLE
var commentExpandedSymbol  = "▼ " // U+25BC BLACK DOWN-POINTING TRIANGLE

function expandOrCollapse(commentNumber) {

	// find comment body
	var commentBodies = document.getElementsByClassName("comment-body-" + commentNumber);
	var commentBody   = commentBodies[0];

	// this shouldn't happen, but perhaps we got passed a rubbish number.
	if(!commentBody)
		return;

	// find comment expander
	var commentExpanders = document.getElementsByClassName("comment-expander-" + commentNumber);
	var commentExpander  = commentExpanders[0];

	// dto.
	if(!commentExpander)
		return;

	// is the comment currently expanded?
	var commentExpanded = (commentBody.style.display != "none");

	if(commentExpanded) {

		// if so, collapse it and change the expander icon accordingly.
		commentBody.style.display   = "none";
		commentExpander.textContent = commentCollapsedSymbol;

	} else {

		// otherwise, expand it and change the expander icon accordingly.
		commentBody.style.display   = null;
		commentExpander.textContent = commentExpandedSymbol;

	}

}

function expandOrCollapseAll(doCollapse) {

	// find comment bodies and expanders
	var commentBodies    = document.getElementsByClassName("comment-body");
	var commentExpanders = document.getElementsByClassName("comment-expander");

	for(var i = 0; i < commentBodies.length; i++) {
		
		// should we collapse or expand?
		if(doCollapse) {

			// collapse; collapse comment and change the expander icon accordingly.
			commentBodies[i].style.display   = "none";
			commentExpanders[i].textContent = commentCollapsedSymbol;

		} else {

			// expand; expand comment and change the expander icon accordingly.
			commentBodies[i].style.display   = null;
			commentExpanders[i].textContent = commentExpandedSymbol;

		}

	}
	
}
