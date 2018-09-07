import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Scrollbars } from 'preact-custom-scrollbars';
import { ControlArea } from './jsx/controlArea';
import { TableArea } from './jsx/tableArea';

// import 'preact/devtools';

const TITLE_ROW_HEIGHT = 175;
const RESIZE_THRESHOLD = 50;
const NEW = false;
const APPEND = true;

const config =
{
    claims: {
        gridTemplateColumns: '1fr 1fr 5fr 2fr 2fr',
        themeColor: 'rgba(51, 122, 183, 1)',
        selectedColor: 'rgba(183, 130, 51, 0.8)',
        borderColor: 'rgba(41, 94, 141, 0.8)',
        enabledButtons: [
            { display: 'App. Only', field: 'IsMethodClaim', setValue: '0' },
            { display: `Doc'd Only`, field: 'IsDocumented', setValue: '1' },
            { display: 'IPR Only', field: 'IsInIPR', setValue: '1' },
            { display: 'Claim 1 Only', field: 'ClaimNumber', setValue: '1' },
            { display: 'Ind. Only', field: 'IsIndependentClaim', setValue: '1' }
        ],
        columns: [
            { display: 'Reference', field: 'PMCRef' },
            { display: 'Patent', field: 'PatentNumber' },
            { display: 'Claim Full Text', field: 'ClaimHtml', hasDetail: true },
            { display: 'Notes', field: 'PotentialApplication' },
            { display: 'Watch', field: 'WatchItems' }
        ]
    },
    markman: {
        gridTemplateColumns: '1fr 1fr 0.5fr 2fr 3fr 0.5fr 2fr 2fr 1fr',
        themeColor: 'rgba(12, 84, 0, 1)',
        selectedColor: 'rgba(183, 130, 51, 0.8)',
        borderColor: 'rgba(41, 94, 141, 0.8)',
        enabledButtons: [],
        columns: [
            { display: 'Reference', field: 'PMCRef' },
            { display: 'Patent', field: 'PatentNumber' },
            { display: 'Clm.', field: 'ClaimNumber' },
            { display: 'Claim Term', field: 'ClaimTerm' },
            { display: 'Construction', field: 'Construction' },
            { display: 'Pg.', field: 'MarkmanPage' },
            { display: 'Ruling', field: 'FileName' },
            { display: 'Court', field: 'Court'},
            { display: 'Case', field: 'ClientName' }
        ]
    }
};

