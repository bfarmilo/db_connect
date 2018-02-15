import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Scrollbars } from 'preact-custom-scrollbars';
import 'preact/devtools';

// TODO: enable IsIndependentClaim search
const enabledButtons = [
    { display: 'App. Only', field: 'IsMethodClaim', setValue: '0' },
    { display: `Doc'd Only`, field: 'IsDocumented', setValue: '1' },
    { display: 'IPR Only', field: 'IsInIPR', setValue: '1' },
    { display: 'Claim 1 Only', field: 'ClaimNumber', setValue: '1' }
];

const enabledColumns = [
    { display: 'Reference', field: 'PMCRef' },
    { display: 'Patent', field: 'PatentNumber' },
    { display: 'Claim Full Text', field: 'ClaimHtml' },
    { display: 'Notes', field: 'PotentialApplication' },
    { display: 'Watch', field: 'WatchItems' }
]

/** modifies a value within the claim List
 * 
 * @param {*} claimTable the claim table to edit
 * @param {*} changeType type of change - 'set', 'clear', 'resetAll', 'toggle', 'update_set', 'update_clear'
 * @param {*} field the field to target. Note for the 'update' mode this refers to the element storing the text not the edit flag
 * @param {*} claimID the claimID to apply the change to
 * @param {*} newValue the new value for the change, active in 'update' mode only
 */
const modifyClaim = (claimTable, changeType, field = '', claimID = '', newValue = '') => {
    return claimTable.map(item => ({
        PMCRef: item.PMCRef,
        PatentPath: item.PatentPath,
        PatentNumber: item.PatentNumber,
        claims: item.claims.map(claim => {
            if (changeType === 'resetAll') return { ...claim, editPA: false, editWI: false, expandClaim: false }
            if (claim.ClaimID === parseInt(claimID, 10) || claimID === 'all') {
                if (changeType === 'toggle') return { ...claim, [field]: !claim[field] }
                if (changeType === 'set') return { ...claim, [field]: true }
                if (changeType === 'clear') return { ...claim, [field]: false }
                if (changeType.includes('update')) {
                    // update the text and mark the field as edit mode
                    const flagField = field === 'PotentialApplication' ? 'editPA' : 'editWI';
                    return {
                        ...claim,
                        [field]: newValue,
                        [flagField]: changeType.includes('set') ? true : false
                    }
                }
            }
            return { ...claim }
        }),
    }));
}

const countResults = claimTable => {
    return claimTable.map(item => item.claims).reduce((total, claims) => total += claims.length, 0)
}

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
            editPA: false,
            editWI: false,
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

/** */
class ClaimTable extends Component {
    constructor(props) {
        super(props);
        this.state = {
            claimList: initialList,
            expandAll: false,
            queryValues,
            windowHeight: 600,
            resultCount: 0,
            undo: []
        };
        this.toggleExpand = this.toggleExpand.bind(this);
        this.runQuery = this.runQuery.bind(this);
        this.getPatentDetail = this.getPatentDetail.bind(this);
        this.editQuery = this.editQuery.bind(this);
        this.toggleFilter = this.toggleFilter.bind(this);
        this.editMode = this.editMode.bind(this);
        this.clickSaveCancel = this.clickSaveCancel.bind(this);
    }

