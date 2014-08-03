var Gusto = {
	saveElement: function(id, content, tag){
		$.post(window.location, {
			id: id,
			content: content,
			tag: tag,
			gusto: 'save',
			pass: parseGet('gusto_pass'),
			caller_file: GUSTO_CALLER_FILE
		}, function(data){});
	}
}

$(function(){
	$('body').on('click', 'img[data-gusto]', function(){
		$gusto = $(this);
		var src = prompt("Set new image source: ", $gusto.attr('src'));

		if(src !== null){
			Gusto.saveElement($gusto.data('gusto'), src, $gusto.prop("tagName"));
			$gusto.attr('src', src);
		}
	});

	$('body').on('mouseover', 'img[data-gusto]', function(){
		$('body').css('cursor', 'pointer');
	});

	$('body').on('mouseout', 'img[data-gusto]', function(){
		$('body').css('cursor', '');
	});

	$('body').on('focus', '[data-gusto]', function(){
		$gusto = $(this);
		$gusto.data('before', $gusto.html());
		return $gusto;
	});

	$('body').on('blur keyup paste input', '[data-gusto]', function(){
		$gusto = $(this);
		if($gusto.data('before') !== $gusto.html()){
			$gusto.data('before', $gusto.html());
			Gusto.saveElement($gusto.data('gusto'), $gusto.html(), $gusto.prop("tagName"));
		}
		return $gusto;
	});

	$('body').on('mouseenter', '[data-gusto]', function(){
		$gusto = $(this);
		var width 	= $gusto.outerWidth();
		var height 	= $gusto.outerHeight();

		$('#gusto-hint').show();
		$('#gusto-hint').css({
			width: 10,
			height: height,
			left: $gusto.offset().left,
			top: $gusto.offset().top
		});
	});

	$('body').on('mouseleave', '[data-gusto]', function(){
		$('#gusto-hint').hide();
	})

	var gusto_hint = '<div id="gusto-hint" style="z-index: 10000; background-color: rgba(255,219,50,0.5); position: absolute"></div>';
	$('body').append(gusto_hint);
});

/** 
** Awesome get parameter function from Bakudan @ stackoverflow
** http://stackoverflow.com/a/5448595
**/
function parseGet(val) {
    var result = "Not found",
        tmp = [];
    var items = location.search.substr(1).split("&");
    for (var index = 0; index < items.length; index++) {
        tmp = items[index].split("=");
        if (tmp[0] === val) result = decodeURIComponent(tmp[1]);
    }
    return result;
}

/**
* Thanks to https://gist.github.com/Pichan/5498404
* Returns all elements under the position [clientX,clientY] in an array
* 
* @param int X position relative to the viewport
* @param int Y position relative to the viewport
* @param domElm The root element at which to stop looping. Defaults to document.body
* 
* @returns array List of elements under the given position
*/
document.elementsFromPoint = function(clientX,clientY,root) {
  
	// root defaults to document.body
	if (root == undefined)
		root = document.body;
		
	var elements = [];
	var elm;
	
	while (elm = document.elementFromPoint(clientX,clientY)) {
		if (elm == root)
			break;
			
		elements.push(elm);
		
		// store the original display style and hide the current layer by setting display to none
		elm.oldDisplay = elm.style.display;
		elm.style.display = 'none';
	}
	
	// restore the original display values
	for (var i = 0; i < elements.length; i++) {
		elements[i].style.display = elements[i].oldDisplay;
		delete elements[i].oldDisplay;	
	}
 
	return elements;
}