<?php 
	require_once('gusto/Gusto.php');
?>
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>gusto | micro content management</title>
	<link rel="stylesheet" href="css/uikit.min.css">
	<link rel="stylesheet" href="gusto/Gusto.css" />
	<script src="//code.jquery.com/jquery-1.11.0.min.js"></script>
	<script type="text/javascript" src="js/uikit.min.js"></script>
	<!--<script src="js/ckeditor/ckeditor.js"></script>-->
</head>
<body>
	<h1 data-gusto="Title">This is a h1 title tag.</h1>
	<div class="box box--blue" data-gusto="Text for Box 1">
This is box 1.
	</div>
	<div class="box box--green" data-gusto="Text for box 2">
This is box 2.
	</div>
	<img src="http://i.imgur.com/YIxOZSv.jpg" data-gusto="an-image" />
</body>
</html>
<?php 
	$gusto = new flipace\Gusto();
?>