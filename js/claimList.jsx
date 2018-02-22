import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Scrollbars } from 'preact-custom-scrollbars';
import { ControlArea } from './jsx/controlArea';
import { TableArea } from './jsx/tableArea';
import { getCurrent, modifyClaim, countResults, dropWorkingValue, simpleHash } from './jsx/claimListMethods';
import 'preact/devtools';

const TITLE_ROW_HEIGHT = 175;
const RESIZE_THRESHOLD = 50;

const styles = {
    themeColor: 'rgba(51, 122, 183, 1)',
    selectedColor: 'rgba(183, 130, 51, 0.8)',
    borderColor: 'rgba(41, 94, 141, 0.8)'
}

const enabledButtons = [
    { display: 'App. Only', field: 'IsMethodClaim', setValue: '0' },
    { display: `Doc'd Only`, field: 'IsDocumented', setValue: '1' },
    { display: 'IPR Only', field: 'IsInIPR', setValue: '1' },
    { display: 'Claim 1 Only', field: 'ClaimNumber', setValue: '1' },
    { display: 'Ind. Only', field: 'IsIndependentClaim', setValue: '1' }
];

const enabledColumns = [
    { display: 'Reference', field: 'PMCRef' },
    { display: 'Patent', field: 'PatentNumber' },
    { display: 'Claim Full Text', field: 'ClaimHtml' },
    { display: 'Notes', field: 'PotentialApplication' },
    { display: 'Watch', field: 'WatchItems' }
]

const markmanColumns = [
    { display: 'Reference', field: 'PMCRef' },
    { display: 'Patent', field: 'PatentNumber' },
    { field: 'Claim Number', field: 'ClaimNumber' },
    { display: 'Claim Term', field: 'ClaimTerm' },
    { display: 'Construction', field: 'Construction' },
    { display: 'Page', field: 'MarkmanPage' },
    { display: 'Path to Ruling', field: 'DocumentPath' },
    { field: 'Filename of ruling', field: 'Document' },
    { field: 'Case', field: 'ClientName' }
]

const initialList = [
    {
        PMCRef: '',
        PatentPath: '',
        PatentNumber: 0,
        claims: [{
            ClaimID: 0,
            ClaimNumber: 0,
            ClaimHtml: '',
            PotentialApplication: '',
            WatchItems: ''
        }]
    }
];

const queryValues = {
    PMCRef: '',
    PatentNumber: '',
    IsInIPR: '',
    ClaimNumber: '',
    ClaimHtml: '',
    PotentialApplication: '',
    WatchItems: '',
    IsMethodClaim: '',
    IsDocumented: '',
    IsIndependentClaim: ''
}

const sortOrder = {
    [simpleHash('PatentNumber')]: { field: 'PatentNumber', ascending: true },
    99999: { field: 'ClaimNumber', ascending: true }
};

