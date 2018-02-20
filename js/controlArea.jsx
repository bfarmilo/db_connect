const { ipcRenderer } = require('electron');
const { h, render, Component } = require('preact');
// the main UI at the top of the table to run and filter queries

const ControlArea = props => {
    const styles = {
        ButtonArea: {
            display: 'flex',
            justifyContent: 'flex-end'
        },
        ResultCount: {
            flexGrow: '7',
            fontSize: 'large',
            color: 'white',
            backgroundColor: 'rgba(51, 122, 183, 1)',
            padding: '0.4em 0.5em 0.4em 0.5em',
        },
        FilterButton: {
            borderRadius: '2px',
            backgroundColor: '#337ab7',
            color: 'lightgrey',
            fontWeight: 'bold',
            border: 'none',
            outline: 'none',
            padding: '0.4em 0.5em 0.4em 0.5em',
        },
        TableHeading: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 5fr 2fr 2fr',
            padding: '0.4em 0.5em 0.4em 0.5em',
            fontSize: 'large',
            color: 'white',
            backgroundColor: 'rgba(51, 122, 183, 1)'
        },
        ColumnControl: {
            display: 'flex',
            justifyContent: 'flex-end',
            marginRight: '5px'
        },
        ValuesField: {
            borderRadius: '2px',
            color: 'lightgray',
            border: 'none',
            outline: 'none',
            width: '90%',
            backgroundColor: 'inherit'
        },
        QueryButton: {
            flexGrow: '1',
            border: '1px solid rgba(41, 94, 141, 0.8)',
            padding: '1px',
            backgroundColor: 'rgba(51, 122, 183, 0.5)',
        }
    }
    return (
        <div class="ControlArea">
            <div style={styles.ButtonArea}>
                <div style={styles.ResultCount}>{`${props.resultCount} Matching Claim${props.resultCount == 1 ? '' : 's'} Found`}</div>
                {props.enabledButtons.map(button => (
                    <button
                        key={button.field}
                        data-value={button.field}
                        data-setvalue={button.setValue}
                        onClick={props.toggleFilter}
                        style={props.queryValues[button.field] ? { ...styles.FilterButton, backgroundColor: props.selectedColor } : styles.FilterButton}
                    >{button.display}</button>
                ))}
                <button
                    style={props.expandAll ? { ...styles.FilterButton, backgroundColor: props.selectedColor } : styles.FilterButton}
                    data-claimid='all'
                    onClick={props.toggleExpand}
                >
                    {props.expandAll ? 'Collapse All Claims' : 'Expand All Claims'}
                </button>
                <button
                    style={styles.FilterButton}
                    onClick={props.changeDB}
                >
                    Change Database
                </button>
            </div>
            <div style={styles.TableHeading}>
                {enabledColumns.map(column => (
                    <div key={column.field}>
                        <div>{column.display}</div>
                        <div style={!!props.queryValues[column.field] ? { ...styles.ColumnControl, backgroundColor: props.selectedColor } : styles.ColumnControl}>
                            <input
                                style={styles.ValuesField}
                                data-field={column.field}
                                onKeyUp={props.editQuery}
                                placeholder='Filter by ...'
                                value={props.queryValues[column.field]} />
                            {!!props.queryValues[column.field] &&
                                <button style={styles.QueryButton} onClick={props.editQuery} data-field={column.field} data-action='clear'>X</button>}
                            <button style={styles.QueryButton} onClick={props.runQuery}>Go</button>
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