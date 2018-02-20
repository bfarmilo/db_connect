import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Scrollbars } from 'preact-custom-scrollbars';
import { ControlArea } from './jsx/controlArea';
import { TableArea } from './jsx/tableArea';
import { getCurrent, modifyClaim, countResults, dropWorkingValue } from './jsx/claimListMethods';
import 'preact/devtools';

const SET_ALL_CLAIMS = 'all';
const SET_ALL_FLAGS = 'all';

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
            WatchItems: '',
            expandClaim: false
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

const sortOrder = [{
    field: 'PatentNumber',
    ascending: true
}];

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
    }

    // lifecycle Methods
    componentDidMount() {
        ipcRenderer.on('json_result', (event, data) => {
            if (data) {
                // add the state variables to each claim of the query
                const claimList = modifyClaim(data, 'clear', { field: 'expandClaim' });
                console.log('got new table data');
                const resultCount = countResults(claimList);
                this.setState({ claimList, resultCount, working: false });
            } else {
                console.log('no results received');
                this.setState({ claimList: initialList, resultCount: 0, working: false })
            }
        });
        ipcRenderer.on('resize', (event, newSize) => {
            console.log('resize to %d x %d', newSize.width, newSize.height, newSize)
            //TODO: Update window size and set new scollbar heights
            this.setState({ windowHeight: newSize.height - 175 });
        })
        setTimeout(() => this.runQuery(), 2000); //hack to wait for docker to get server
    }
    //Control Panel Methods
    runQuery(event) {
        this.setState({ working: true })
        console.log('sending new query');
        ipcRenderer.send('json_query', this.state.queryValues)
    }

    editQuery(event) {
        const column = event.currentTarget;
        const queryValues = {
            ...this.state.queryValues,
            [column.getAttribute('data-field')]: column.getAttribute('data-action') === 'clear' ? '' : column.value
        }
        console.log('detected edit in query field', column.getAttribute('data-field'));
        // need to update this.state.queryValues[field]
        this.setState({ queryValues });
        if (column.getAttribute('data-action') === 'clear' || event.keyCode === 13) this.runQuery(event);
    }

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

    changeDB(event) {
        console.log('changing database');
        ipcRenderer.send('change_db');
        this.setState({ claimList: initialList, queryValues, undo: [] });
        this.runQuery();
    }

    // TODO: Add sort by heading !

    // Shared Methods
    toggleExpand(event) {
        const patentNumber = event.currentTarget.getAttribute('data-patentnumber');
        const claimID = event.currentTarget.getAttribute('data-claimid');
        console.log('expanding claim with ID', claimID);
        let action = 'toggle';
        if (claimID === 'all') {
            // make sure 'all' will either hide or show all
            action = this.state.expandAll ? 'clear' : 'set';
        }
        // update the claim list, and if it was an 'expand-all' call flip the state of expandAll
        this.setState({
            claimList: modifyClaim(this.state.claimList, action, { claimID, field: 'expandClaim' }),
            expandAll: claimID === 'all' && !this.state.expandAll
        })
    }

    // Table Methods
    getPatentDetail(event) {
        const patentNumber = event.currentTarget.getAttribute('data-patentnumber');
        console.log('getting detail for patent', patentNumber);
        ipcRenderer.send('view_patentdetail', patentNumber);
    }

    editMode(event) {
        const patentNumber = event.currentTarget.getAttribute('data-patentnumber');
        const claimID = event.currentTarget.getAttribute('data-claimid');
        const field = event.currentTarget.getAttribute('data-field');
        const newValue = event.currentTarget.innerText;
        const keyPressed = event.keyCode;
        // catch the enter key, otherwise it creates a new div and messes everything up
        if (keyPressed === 13) {
            console.log('enter pressed')
            event.preventDefault();
        } else {
            console.log('detected edit event in %s for claim ID %s, new value %s, key %d', field, claimID, newValue, keyPressed);
            //intelligently load undo values into undo array using getCurrent
            const undo = getCurrent(this.state.claimList, this.state.undo, patentNumber, claimID, field)
            //load current record into active array, if needed (don't duplicate)
            const activeRows = getCurrent(this.state.claimList, this.state.activeRows, patentNumber, claimID, field)
            //Set the value for the activeRow corresponding to this field so it updates !
            this.setState({
                activeRows: activeRows.map(item => {
                    if (item.claimID === claimID && item.field === field) return { ...item, value: newValue };
                    return item;
                }),
                undo
            });
        }
    }


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
            <div class="FullTable">
                <ControlArea
                    enabledButtons={enabledButtons}
                    queryValues={this.state.queryValues}
                    resultCount={this.state.resultCount}
                    expandAll={this.state.expandAll}
                    runQuery={this.runQuery}
                    editQuery={this.editQuery}
                    toggleExpand={this.toggleExpand}
                    toggleFilter={this.toggleFilter}
                    changeDB={this.changeDB}
                    selectedColor={'rgba(183, 130, 51, 0.8)'}
                />
                {this.state.working ? (
                    <div class="glyphicon-refresh-animate">|</div>
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
                                getDetail={this.getPatentDetail}
                                expand={this.toggleExpand}
                                editMode={this.editMode}
                                clickSaveCancel={this.clickSaveCancel}
                                selectedColor={'rgba(183, 130, 51, 0.8)'}
                            />
                        </Scrollbars>
                    )}
            </div>
        );
    }
}

render(<ClaimTable />, document.getElementById('claimTable'));