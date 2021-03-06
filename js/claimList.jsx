import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Scrollbars } from 'preact-custom-scrollbars';
import { ControlArea } from './jsx/controlArea';
import { TableArea } from './jsx/tableArea';
import { Throbber } from './jsx/throbber';
import { config } from './jsx/config'

// import 'preact/devtools';

const TITLE_ROW_HEIGHT = 175;
const RESIZE_THRESHOLD = 50;
const NEW = false;
const APPEND = true;
const ROWS_TO_RETURN = 500; // keep in sync with main



/** */
class ClaimTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
            resultList: new Map(),
            expandAll: false,
            queryValues: {},
            windowHeight: 625,
            resultCount: 0,
            working: true,
            activeRows: new Map(),
            sortOrder: new Map(config.claims.sortOrder),
            offset: 0,
            scrollTop: 0,
            modalContent: { inventor: '', title: '', claimID: '' },
            displayMode: 'claims',
            compactView: true,
            activeDB: '',
            dbList: new Map()
            // scrollBar: {}
        };
        this.toggleExpand = this.toggleExpand.bind(this);
        this.runQuery = this.runQuery.bind(this);
        this.getPatentDetail = this.getPatentDetail.bind(this);
        this.editQuery = this.editQuery.bind(this);
        this.toggleFilter = this.toggleFilter.bind(this);
        this.editMode = this.editMode.bind(this);
        this.clickSaveCancel = this.clickSaveCancel.bind(this);
        this.changeDB = this.changeDB.bind(this);
        this.modifySortOrder = this.modifySortOrder.bind(this);
        this.editContent = this.editContent.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.getNewPatents = this.getNewPatents.bind(this);
        this.showInventor = this.showInventor.bind(this);
        this.newConstruction = this.newConstruction.bind(this);
        this.toggleCompact = this.toggleCompact.bind(this);
    }

    // lifecycle Methods
    componentDidMount() {

        // new query results from Main
        ipcRenderer.on('json_result', (event, data, resultCount, newOffset, appendMode, activeDB, dbList) => {
            if (data) {
                console.log('got new table data, count, offset, appendmode', resultCount, newOffset, appendMode);
                const resultList = new Map(this.state.resultList);
                console.log(data);
                // for new queries, clear the results otherwise append to the existing result list
                if (!appendMode) {
                    resultList.clear();
                }
                data.map(item => {
                    const key = this.state.displayMode === 'claims' ?
                        `${item.ClaimID}` :
                        `${Object.keys(item).filter(ID => /ID$/i.exec(ID)).map(ID => item[ID]).join('_')}`;
                    // debugging - why duplicates?
                    // if (resultList.has(key)) console.log('collision:', resultList.get(key), item);
                    resultList.set(key, item);
                });
                console.log(resultList);
                // now need to convert dbList {db1: {}, db2: {}, db3:{}} to an iterable
                this.setState({
                    resultList,
                    resultCount,
                    activeDB,
                    dbList: new Map(Object.keys(dbList).map(key => [key, dbList[key]])),
                    working: false,
                    offset: newOffset,
                    scrollTop: appendMode ? this.state.scrollTop : 0
                }
                    , () => this.scrollbar.scrollTop(this.state.scrollTop)
                );
            } else {
                console.log('no results received');
                this.setState({ resultList: new Map(), resultCount: 0, activeDB, working: false })
            }
        });
        // window size changed, needed to recalculate scrollbars
        ipcRenderer.on('resize', (event, newSize) => {
            // debouncing, only update if |height change| > a threshold 
            if (Math.abs(newSize.height - this.state.windowHeight) > RESIZE_THRESHOLD) {
                console.log('resize to %d x %d', newSize.width, newSize.height)
                this.setState({ windowHeight: newSize.height - TITLE_ROW_HEIGHT });
            }
        })
        // new patents added to the db
        ipcRenderer.on('new_patents_ready', (e, list) => {
            console.log('got new patents, rerunning query', list);
            this.runQuery(null, NEW);
        })
        // reset the query
        this.clearQuery();
        // wait a few seconds for the server to connect
        // TODO: use handshake for this
        setTimeout(() => {
            this.runQuery(null, NEW)
        }, 2000); //hack to buy time for docker to get server
    }

    componentWillUnmount() {
        // clean up window even listeners
    }

    //Helper functions that don't set state

    clearQuery = () => {
        // set up a blank query with the proper properties for the query mode
        const queryFieldList = config[this.state.displayMode].enabledButtons.concat(config[this.state.displayMode].columns);
        return queryFieldList.reduce((query, column) => {
            query[column.field] = '';
            return query;
        }, {});
    }

    //Control Panel Methods

    /** send out a query object and sort order to Main to get a new resultList
     * @returns {undefined}
     * 
     */
    runQuery(event, appendMode) {
        const offset = appendMode ? this.state.offset : 0;
        this.setState({ working: !appendMode, offset })
        console.log('sending new query with appendMode, offset', appendMode, offset);
        // send plain JSON, not maps
        const sortOrder = [...this.state.sortOrder].map(record => record[1]);
        ipcRenderer.send('json_query', this.state.displayMode, this.state.queryValues, sortOrder, offset, appendMode);
    }


    getNewPatents(event) {
        ipcRenderer.send('new_patent_retrieval');
    }

    /** Handle typing in a filter cell
     * 
     * @param {*} event 
     */
    editQuery(event) {
        const column = event.currentTarget;
        const queryValues = {
            ...this.state.queryValues,
            [column.getAttribute('data-field')]: column.getAttribute('data-action') === 'clear' ? '' : column.value
        }
        console.log('detected edit in query field', column.getAttribute('data-field'));
        // need to update this.state.queryValues[field]
        this.setState({ queryValues });
        if (column.getAttribute('data-action') === 'clear' || event.keyCode === 13) this.runQuery(null, NEW);
    }

    /** update the query based on clicking Go/Clear in a filter field
     * 
     * @param {*} event 
     */
    toggleFilter(event) {
        const field = event.currentTarget.getAttribute('data-value');
        const setValue = event.currentTarget.getAttribute('data-setvalue');
        console.log('processing filter', field);
        const queryValues = {
            ...this.state.queryValues,
            [field]: this.state.queryValues[field] === setValue ? '' : setValue
        }
        this.setState({ queryValues })
        this.runQuery(null, NEW);
    }

    /** send a 'change_db' message to main, to switch DB's in the server
     * 
     */
    changeDB(event) {
        console.log('changing database');
        // event.target.value is the display name of the database
        // need to do a quick lookup to get the dbname to pass back to main
        const activeDB = ([...this.state.dbList].filter(([dbName, dbProperties]) => dbProperties.display === event.target.value))[0][0];
        ipcRenderer.send('change_db', activeDB);
        const queryValues = this.clearQuery();
        const resultList = new Map();
        this.setState({ resultList, queryValues }, () => this.runQuery(null, NEW));
    }

    /** respond to the clicking on a heading title to cycle through sort order options
     * 
     * @param {*} event 
     */
    modifySortOrder(event) {
        console.log('modifying sort order');
        const field = event.currentTarget.getAttribute('data-field');
        const sortOrder = new Map(this.state.sortOrder);
        // since maps order by key entry, for claims mode remove the 'claimNumber' key then add at the end
        if (this.state.displayMode === 'claims' || this.state.displayMode === 'priorArt') sortOrder.delete('ClaimNumber');
        // Logic is this: none -> Ascending -> Descending -> none
        if (!sortOrder.has(field)) {
            // none -> Ascending
            console.log('adding key %s to sortOrder', field)
            sortOrder.set(field, { field, ascending: true });
        } else {
            if (sortOrder.get(field).ascending) {
                //Ascending -> Descending
                sortOrder.set(field, { field, ascending: false });
            } else {
                //Descending -> none
                console.log('removing key %s from sortOrder', field);
                sortOrder.delete(field);
            }
        }
        // for claims mode, add claim back in and set it ascending
        if (this.state.displayMode === 'claims') sortOrder.set('ClaimNumber', { field: 'ClaimNumber', ascending: true });
        // for prior art mode, if no sort order is set default to PMCRef
        if (this.state.displayMode === 'priorArt' && !sortOrder.size) sortOrder.set('PMCRef', { field: 'PMCRef', ascending: true })
        this.setState({ sortOrder }, () => this.runQuery(null, NEW));

    }

    /** toggle between expand all claims and collapse all claims
     * 
     */
    toggleExpand() {
        this.setState({ expandAll: !this.state.expandAll })
    }

    // Table Methods

    handleScroll(event) {
        //TODO: clean way to leave the scroll position where it was
        console.log('distance to trigger %d -> %d', -event.target.scrollTop + event.target.scrollHeight, this.state.windowHeight, this.state.resultCount);
        if (this.state.resultCount > ROWS_TO_RETURN && event.target.scrollHeight - event.target.scrollTop <= this.state.windowHeight) {
            this.setState({
                scrollTop: event.target.scrollTop,
                //scrollBar: this.scrollBar 
            });
            this.runQuery(null, APPEND);
        }

    }
    /** send view_patentdetail to main to cause a new window to open with patent details
     * 
     * @param {Event} event
     * @param {Number} patentNumber 
     */
    getPatentDetail(event, patentNumber) {
        console.log('getting detail for patent', patentNumber);
        ipcRenderer.send('view_patentdetail', patentNumber);
    }

    /** send view_markman to main to cause a new window to open for markman entry
     * @param {Event} event
     */

    newConstruction(event) {
        console.log('launching Markman entry window');
        ipcRenderer.send('add_claimconstructions');
    }
    /** switch into Edit Mode for an editable field
     * 
     * @param {*} event 
     */
    editMode(event, claimID, field) {
        console.log('detected edit event in %s for claim ID %s', field, claimID);
        //load current record into active array, if needed (don't duplicate)
        console.log(event.target.localName === 'span' ? event.target.clientHeight : event.target.parentElement.clientHeight);
        const height = event.target.localName === 'span' ? event.target.clientHeight : event.target.parentElement.clientHeight;
        const activeRows = new Map(this.state.activeRows);
        activeRows.set(`${claimID}-${field}`, { record: this.state.resultList.get(claimID)[field], height });
        //update the state, ready to listen for keypresses
        this.setState({ activeRows });
    }

    /** track changes to a field in edit mode
     * 
     * @param {*} event 
     */
    editContent(event, claimID, field) {
        const record = event.currentTarget.value;
        // console.log('got content Change event for claim ID %s, new value %s', claimID, newValue);
        //Set the value for the activeRow corresponding to this field so it updates !
        const activeRows = new Map(this.state.activeRows);
        const height = event.currentTarget.clientHeight;
        activeRows.set(`${claimID}-${field}`, { record, height });
        this.setState({ activeRows })
    }

    /** exit edit mode through a Save or Cancel button click
     * 
     * @param {*} event 
     */
    clickSaveCancel(event, recordID, field, action) {
        console.log('detected %s event in %s for record ID %s', action, field, recordID);
        const activeRows = new Map(this.state.activeRows);
        console.log(activeRows);
        if (action === 'save') {
            // send off an updateQuery to the database
            console.log(this.state.resultList.get(recordID)[field], this.state.activeRows.get(`${recordID}-${field}`).record);
            ipcRenderer.send(
                'json_update',
                { field, recordID, value: this.state.resultList.get(recordID)[field] },
                { field, recordID, value: this.state.activeRows.get(`${recordID}-${field}`).record },
                this.state.displayMode
            )
            // splice in the record and update the main table
            const resultList = new Map(this.state.resultList);
            resultList.set(recordID, { ...resultList.get(recordID), [field]: this.state.activeRows.get(`${recordID}-${field}`).record })
            this.setState({ resultList })
        }
        // clear out and update activeRows
        activeRows.delete(`${recordID}-${field}`);
        this.setState({ activeRows })
    }

    /**
     * Change from Claims to Constructions to PriorArt and back
     */
    changeMode = e => {
        const displayMode = Object.keys(config).filter(key => config[key].display && config[key].display === e.target.value)[0];
        const { sortOrder } = config[displayMode];
        const queryValues = this.clearQuery();
        const resultList = new Map();
        this.setState({ displayMode, sortOrder: new Map([...sortOrder]), resultList, queryValues }, () => this.runQuery(null, NEW));
    }

    /** Handle call to open a PDF */
    openFile = (e, filePath, docID, type, pageNo) => {
        ipcRenderer.send('open_patent', filePath, docID, type, pageNo);
    }
    /**
     * Display the inventor and patent title modal on hover
     * @param {Event} e 
     * @param {String} claimID 
     */
    showInventor(e, claimID) {
        if (claimID !== '') {
            const { InventorLastName, Title } = this.state.resultList.get(claimID);
            const modalContent = { inventor: InventorLastName || '', title: Title, claimID };
            console.log('hovering over patent', modalContent);
            this.setState({ modalContent });
        } else {
            this.setState({ modalContent: { title: '', inventor: '', claimID: '' } })
        }
    }

    toggleCompact(e) {
        const compactView = !this.state.compactView;
        this.setState({ compactView });
    }

    render({ props }, { state }) {
        return (
            <div class='FullTable'>
                <ControlArea
                    config={config}
                    displayMode={this.state.displayMode}
                    queryValues={this.state.queryValues}
                    resultCount={this.state.resultCount}
                    sortOrder={this.state.sortOrder}
                    expandAll={this.state.expandAll}
                    compactView={this.state.compactView}
                    activeDB={this.state.dbList.size ? this.state.dbList.get(this.state.activeDB).display : ''}
                    dbList={this.state.dbList}
                    runQuery={this.runQuery}
                    editQuery={this.editQuery}
                    toggleExpand={this.toggleExpand}
                    toggleFilter={this.toggleFilter}
                    toggleCompact={this.toggleCompact}
                    changeDB={this.changeDB}
                    styles={config[this.state.displayMode]}
                    modifySortOrder={this.modifySortOrder}
                    getNewPatents={this.getNewPatents}
                    changeMode={this.changeMode}
                    newConstruction={this.newConstruction}
                />
                {this.state.working && this.state.resultList.size === 0 ? <Throbber
                    visible={true}
                    windowHeight={this.state.windowHeight}
                    themeColor={config[this.state.displayMode].themeColor}
                /> :
                    <Scrollbars
                        autoHide
                        autoHeight
                        autoHeightMax={this.state.windowHeight}
                        style={{ width: '100%' }}
                        onScroll={this.handleScroll}
                        ref={s => this.scrollbar = s}
                    >
                        <TableArea
                            displayMode={this.state.displayMode}
                            compactView={this.state.compactView}
                            config={config[this.state.displayMode]}
                            resultList={this.state.resultList}
                            activeRows={this.state.activeRows}
                            activeRowHeight={this.state.activeRowHeight}
                            expandAll={this.state.expandAll}
                            modalContent={this.state.modalContent}
                            getDetail={this.getPatentDetail}
                            editContent={this.editContent}
                            editMode={this.editMode}
                            clickSaveCancel={this.clickSaveCancel}
                            showInventor={this.showInventor}
                            openFile={this.openFile}
                            windowHeight={this.state.windowHeight}
                            working={this.state.working}
                        />
                    </Scrollbars>
                }
            </div>
        );
    }
}

render(<ClaimTable />, document.getElementById('claimTable'));