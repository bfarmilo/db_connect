# db_connect
Node-based connector to db and publish query results. Latest version is for electron build and localDB in MS SQLServer 2010.

### Requirements:
* Microsoft's SQL Management Studio installed locally
* Patent Database installed locally

### Current Version features:
* Search by 4 different fields
* Use , + ! in search for OR AND NOT respectively
* can lock in prior search values to filter search results further
* typing into the 'application area' box will write to the DB and a JSON-formatted log if you press ENTER, ESC will cancel update
* clicking on the patent will launch it in your native PDF viewer (assuming dropbox folders properly connected)
* rudimentary claim construction search mode. When you select 'Terms (markman)' or 'Constructions (Markman)' as your search field the table will update to Markman view
* In Markman view clicking on the page number will launch the order in your native PDF viewer (assuming dropbox folders properly connected)

Currently very much a work-in-progress.

### Known issues include:
1. Getting the header of the table to align properly and still float over with the buttons
2. DB format change from LocalDB to really anything else (to remove SQL Mgt Studio dependency, work of 1 copy of the DB)
3. Interface to allow addition and linking of markman terms to patents and constructions