const sortOrder = new Map([
    ['PatentNumber', { field: 'PatentNumber', ascending: true }],
    ['ClaimNumber', { field: 'ClaimNumber', ascending: true }]
]);

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
            sortOrder,
            offset: 0,
            scrollTop: 0,
            modalContent: { inventor: '', title: '', claimID: '' },
            displayMode: 'claims'
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
    }

    // lifecycle Methods
    componentDidMount() {

        // new query results from Main
        ipcRenderer.on('json_result', (event, data, resultCount, newOffset, appendMode) => {
            if (data) {
                console.log('got new table data, count, offset, appendmode', resultCount, newOffset, appendMode);
                const resultList = new Map(this.state.resultList);
                console.log(data);
                if (!appendMode) {
                    resultList.clear();
                }
                data.map(item => {
                    const key = this.state.displayMode === 'claims' ?
                        `${item.ClaimID}` :
                        `${Object.keys(item).filter(hash => /ID$/i.exec(hash)).map(hash => item[hash]).join('_')}`
                    // debugging - why duplicates?
                    if (resultList.has(key)) console.log('collision:', resultList.get(key), item);
                    resultList.set(key, item);
                });
                this.setState({
                    resultList,
                    resultCount,
                    working: false,
                    offset: newOffset,
                    scrollTop: appendMode ? this.state.scrollTop : 0
                }
                    , () => this.scrollbar.scrollTop(this.state.scrollTop)
                );
            } else {
                console.log('no results received');
                this.setState({ resultList: new Map(), resultCount: 0, working: false })
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
    changeDB() {
        console.log('changing database');
        ipcRenderer.send('change_db');
        const queryValues = this.clearQuery();
        const resultList = new Map();
        this.setState({ resultList, queryValues });
        this.runQuery(null, NEW);
    }

    /** respond to the clicking on a heading title to cycle through sort order options
     * 
     * @param {*} event 
     */
    modifySortOrder(event) {
        console.log('modifying sort order');
        const field = event.currentTarget.getAttribute('data-field');
        const sortOrder = new Map(this.state.sortOrder);
        // since maps order by key entry, remove the 'claimNumber' key then add at the end
        sortOrder.delete('ClaimNumber');
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
        sortOrder.set('ClaimNumber', { field: 'ClaimNumber', ascending: true });
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
        //console.log('distance to trigger %d -> %d', -event.target.scrollTop + event.target.scrollHeight, this.state.windowHeight);
        if (this.state.resultCount > 200 && event.target.scrollHeight - event.target.scrollTop <= this.state.windowHeight) {
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
     */
    getPatentDetail(event, patentNumber) {
        console.log('getting detail for patent', patentNumber);
        ipcRenderer.send('view_patentdetail', patentNumber);
    }

    /** switch into Edit Mode for an editable field
     * 
     * @param {*} event 
     */
    editMode(event, claimID, field) {
        console.log('detected edit event in %s for claim ID %s', field, claimID);
        //load current record into active array, if needed (don't duplicate)
        const activeRows = new Map(this.state.activeRows);
        activeRows.set(`${claimID}-${field}`, this.state.resultList.get(claimID)[field]);
        //update the state, ready to listen for keypresses
        this.setState({ activeRows });
    }

    /** track changes to a field in edit mode
     * 
     * @param {*} event 
     */
    editContent(event, claimID, field) {
        const newValue = event.currentTarget.value;
        // console.log('got content Change event for claim ID %s, new value %s', claimID, newValue);
        //Set the value for the activeRow corresponding to this field so it updates !
        const activeRows = new Map(this.state.activeRows);
        activeRows.set(`${claimID}-${field}`, newValue);
        this.setState({ activeRows })
    }

    /** exit edit mode through a Save or Cancel button click
     * 
     * @param {*} event 
     */
    clickSaveCancel(event, claimID, field, action) {
        console.log('detected %s event in %s for claim ID %s', action, field, claimID);
        const activeRows = new Map(this.state.activeRows);
        if (action === 'save') {
            // send off an updateQuery to the database
            console.log(this.state.resultList.get(claimID)[field], this.state.activeRows.get(`${claimID}-${field}`));
            ipcRenderer.send(
                'json_update',
                { field, claimID, value: this.state.resultList.get(claimID)[field] },
                { field, claimID, value: this.state.activeRows.get(`${claimID}-${field}`) }
            )
            // splice in the record and update the main table
            const resultList = new Map(this.state.resultList);
            resultList.set(claimID, { ...resultList.get(claimID), [field]: this.state.activeRows.get(`${claimID}-${field}`) })
            this.setState({ resultList })
        }
        // clear out and update activeRows
        activeRows.delete(`${claimID}-${field}`);
        this.setState({ activeRows })
    }

    /**
     * Change from Claims to Constructions and vice-versa
     */
    changeMode = e => {
        const queryValues = this.clearQuery();
        const resultList = new Map();
        this.setState({ displayMode: this.state.displayMode === 'claims' ? 'markman' : 'claims', resultList, queryValues });
        this.runQuery(null, NEW);
    }

    /** Handle call to open a PDF */
    openFile = (e, filePath, pageNo) => {
        ipcRenderer.send('open_patent', filePath, pageNo);
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

    render({ props }, { state }) {
        return (
            <div class='FullTable'>
                <ControlArea
                    config={config[this.state.displayMode]}
                    displayMode={this.state.displayMode}
                    queryValues={this.state.queryValues}
                    resultCount={this.state.resultCount}
                    sortOrder={this.state.sortOrder}
                    expandAll={this.state.expandAll}
                    runQuery={this.runQuery}
                    editQuery={this.editQuery}
                    toggleExpand={this.toggleExpand}
                    toggleFilter={this.toggleFilter}
                    changeDB={this.changeDB}
                    styles={config[this.state.displayMode]}
                    modifySortOrder={this.modifySortOrder}
                    getNewPatents={this.getNewPatents}
                    changeMode={this.changeMode}
                />
                {this.state.working ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: this.state.windowHeight }}>
                        <svg version='1.1' x='0px' y='0px' width='40px' height='50px' viewBox='0 0 24 30'>
                            {[0, 1, 2].map(x => (
                                <rect key={x} x={x * 7} y='0' width='4' height='20' fill={config[this.state.displayMode].themeColor}>
                                    <animate attributeName='opacity' attributeType='XML'
                                        values='1; .2; 1'
                                        begin={`${x * 0.2}s`} dur='0.6s' repeatCount='indefinite' />
                                </rect>
                            ))}
                        </svg>
                    </div>
                ) : (
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
                                config={config[this.state.displayMode]}
                                resultList={this.state.resultList}
                                activeRows={this.state.activeRows}
                                expandAll={this.state.expandAll}
                                modalContent={this.state.modalContent}
                                getDetail={this.getPatentDetail}
                                editContent={this.editContent}
                                editMode={this.editMode}
                                clickSaveCancel={this.clickSaveCancel}
                                showInventor={this.showInventor}
                                openFile={this.openFile}
                            />
                        </Scrollbars>
                    )}
            </div>
        );
    }
}

render(<ClaimTable />, document.getElementById('claimTable'));