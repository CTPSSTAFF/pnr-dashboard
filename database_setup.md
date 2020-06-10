# Database / Back-end Setup for PNR Dashboard Application
The process of moving application-specific data to the internal (web-dev.ad.ctps.org)
or the external (ctps.org) web servers involves:
1. A one-time initial setup
2. Moving a new version of the application-specific database to the webserver(s)
whenever the relevant data has changed

## Initial Setup
The initial setup involves two distinct sets of steps:
1. Steps performed on the PostgreSQL cluster and database "backing" the application.
2. Steps performed on the GeoServer instance "fronting" the data in the database.

### PostgreSQL Database
Database setup involves steps performed at the "cluster" and at the "database" level.

#### Cluster-level Setup
At the level of the entire "cluster" of databases running on the host,
create the the following user- and group-level "roles":  
* __pnr_admin__
* __pnr_dba__
* __pnr_editor__ - _Not needed for the PNR app._
* __pnr_viewer__

Set the properties of these roles as follows:

__pnr_admin__  - This is a "login" role.  
* Privileges
    * Can login? __Y__
    * Inerhit rights from parent role? __Y__
    * All others __N__
* Membership
    * Roles: pnr_dba

__pnr_dba__  - This is a "group" role.  
* Privileges
    * Inerhit rights from parent role? __Y__
    * All others __N__
* Membership
    * Roles: pnr_dba

__pnr_editor__  \(This would be a "group" role.\)    
_Do not create this group role; it is not needed for the PNR app.

__pnr_viewer__ - This is a "login" role.  
* Privileges  
    * Can login? __Y__
    * Inerhit rights from parent role? __Y__
    * All others __N__

#### Database-level Setup
* Create an empty database named __pnr__.
* Add a schema named __pnr_admin__.
* Set the options on the "Security" tab for the __pnr_schema__ as follows:  

| Grantee   | Priveleges | Grantor  |
|-----------|------------|----------|
| pnr_admin | UC         | postgres |
| postgres  | UC         | postgres |


### GeoServer
Geoserver setup involves the creation of a __workspace__ and a __store__
for the application-specific data.

#### Workspace
Create a GeoServer _workspace_ for the application's data:  
* Name: __pnr_viewer__
* Namespace URI: http://ctps.org/pnr_viewer

#### Store
Create a Geoserver _store_ for that refers to the PostgreSQL database backing the application,
with the following parameters:  
* dbtype: __postgis__  
* host: __localhost__  
* port: __5432__
* database: __pnr__  
* schema: __public__  
* user: __pnr_viewer__  
* password: __pnr_viewer__    
Use the default values of the other parameters.

## Moving the Data
The process for moving a new or updated version of an application-specific database is as follows:
1. If not already done, move/copy all the data for the application in question to a _dedicated_ PostgreSQL database.
2. 'Dump' the database containing the application-specific database to a PostgreSQL backup file:
    1. In PgAdmin, right-mouse on the database
    2. Select __Backup__
    3. In the 'Backup' dialog under '__Filename__', click on the file-selection control labeled __...__.
    4. This will bring up another dialog box resembling, but not identical to, a Windows file-selection dialog
    5. In the lower-right hand corner of this dialog, select "All files" from the __Format__ combo box
    6. Navigate to the location where you want to save the dump, and enter a name for the dump file, e.g., __pnr_15June2020__.
    7. Click the __Create__ button at the bottom of the file selection dialog, 
    8. Click the __Backup__ button at the bottom of the 'Backup' dialog, and wait for the dump file to be created.
3. If the database does not already exist on the webserver (i.e., this is the first time this
appliation-specific database is being moved to the server), create the database:
    1. In PgAdmin, right-mouse on the database cluster for the server
    2. Select __Create__ > __Database__
    3. Enter the name of the application-specific database when prompted, e.g., 'pnr'.
    4. Click the __Save__ button.
4. If the database already exists on the external webserver, delete it and create a new \(empty\) one:
    1. First, ensure that all connections to the database have been severed.
    2. At the very least, this will involve severing the connection between the GeoServer on the webserver and the database. To do this:
        1. In the GeoServer admin console, select __Stores__ from the main menu on the left-hand side of the page
        2. Select the store for the application in question, e.g., __pnr__
        3. In the __Basic Store Info__ section at the top of the page for the store, un-click the __Enabled__ checkbox.
        4. Scroll to the bottom of the page, and click __Save__.
        5. Other connections _may_ also be open; this will become apparent if the attempt to delete the database \(next step\) fails. The most likely candidates are "windows" you may have left open in PgAdmin to query tables in the database in question. Close all of these, by clicking the "X" in the upper right-hand corner of each such "window."
    3. Actually delete (i.e., "drop") the database:
       1. In PgAdmin, right-mouse on the database in question
       2. Select __Delete/Drop__
    4. Then create a new database, as described in Steps 3.1 through 3.3, above.
5. Load the database with the new set of data dumped in Step 2:
    1. In PgAdmin, right-mouse on the database on the server into which you want to load the data
    2. Select __Restore__
    3. In the 'Restore' dialog under '__Filename__', click on the file-selection control labeled __...__.
    4. Navigate to the dump file created in Step 2, and select it.
    5. Click the __Restore__ button.
6. Enable the connection between the GeoServer __store__ for the application-specific data and this database:
    1. In the GeoServer admin console, select __Stores__ from the main menu on the left-hand side of the page
    2. Select the store for the application in question, e.g., __pnr__
    3. In the __Basic Store Info__ section at the top of the page for the store, click the __Enabled__ checkbox.
    4. Scroll to the bottom of the page, and click __Save__.