# Gusto Chef

**Uber for Private Chefs** - Eine hybride Mobile App zum Buchen von Privatköchen

## Features

### Für Kunden
- Durchsuche verifizierte Privatköche in deiner Nähe
- Filter nach Küche, Preis, Bewertung
- Echtzeit-Verfügbarkeit & Buchung
- Sichere Zahlung via Stripe
- Abo-Modelle für Vielbucher
- Chat mit deinem Koch
- Bewertungssystem

### Für Köche
- Eigenes Profil mit Galerie
- Verfügbarkeitskalender
- Buchungsmanagement
- Verdienst-Dashboard
- Premium-Listing Option
- Direktauszahlung via Stripe Connect

## Monetarisierung

### Kundenabos
| Plan | Preis | Buchungen/Monat | Service-Gebühr |
|------|-------|-----------------|----------------|
| Basic | €9,99 | 1 | 10% |
| Plus | €24,99 | 4 | 5% |
| Premium | €49,99 | Unbegrenzt | 0% |

### Platform Revenue
- 20% Provision auf jede Buchung (vom Koch)
- Premium-Listing für Köche: €29,99/Monat
- Durchschnittliche Buchung: €150-300

## Tech Stack

### Frontend (Hybrid Mobile App)
- HTML5, CSS3, JavaScript (Vanilla)
- Progressive Web App (PWA)
- Capacitor für iOS/Android Native Builds
- Mobile-First responsive Design

### Backend (PHP API)
- PHP 8.x mit SQLite Database
- RESTful JSON API
- JWT Authentication
- Stripe Integration

## Installation

### Development Server
```bash
# PHP Development Server starten
npm start
# oder
php -S localhost:8000 -t source

# App öffnen
open http://localhost:8000/app/
```

### Native App bauen
```bash
# Dependencies installieren
npm install

# iOS Build
npm run build:ios
npm run open:ios

# Android Build
npm run build:android
npm run open:android
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Registrierung
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Aktueller User

### Chefs
- `GET /api/chefs` - Köche suchen
- `GET /api/chefs/{id}` - Koch-Profil
- `GET /api/chefs/{id}/availability` - Verfügbarkeit
- `GET /api/chefs/{id}/reviews` - Bewertungen

### Bookings
- `POST /api/bookings` - Neue Buchung
- `GET /api/bookings` - Meine Buchungen
- `PUT /api/bookings/{id}/status` - Status ändern
- `POST /api/bookings/{id}/review` - Bewerten

### Subscriptions
- `GET /api/subscriptions/plans` - Verfügbare Pläne
- `GET /api/subscriptions/current` - Aktuelles Abo
- `POST /api/subscriptions/checkout` - Checkout starten

## Projektstruktur

```
gusto/
├── source/
│   ├── api/                 # PHP Backend
│   │   ├── classes/         # PHP Klassen
│   │   │   ├── Auth.php
│   │   │   ├── Booking.php
│   │   │   ├── Chef.php
│   │   │   ├── Database.php
│   │   │   ├── Payment.php
│   │   │   └── Subscription.php
│   │   ├── config.php
│   │   └── index.php        # API Router
│   └── app/                 # Frontend
│       ├── index.html       # Kunden-App
│       ├── chef.html        # Koch-Dashboard
│       ├── manifest.json    # PWA Manifest
│       └── sw.js            # Service Worker
├── capacitor.config.json    # Native App Config
└── package.json
```

## Stripe Setup

1. Erstelle einen Stripe Account
2. Kopiere API Keys in `source/api/config.php`
3. Erstelle Subscription Products/Prices
4. Konfiguriere Webhooks für `/api/subscriptions/webhook`

---

# Gusto CMS (Legacy)

Micro Content Management for small websites.

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