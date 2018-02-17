const { ipcRenderer } = require('electron');
const { h, render, Component } = require('preact');
// the main UI at the top of the table to run and filter queries

const ControlArea = props => {
    return (
        <div class="ControlArea">
            <div class="ButtonArea">
                <div class="ResultCount">{`${props.resultCount} Matching Claim${props.resultCount == 1 ? '' : 's'} Found`}</div>
                {props.enabledButtons.map(button => (
                    <button
                        key={button.field}
                        data-value={button.field}
                        data-setvalue={button.setValue}
                        onClick={props.toggleFilter}
                        class={`FilterButton ${props.queryValues[button.field] && 'Selected'}`}
                    >{button.display}</button>
                ))}
                <button class={`ToggleExpand ${props.expandAll && 'Selected'}`} data-claimid='all' onClick={props.toggleExpand}>{props.expandAll ? 'Collapse All Claims' : 'Expand All Claims'}</button>
                <button onClick={props.changeDB}>Change Database</button>
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

module.exports = {
    ControlArea
}