import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Scrollbars } from 'preact-custom-scrollbars';
import { ControlArea } from './jsx/controlArea';
import { TableArea } from './jsx/tableArea';
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
        ClaimID: 0,
        ClaimNumber: 0,
        ClaimHtml: '',
        PotentialApplication: '',
        WatchItems: '',
        IsIndependentClaim: true
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

const sortOrder = new Map([
    ['PatentNumber', { field: 'PatentNumber', ascending: true }],
    ['ClaimNumber', { field: 'ClaimNumber', ascending: true }]
]);

//TODO: Convert claimTable, activeRows, sortOtder to maps and get rid of undo

/** */
class ClaimTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
            claimList: new Map(),
            expandAll: false,
            queryValues,
            windowHeight: 625,
            resultCount: 0,
            working: true,
            activeRows: new Map(),
            sortOrder,
            offset: 0,
            scrollTop: 0,
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
    }

    // lifecycle Methods
    componentDidMount() {
        // new query results from Main
        ipcRenderer.on('json_result', (event, data, resultCount, newOffset, appendMode) => {
            if (data) {
                console.log('got new table data, count, offset, appendmode', resultCount, newOffset, appendMode);
                const claimList = new Map(this.state.claimList);
                if (!appendMode) {
                    claimList.clear();
                }
                data.map(item => claimList.set(`${item.ClaimID}`, item));
                this.setState({
                    claimList,
                    resultCount,
                    working: false,
                    offset: newOffset,
                    scrollTop: appendMode ? this.state.scrollTop : 0
                }
                    , () => this.scrollbar.scrollTop(this.state.scrollTop)
                );
            } else {
                console.log('no results received');
                this.setState({ claimList: new Map(), resultCount: 0, working: false })
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

    componentWillUnmount() {
        // clean up window even listeners
    }

    //Control Panel Methods

    /** send out a query object and sort order to Main to get a new claimList
     * @returns {undefined}
     * 
     */
    runQuery(appendMode = false) {
        const offset = appendMode ? this.state.offset : 0;
        this.setState({ working: !appendMode, offset })
        console.log('sending new query');
        // send plain JSON, not maps
        const sortOrder = [...this.state.sortOrder].map(record => record[1]);
        ipcRenderer.send('json_query', this.state.queryValues, sortOrder, this.state.offset, appendMode);
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
        this.setState({ claimList: new Map(), queryValues });
        this.runQuery();
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
            sortOrder.set(field, {field, ascending:true});
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
        sortOrder.set('ClaimNumber', {field:'ClaimNumber', ascending:true});
        this.setState({ sortOrder }, () => this.runQuery());

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
            this.runQuery(true);
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
        activeRows.set(`${claimID}-${field}`, this.state.claimList.get(claimID)[field]);
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
    clickSaveCancel(event, claimID, field) {
        const action = event.currentTarget.getAttribute('data-action');
        console.log('detected %s event in %s for claim ID %s', action, field, claimID);
        const activeRows = new Map(this.state.activeRows);
        if (action === 'save') {
            // send off an updateQuery to the database
            console.log(this.state.claimList.get(claimID)[field], this.state.activeRows.get(`${claimID}-${field}`));
            ipcRenderer.send(
                'json_update',
                { field, claimID, value: this.state.claimList.get(claimID)[field] },
                { field, claimID, value: this.state.activeRows.get(`${claimID}-${field}`) }
            )
            // splice in the record and update the main table
            const claimList = new Map(this.state.claimList);
            claimList.set(claimID, { ...claimList.get(claimID), [field]: this.state.activeRows.get(`${claimID}-${field}`) })
            this.setState({ claimList })
        }
        // clear out and update activeRows
        activeRows.delete(`${claimID}-${field}`);
        this.setState({ activeRows })
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
                            onScroll={this.handleScroll}
                            ref={s => this.scrollbar = s}
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