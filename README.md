Gusto
=====

A completely new way to make your websites content editable.

What is Gusto for?
------
Gustos provides an easy way to change the content of websites, without the need to use traditional content management systems.

**Demo:** http://gusto.neschkudla.at

**Edit Demo:** http://bit.ly/gusto-edit-demo

Use it for
------

  - Any HTML Theme
  - One-Page-Websites

How does it work?
------
Gusto takes advantage of PHP output buffering.

It takes the HTML from the output buffer and gets all elements with the **data-gusto** attribute.

If an element does not already exist in the automatically created SQLite database, it's added automatically with its inner HTML as the content.

When you open your page with the edit parameters, **Gusto elements** will be editable. Just edit their content and Gusto will take care of the rest.

Installation
-----
  - Download Gusto
  - Put the *gusto* folder into your project directory
  - Either use an autoloader or add this to your bootstrapping process:
 
`````php
<?php require_once('gusto/Gusto.php'); ?>
````
  - Add this after your HTML output.
 
`````php
<?php $gusto = new flipace\Gusto(); ?>
````

  - Finally, you can make any HTML element editable like this:

````html
<h1 data-gusto="Page Headline">Gusto rocks</h1>
````

Usage
-----
As soon as you open your website a new file called **gusto.db** is generated next to the Gusto class. It holds all contents of the Gusto elements.

To open the page in edit mode simply add 
````
gusto.dev?gusto=edit&gusto_pass=megusto
````
to your url.

Et voila, you can now edit all elements you added *data-gusto* to.

Options
-----

`````php
<?php 
    // set a custom password for the gusto_pass parameter
    $gusto_password = 'anotherpassword'; 
    
    // set a different name for the database file.
    $gusto_database_name = 'content'; 
    
    $gusto = new flipace\Gusto(
        $gusto_password, 
        $gusto_database_name
    ); 
?>
````

Upcoming
------

  - copy and reuse gusto elements
  - convert to gusto element by click
  - delete gusto element

FAQ
-----
**Can I use a WYSIWYG Editor to edit Gusto elements?**

Yes. If you include the latest CKEditor on your Website, it's even going to be used automatically.

**Is Gusto a replacement for a CMS?**

Gusto does not yet provide any features you'd expect from a full-featured Content Management System. There's no functionality like page or user management built in. If you need anything like this, you should use something else.

Made By
-----
Patrick Neschkudla | flipace | http://neschkudla.at | http://twitter.com/flipace

License
----

MIT