    // lifecycle Methods
    componentDidMount() {
        ipcRenderer.on('json_result', (event, data) => {
            if (data) {
                // add the state variables to each claim of the query
                const claimList = modifyClaim(data, 'resetAll');
                console.log('got new table data');
                const resultCount = countResults(claimList);
                this.setState({ claimList, resultCount });
            } else {
                console.log('no results received');
                this.setState({ claimList: initialList, resultCount: 0 })
            }
        });
        ipcRenderer.on('resize', (event, newX, newY) => {
            console.log('resize to %d x %d', newX, newY)
            //TODO: Update window size and set new scollbar heights
        })
        this.runQuery();
    }
    //Control Panel Methods
    runQuery(event) {
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

    // TODO: Add sort by heading !

    // Shared Methods
    toggleExpand(event) {
        const claimID = event.currentTarget.getAttribute('data-claimid');
        console.log('expanding claim with ID', claimID);
        let action = 'toggle';
        if (claimID === 'all') {
            // make sure 'all' will either hide or show all
            action = this.state.expandAll ? 'clear' : 'set';
        }
        // update the claim list, and if it was an 'expand-all' call flip the state of expandAll
        this.setState({
            claimList: modifyClaim(this.state.claimList, action, 'expandClaim', claimID),
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
        const claimID = event.currentTarget.getAttribute('data-claimid');
        const field = event.currentTarget.getAttribute('data-field');
        const newValue = event.currentTarget.textContent;
        console.log('detected edit event in %s for claim ID %s, new value %s', field, claimID, newValue);
        //load undo values into undo array, if needed (don't duplicate)
        let newUndo;
        if (this.state.undo.filter(item => item.claimID === claimID && item.field === field).length === 0) {
            newUndo = this.state.claimList.reduce((result, item) => {
                const checkVal = item.claims.filter(claim => `${claim.ClaimID}` === `${claimID}`);
                if (checkVal.length > 0) result.push({
                    claimID: `${checkVal[0].ClaimID}`,
                    field,
                    value: checkVal[0][field]
                })
                return result;
            },[])
            console.log('saved undo values', newUndo);
        } else {
            console.log('item already in undo');
        }
        this.setState({
            claimList: modifyClaim(this.state.claimList, 'update_set', field, claimID, newValue),
            undo: newUndo ? this.state.undo.concat(newUndo) : this.state.undo
        });
    }

    clickSaveCancel(event) {
        const claimID = event.currentTarget.getAttribute('data-claimid');
        const field = event.currentTarget.getAttribute('data-field');
        const action = event.currentTarget.getAttribute('data-action');
        console.log('detected %s event in %s for claim ID %s', action, field, claimID);
        // load the original value into oldValue from the undo array, and create a newValue placeholder
        const oldValue = this.state.undo.filter(item => item.claimID === claimID && item.field === field)[0].value
        if (action === 'cancel') {
            // write old value back into the claimList state
            console.log(oldValue);
            this.setState({
                claimList: modifyClaim(this.state.claimList, 'update_clear', field, claimID, oldValue)
            });
        } else if (action === 'save') {
            // get the new value from the current claimList state
            const newValue = this.state.claimList.reduce((result, item) => {
                let checkVal = item.claims.filter(claim => `${claim.ClaimID}` === claimID);
                if (checkVal.length > 0) {
                    result = checkVal[0][field];
                }
                return result;
            }, '')
            // send off an updateQuery to the database
            ipcRenderer.send(
                field==='PotentialApplication' ? 'update_application' : 'update_watch',
                claimID,
                oldValue,
                newValue
            )
            // clear the 'edit' flag
            // and clear this item out of undo
            this.setState({
                claimList: modifyClaim(this.state.claimList, 'clear', field === 'PotentialApplication' ? 'editPA' : 'editWI', claimID),
                undo: this.state.undo.reduce((result, item) => {
                    if (item.claimID !== claimID || item.field !== field) {
                        result.push(item);
                    }
                    return result;
                },[])
            })
        }
    }

    render({ props }, { state }) {
        return (
            <div class="FullTable">
                <ControlArea
                    queryValues={this.state.queryValues}
                    resultCount={this.state.resultCount}
                    expandAll={this.state.expandAll}
                    runQuery={this.runQuery}
                    editQuery={this.editQuery}
                    toggleExpand={this.toggleExpand}
                    toggleFilter={this.toggleFilter}
                />
                <Scrollbars
                    autoHide
                    autoHeight
                    autoHeightMax={this.state.windowHeight}
                    style={{ width: '100%' }}
                >
                    <TableArea
                        claimList={this.state.claimList}
                        getDetail={this.getPatentDetail}
                        expand={this.toggleExpand}
                        editMode={this.editMode}
                        clickSaveCancel={this.clickSaveCancel}
                    />
                </Scrollbars>
            </div>
        );
    }
}

const ControlArea = props => {
    return (
        <div class="ControlArea">
            <div class="ButtonArea">
                <div class="ResultCount">{`${props.resultCount} Matching Claim${props.resultCount == 1 ? '' : 's'} Found`}</div>
                {enabledButtons.map(button => (
                    <button
                        key={button.field}
                        data-value={button.field}
                        data-setvalue={button.setValue}
                        onClick={props.toggleFilter}
                        class={`FilterButton ${props.queryValues[button.field] && 'Selected'}`}
                    >{button.display}</button>
                ))}
                <button class={`ToggleExpand ${props.expandAll && 'Selected'}`} data-claimid='all' onClick={props.toggleExpand}>{props.expandAll ? 'Collapse All Claims' : 'Expand All Claims'}</button>
            </div>
            <div class="TableHeading">
                {enabledColumns.map(column => (
                    <div key={column.field}>
                        <div>{column.display}</div>
                        <div class="ColumnControl">
                            <input
                                class={`ValuesField ${!!props.queryValues[column.field] && "Selected"}`}
                                data-field={column.field}
                                onKeyUp={props.editQuery}
                                placeholder='Filter by ...'
                                value={props.queryValues[column.field]} />
                            <div class={`${!!props.queryValues[column.field] && "Selected"}`}>
                                {!!props.queryValues[column.field] && <button onClick={props.editQuery} data-field={column.field} data-action='clear'>X</button>}
                                <button onClick={props.runQuery}>Go</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

const TableArea = props => {
    // need to deal with expanding the ClaimFullText
    // and handle changes to Potential Application and Watch Items
    // TODO Make PotentialApplication and WatchItems markdown windows !!
    // Also need to include buttons for save / cancel for each of those
    // to check data, use event.target.getAttribute('data-[value]')
    // props: Array{editPA:boolean, editWI:boolean, ...record}
    return (
        <div class="TableArea">
            {props.claimList.map(patent => patent.claims.map(item => (
                <div key={item.ClaimID} class="TableRow">
                    <div>{patent.PMCRef}</div>
                    <div data-patentnumber={`${patent.PatentNumber}`} data-field="PatentNumber" onClick={props.getDetail}>
                        {patent.PatentNumber}
                    </div>
                    <div data-claimid={`${item.ClaimID}`} data-field="ClaimFullText" onClick={props.expand} >
                        <div>Claim {item.ClaimNumber}{item.expandClaim ? ': ' : ' (expand)'}</div>
                        {item.expandClaim && (<div dangerouslySetInnerHTML={{ __html: `${item.ClaimHtml}` }} />)}
                    </div>
                    <div class={`EditBoxContainer ${item.editPA && "EditableBox"}`}>
                        <div
                        class="EditArea"
                            data-claimid={`${item.ClaimID}`}
                            data-field="PotentialApplication"
                            contentEditable={true}
                            onKeyUp={props.editMode}
                        >
                            {item.PotentialApplication}
                        </div>
                        {item.editPA ? (
                            <div>
                                <SaveCancel handleClick={props.clickSaveCancel} claimID={item.ClaimID} field="PotentialApplication" />
                            </div>) : ("")}

                    </div>
                    <div class={`EditBoxContainer ${item.editWI && "EditableBox"}`}>
                        <div
                            class="EditArea"
                            data-claimid={`${item.ClaimID}`}
                            data-field="WatchItems"
                            contentEditable={true}
                            onKeyUp={props.editMode}
                        >
                            {item.WatchItems}
                        </div>
                        {item.editWI ? (
                            <div>
                                <SaveCancel handleClick={props.clickSaveCancel} claimID={item.ClaimID} field="WatchItems" />
                            </div>
                        ) : ("")}
                    </div>
                </div>
            )))}
        </div>
    );
};

const SaveCancel = props => {
    // TODO pass the click handlers up
    return (
        <div class="SaveCancel">
            <button
                data-claimid={`${props.claimID}`}
                data-field={props.field}
                data-action="save"
                onClick={props.handleClick}
            >
                Save Changes
        </button>
            <button
                data-claimid={props.claimID}
                data-field={props.field}
                data-action="cancel"
                onClick={props.handleClick}
            >
                Cancel
        </button>
        </div>
    );
};

render(<ClaimTable />, document.getElementById('claimTable'));