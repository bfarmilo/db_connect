# db_connect
Node-based connector to db and publish query results. Latest version is for electron build and MS SQLServer Express 2012 running in a docker container.

### Requirements:
* Docker container running sql server express (min)

### Current Version features:
* Search by 7 different fields
* Use | & ! in search for OR AND NOT respectively
* Update the 'Application Area' and 'Watch Items' through markdown-enabled edit boxes
* clicking on the patent will open a patent Detail view with full text, pulled from the USPTO if not already in the DB
* clicking on Show Images from the Detail view will launch a resizable image viewer
* Patent detail view has option to launch full PDF it in your native PDF viewer (assuming dropbox folders properly connected)
* Download New Patents will enable lists of patents to be downloaded to the DB
* Cycle between multiple databases hosted by the sql server
* Markman view for claim constructions if applicable
* In Markman view clicking on the page number will launch the order in your native PDF viewer (assuming dropbox folders properly connected)
* closes docker container on app closing
* Patent View shows inventor and title
* If a PDF link is broken, causes the user to browse to a new PDF file
* Upload a generic document (into GeneralResearch DB Only) with Title and Author
* ~~PDF native view (mostly) working~~
* Experimental feature that writes a Importable JSON version of claim table for Excel import
* Compact view in Patent mode
* Patent mode updates and inserts patent summaries
* Updated to latest version of electron / tedious
* Multi-page PDF in native viewer
* PDF preview for non-patent documents
* Multiple PDF's open concurrently
* NEW Change 'ChangeDB' and mode toggles to drop-selects


Currently very much a work-in-progress.

### Known TODOs:

1. Update components to include react hooks: NOT SUPPORTED
1. Migrate to React-Native
1. DB Backend to SQLite for portablility
  1. get rid of tedious-promises 
1. Better reporting for shortlisting, claim export - Improve experimental save-as feature
1. Enable Expiry date estimation writing
1. DB migration to cloud
1. DB authentication and user tracking
1. Idea to store full text (or documents or images) in a new table by SHA. That way if a document already exists don't need to add it again
1. generally make table editable -- repurpose Markman input for main tables ??
1. Lazy loading and overall better handling of PDF documents - see reportViewer?
1. PDF index of open windows for easier navigation
1. Text based searching in PDF view
1. Go To Page function for PDF view
1. Text analysis to map column and row data to the fulltext character offsets


### Build Notes:
1. Docker code to start container:
``` 
docker run --name='sqlserver' -d -p 1433:1433 -e sa_password=8ill5Sql -e ACCEPT_EULA=Y -v C:/PMC-Project/Server/bin/:C:/PMC-Project/Server/bin/ -e attach_dbs="[{'dbName':'PMCDB','dbFiles':['C:\\PMC-Project\\Server\\bin\\PMC_LicensingDB1.mdf','C:\\PMC-Project\\Server\\bin\\PMC_LicensingDB1_log.ldf']},{'dbName':'NextIdea','dbFiles':['C:\\PMC-Project\\Server\\bin\\NextIdea_Primary.mdf','C:\\PMC-Project\\Server\\bin\\NextIdea_Primary.ldf']},{'dbName':'GeneralResearch','dbFiles':['C:\\PMC-Project\\Server\\bin\\GeneralResearch.mdf','C:\\PMC-Project\\Server\\bin\\GeneralResearch.ldf']}]" microsoft/mssql-server-windows-express
```