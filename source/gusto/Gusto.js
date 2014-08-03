var Gusto = {
	saveElement: function(id, content){
		$.post(window.location, {
			id: id,
			content: content,
			gusto: 'save',
			pass: parseGet('gusto_pass'),
			caller_file: GUSTO_CALLER_FILE
		}, function(data){});
	}
}

$(function(){
	$('body').on('focus', '[data-gusto]', function(){
		$gusto = $(this);
		$gusto.data('before', $gusto.html());
		return $gusto;
	});

	$('body').on('blur keyup paste input', '[data-gusto]', function(){
		$gusto = $(this);
		if($gusto.data('before') !== $gusto.html()){
			$gusto.data('before', $gusto.html());
			Gusto.saveElement($gusto.data('gusto'), $gusto.html());
		}
		return $gusto;
	});

	$('body').on('mouseenter', '[data-gusto]', function(){
		$gusto = $(this);
		var width 	= $gusto.outerWidth();
		var height 	= $gusto.outerHeight();

		$('#gusto-hint').stop().animate({
			width: 20,
			height: height,
			left: 20,
			top: $gusto.offset().top
		})

	});

	var gusto_hint = '<div id="gusto-hint" style="z-index: 10000; background-color: rgba(0,200,0,0.3); position: absolute"></div>';
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