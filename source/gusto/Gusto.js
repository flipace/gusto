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