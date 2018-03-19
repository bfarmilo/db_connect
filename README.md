# db_connect
Node-based connector to db and publish query results. Latest version is for electron build and MS SQLServer Express 2012 running in a docker container.

### Requirements:
* Docker container running sql server express (min)

### Current Version features:
* Search by 5 different fields
* Use | & ! in search for OR AND NOT respectively
* Update the 'Application Area' and 'Watch Items' through markdown-enabled edit boxes
* clicking on the patent will open a patent Detail view with full text, pulled from the USPTO if not already in the DB
* Patent detail view has option to launch full PDF it in your native PDF viewer (assuming dropbox folders properly connected)
* Download New Patents will enable lists of patents to be downloaded to the DB
* rudimentary claim construction search mode. When you select 'Terms (markman)' or 'Constructions (Markman)' as your search field the table will update to Markman view
* In Markman view clicking on the page number will launch the order in your native PDF viewer (assuming dropbox folders properly connected)

Currently very much a work-in-progress.

### Known TODOs:

1. Interface to allow addition and linking of markman terms to patents and constructions
1. Better reporting for shortlisting, claim export
1. Write back-end for Patent Summary updating
1. Enable Expiry date estimation writing
1. Option to show titles for General Analysis DB
1. DB migration to cloud
1. DB authentication and user tracking
1. Add first inventor to DB, and Patent Detail view

### Build Notes:
