import { h } from 'preact';
import { simpleHash } from './claimListMethods';
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
            backgroundColor: props.styles.themeColor,
            padding: '0.4em 0.5em 0.4em 0.5em',
        },
        FilterButton: {
            borderRadius: '2px',
            backgroundColor: props.styles.themeColor,
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
            backgroundColor: props.styles.themeColor
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
            border: `1px solid ${props.styles.borderColor}`,
            padding: '1px',
            backgroundColor: props.styles.themeColor,
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
                        style={props.queryValues[button.field] ? { ...styles.FilterButton, backgroundColor: props.styles.selectedColor } : styles.FilterButton}
                    >{button.display}</button>
                ))}
                <button
                    style={props.expandAll ? { ...styles.FilterButton, backgroundColor: props.styles.selectedColor } : styles.FilterButton}
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
                {enabledColumns.map(column => {
                    return (
                    <div key={column.field}>
                        <div data-field={column.field} onClick={props.modifySortOrder}>
                        {column.display}{props.sortOrder.has(column.field) ? (props.sortOrder.get(column.field).ascending ? ' \u21D1' : ' \u21D3') : ''}</div>
                        <div style={!!props.queryValues[column.field] ? { ...styles.ColumnControl, backgroundColor: props.styles.selectedColor } : styles.ColumnControl}>
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
                )
                })}
            </div>
        </div>
    )
}

module.exports = {
    ControlArea
}