/** */
class ClaimTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
            claimList: initialList,
            expandAll: false,
            queryValues,
            windowHeight: 625,
            resultCount: 0,
            undo: [],
            working: true,
            activeRows: [],
            sortOrder
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
    }

    // lifecycle Methods
    componentDidMount() {
        // new query results from Main
        ipcRenderer.on('json_result', (event, claimList) => {
            if (claimList) {
                console.log('got new table data');
                const resultCount = countResults(claimList);
                this.setState({ claimList, resultCount, working: false });
            } else {
                console.log('no results received');
                this.setState({ claimList: initialList, resultCount: 0, working: false })
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
        setTimeout(() => this.runQuery(), 2000); //hack to buy time for docker to get server
    }
    //Control Panel Methods

    /** send out a query object and sort order to Main to get a new claimList
     * @returns {undefined}
     * 
     */
    runQuery() {
        this.setState({ working: true })
        console.log('sending new query');
        // kind of hack, sort by the hash function, forces claim number to the end.
        const sortOrder = Object.keys(this.state.sortOrder).sort().map(elem => this.state.sortOrder[elem]);
        ipcRenderer.send('json_query', this.state.queryValues, sortOrder);
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
        if (column.getAttribute('data-action') === 'clear' || event.keyCode === 13) this.runQuery();
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
        this.runQuery();
    }

    /** send a 'change_db' message to main, to switch DB's in the server
     * 
     */
    changeDB() {
        console.log('changing database');
        ipcRenderer.send('change_db');
        this.setState({ claimList: initialList, queryValues, undo: [] });
        this.runQuery();
    }

    /** respond to the clicking on a heading title to cycle through sort order options
     * 
     * @param {*} event 
     */
    modifySortOrder(event) {
        console.log('modifying sort order');
        const field = event.currentTarget.getAttribute('data-field');
        const alreadyInList = this.state.sortOrder[simpleHash(field)];
        const sortOrder = { ...this.state.sortOrder };
        // Logic is this: none -> Ascending -> Descending -> none
        if (!alreadyInList) {
            // none -> Ascending
            console.log('adding key %s to sortOrder', `${simpleHash(field)}`)
            sortOrder[simpleHash(field)] = { field, ascending: true };
        } else {
            if (alreadyInList.ascending) {
                //Ascending -> Descending
                sortOrder[simpleHash(field)] = { field, ascending: false };
            } else {
                //Descending -> none
                console.log('removing key %s from sortOrder', `${simpleHash(field)}`)
                delete sortOrder[simpleHash(field)];
            }
        }
        this.setState({ sortOrder }, () => this.runQuery());

    }

    /** toggle between expand all claims and collapse all claims
     * 
     */
    toggleExpand() {
        this.setState({expandAll: !this.state.expandAll})
    }

    // Table Methods

    /** send view_patentdetail to main to cause a new window to open with patent details
     * 
     * @param {Event} event 
     */
    getPatentDetail(event) {
        const patentNumber = event.currentTarget.getAttribute('data-patentnumber');
        console.log('getting detail for patent', patentNumber);
        ipcRenderer.send('view_patentdetail', patentNumber);
    }

    /** switch into Edit Mode for an editable field
     * 
     * @param {*} event 
     */
    editMode(event) {
        const patentNumber = event.currentTarget.getAttribute('data-patentnumber');
        const claimID = event.currentTarget.getAttribute('data-claimid');
        const field = event.currentTarget.getAttribute('data-field');
        console.log('detected edit event in %s for claim ID %s', field, claimID);
        //intelligently load undo values into undo array using getCurrent
        const undo = getCurrent(this.state.claimList, this.state.undo, patentNumber, claimID, field)
        //load current record into active array, if needed (don't duplicate)
        const activeRows = getCurrent(this.state.claimList, this.state.activeRows, patentNumber, claimID, field)
        //update the state, ready to listen for keypresses
        this.setState({ undo, activeRows });
    }

    /** track changes to a field in edit mode
     * 
     * @param {*} event 
     */
    editContent(event) {
        const patentNumber = event.currentTarget.getAttribute('data-patentnumber');
        const claimID = event.currentTarget.getAttribute('data-claimid');
        const field = event.currentTarget.getAttribute('data-field');
        const newValue = event.currentTarget.value;
        // console.log('got content Change event for claim ID %s, new value %s', claimID, newValue);
        //Set the value for the activeRow corresponding to this field so it updates !
        this.setState({
            activeRows: this.state.activeRows.map(item => {
                if (item.claimID === claimID && item.field === field) return { ...item, value: newValue };
                return item;
            })
        });
    }

    /** exit edit mode through a Save or Cancel button click
     * 
     * @param {*} event 
     */
    clickSaveCancel(event) {
        const patentNumber = event.currentTarget.getAttribute('data-patentnumber');
        const claimID = event.currentTarget.getAttribute('data-claimid');
        const field = event.currentTarget.getAttribute('data-field');
        const action = event.currentTarget.getAttribute('data-action');
        console.log('detected %s event in %s for claim ID %s', action, field, claimID);
        // with either save or cancel, we need to know the activeData.table and activeData.value
        const activeData = dropWorkingValue(this.state.activeRows, claimID, field);
        // likewise we need the remaining undo.table and value we undid undo.value
        const undoData = dropWorkingValue(this.state.undo, claimID, field);
        // load the original value into oldValue from the undo array, and create a newValue placeholder
        if (action === 'save') {
            // send off an updateQuery to the database
            ipcRenderer.send(
                'json_update',
                undoData.value,
                activeData.value
            )
            // splice in the record and update the main table
            this.setState({
                claimList: modifyClaim(this.state.claimList, 'update', activeData.value)
            })
        }
        // clear out and update undo and activeRows
        this.setState({
            undo: undoData.table,
            activeRows: activeData.table
        })

    }

    render({ props }, { state }) {
        return (
            <div class='FullTable'>
                <ControlArea
                    enabledButtons={enabledButtons}
                    queryValues={this.state.queryValues}
                    resultCount={this.state.resultCount}
                    sortOrder={this.state.sortOrder}
                    expandAll={this.state.expandAll}
                    runQuery={this.runQuery}
                    editQuery={this.editQuery}
                    toggleExpand={this.toggleExpand}
                    toggleFilter={this.toggleFilter}
                    changeDB={this.changeDB}
                    styles={styles}
                    modifySortOrder={this.modifySortOrder}
                />
                {this.state.working ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: this.state.windowHeight }}>
                        <svg version='1.1' x='0px' y='0px' width='40px' height='50px' viewBox='0 0 24 30'>
                            {[0, 1, 2].map(x => (
                                <rect key={x} x={x * 7} y='0' width='4' height='20' fill={styles.themeColor}>
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
                        >
                            <TableArea
                                claimList={this.state.claimList}
                                activeRows={this.state.activeRows}
                                expandAll={this.state.expandAll}
                                getDetail={this.getPatentDetail}
                                editContent={this.editContent}
                                editMode={this.editMode}
                                clickSaveCancel={this.clickSaveCancel}
                                selectedColor={styles.selectedColor}
                            />
                        </Scrollbars>
                    )}
            </div>
        );
    }
}

render(<ClaimTable />, document.getElementById('claimTable'));