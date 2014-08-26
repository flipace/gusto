<?php
namespace flipace;

use SQLite3;

error_reporting(E_ALL);

ini_set('display_errors',1);

ob_start();

class Gusto{
	const GUSTO_DIR = "gusto/";
	const GUSTO_REGEX = "/data-gusto=\"(.*?)\"/";
	const GUSTO_DATA_REGEX = "/(data-gusto=\"%s\".*?>)(.+?)(<\/)/";

	private $_edit = false;
	private $_db = null;
	private $_db_name = null;
	private $_password = null;
	private $_caller_file = null;
	
	public $markup = null;

	public function __construct($password = "megusto", $db_name = 'gusto'){
 		$bt =  debug_backtrace();
 		$this->_caller_file = substr($bt[0]['file'], strrpos($bt[0]['file'], "/")+1);

		$this->_db_name = $db_name;
		$this->_password= $password;
		
		$this->initDatabase();
		$this->_markup = $this->getMarkup();

		if($this->checkMode('save')){
			echo $this->saveElement($_POST['id'], $_POST['content'], $_POST['caller_file'], $_POST['tag']);
			$this->_db->close();
			exit;
		}

		if($this->checkMode('edit')){
			$this->_edit = true;
			$this->initEditor();
		}

		$this->initData();

		$this->_db->close();

		return $this;
	}

	public function initDatabase(){
		// check if database exists, if not create one
		if(!file_exists(__DIR__.'/'.$this->_db_name.'.db')){
			$db = fopen(__DIR__.'/'.$this->_db_name.'.db','w') or die('Can\'t create gusto database file. - Maybe a permissions problem?');
			fclose($db);
		}

		$this->_db = new SQLite3(__DIR__.'/'.$this->_db_name.'.db');

		if(!$this->_db->query("SELECT name 
						FROM sqlite_master 
						WHERE type='table' AND name='content'")->fetchArray()){
			$this->installDatabase($this->_db);
		}
	}

	public function checkMode($mode){
		if( isset($_REQUEST['gusto']) && 
			$_REQUEST['gusto'] === $mode &&
			isset($_REQUEST['gusto_pass']) &&
			$_REQUEST['gusto_pass'] === $this->_password ){
			return true;
		}

		return false;
	}

	public function getMarkup(){
		return self::deleteLineBreaks(ob_get_clean());
	}

	public function initData(){

		$doc = new \DOMDocument();
		libxml_use_internal_errors(true);
		$doc->loadHTML($this->_markup);

		$xpath = new \DOMXpath($doc);

		$elements = $xpath->query('//*[@data-gusto]');

		foreach($elements as $element){
			$db_entry = $this->_db->query(
				"SELECT id, slug, data 
				 FROM content 
				 WHERE 
				 	slug = '".self::slugify($element->getAttribute('data-gusto'))."' AND
				 	file = '".$this->_caller_file."'"
			);

			if($result = $db_entry->fetchArray()){
				if($result['data'] !== ''){
					if($element->nodeName !== 'img'){
						$subElement = $doc->createDocumentFragment();
						$subElement->appendXML($result['data']);

						$element->nodeValue = " ";
						$element->appendChild($subElement);
					}else{
						$element->setAttribute('src', $result['data']);
					}
				}
			}else{
				$insert = "INSERT INTO content(slug, data, file) 
						   VALUES(
						   	'".self::slugify($element->getAttribute('data-gusto'))."', 
						   	'".SQLite3::escapeString($element->nodeValue)."',
						   	'".$this->_caller_file."'
						   )";

				if(!$this->_db->query($insert)){
					die("Couldn't write to databse.");
				}
			}

			if($this->_edit && $element->nodeName !== 'img'){
				$editAttribute = $doc->createAttribute('contenteditable');
				$editAttribute->value = 'true';

				$element->appendChild($editAttribute);
			}
		}

		echo $doc->saveHTML();
	}

	public function initEditor(){
		$script = '<script type="text/javascript">var GUSTO_CALLER_FILE = "'.$this->_caller_file.'";</script>
					<script type="text/javascript" src="'.self::GUSTO_DIR.'Gusto.js"></script>';
		$this->_markup = str_replace('</body>', $script.'</body>', $this->_markup);
	}

	static function installDatabase($db){
		$sql = "CREATE TABLE content(
					id integer PRIMARY KEY AUTOINCREMENT, 
					slug text UNIQUE NOT NULL,
					data text,
					file text
				)";

		if($db->exec($sql))
			return true;

		die("Database couldn't be installed.");
	}


	//*******************//

	public function saveElement($id, $content, $caller_file, $tag){
		$checkQuery = "SELECT id, slug, data
						FROM content
						WHERE 
							slug = '".self::slugify($id)."' AND
							file = '".$caller_file."'";

		if($result = $this->_db->query($checkQuery)->fetchArray()){
			$saveQuery = "UPDATE content 
							SET data = '".SQLite3::escapeString($content)."'
							WHERE 
								slug = '".self::slugify($id)."' AND
								file = '".$caller_file."'
							";
		}else{
			$saveQuery = "INSERT INTO content(
								slug, 
								data, 
								file
							)VALUES(
								'".self::slugify($id)."', 
								'".SQLite3::escapeString($content)."',
								'".$caller_file."'
							)";
		}

		if($this->_db->query($saveQuery)){
			return true;
		}else{
			die('An error occured when trying to save the element data.');
		}
	}

	//******************//

	static public function deleteLineBreaks($string){
		$output = str_replace(array("\r\n", "\r"), "\n", $string);
		$lines = explode("\n", $output);
		$new_lines = array();

		foreach ($lines as $i => $line) {
		    if(!empty($line))
		        $new_lines[] = trim($line);
		}
		return implode($new_lines);
	}

	// taken from symfonys jobeet tutorial
	static public function slugify($text)
	{ 
	  // replace non letter or digits by -
	  $text = preg_replace('~[^\\pL\d]+~u', '-', $text);

	  // trim
	  $text = trim($text, '-');

	  // transliterate
	  $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);

	  // lowercase
	  $text = strtolower($text);

	  // remove unwanted characters
	  $text = preg_replace('~[^-\w]+~', '', $text);

	  if (empty($text))
	  {
	    return 'n-a';
	  }

	  return $text;
	}
}