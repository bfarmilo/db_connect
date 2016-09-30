# db_connect
Node-based connector to db and publish query results. Latest version is for electron build and localDB in MS SQLServer 2010.

Current Version features:
* Search by 4 different fields
* Use , + ! in search for OR AND NOT respectively
* can lock in prior search values to filter search results further
* typing into the 'application area' box will write to the DB and a JSON-formatted log if you press ENTER, ESC will cancel update

Currently very much a work-in-progress. Known issues include:

1. Getting the header of the table to align properly and still float over with the buttons
2. Get it working on any other machine than mine
3. DB format change from LocalDB to really anything else
