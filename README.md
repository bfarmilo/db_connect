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
1. Update back-end to write patent image data to DB
1. Write front-end for patent image viewing (see https://github.com/wojtekmaj/react-pdf)
1. Better reporting for shortlisting, claim export
1. Write back-end for Patent Summary updating
1. Enable Expiry date estimation writing
1. DB migration to cloud
1. DB authentication and user tracking
1. Support for US Applications
1. Option to enable general PDF linking
1. Idea to store full text (or documents) in a new table by SHA. That way if a document already exists don't need to add it again
1. Sort by author, or generally make table editable
  1. Make markman view for preact build

### Build Notes:
1. Docker code to start container:
``` 
docker run --name='sqlserver' -d -p 1433:1433 -e sa_password=8ill5Sql -e ACCEPT_EULA=Y -v C:/PMC-Project/Server/bin/:C:/PMC-Project/Server/bin/ -e attach_dbs="[{'dbName':'PMCDB','dbFiles':['C:\\PMC-Project\\Server\\bin\\PMC_LicensingDB1.mdf','C:\\PMC-Project\\Server\\bin\\PMC_LicensingDB1_log.ldf']},{'dbName':'NextIdea','dbFiles':['C:\\PMC-Project\\Server\\bin\\NextIdea_Primary.mdf','C:\\PMC-Project\\Server\\bin\\NextIdea_Primary.ldf']},{'dbName':'GeneralResearch','dbFiles':['C:\\PMC-Project\\Server\\bin\\GeneralResearch.mdf','C:\\PMC-Project\\Server\\bin\\GeneralResearch.ldf']}]" microsoft/mssql-server-windows-express
```