import { h } from 'preact';
import { simpleHash } from './claimListMethods';
import { Icon } from './icons';
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
            gridTemplateColumns: props.enabledColumns.gridTemplateColumns,
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
            //border: `1px solid ${props.styles.borderColor}`,
            padding: '1px',
            backgroundColor: props.styles.themeColor,
        },
        Icon: {
            fill: 'white',
            display:'flex'
        }
    }
    return (
        <div class="ControlArea">
            <div style={styles.ButtonArea}>
                <div style={styles.ResultCount}>{`${props.resultCount} Matching Claim${props.resultCount == 1 ? '' : 's'} Found`}</div>
                {props.enabledButtons.length ? props.enabledButtons.map(button => (
                    <button
                        key={button.field}
                        data-value={button.field}
                        data-setvalue={button.setValue}
                        onClick={props.toggleFilter}
                        style={props.queryValues[button.field] ? { ...styles.FilterButton, backgroundColor: props.styles.selectedColor } : styles.FilterButton}
                    >{button.display}</button>
                )) : ''}
                {props.displayMode === 'claims' ? <button
                    style={props.expandAll ? { ...styles.FilterButton, backgroundColor: props.styles.selectedColor } : styles.FilterButton}
                    data-claimid='all'
                    onClick={props.toggleExpand}
                >
                    {props.expandAll ? 'Collapse All Claims' : 'Expand All Claims'}
                </button> : <div />}
                <button style={styles.FilterButton} onClick={props.getNewPatents}>
                    Download New Patents</button>
                <button
                    style={styles.FilterButton}
                    onClick={props.changeDB}
                >
                    Change Database
                </button>
            </div>
            <div style={styles.TableHeading}>
                {props.enabledColumns.columns.map(column => {
                    return (
                        <div key={column.field}>
                            <div data-field={column.field} onClick={props.modifySortOrder} style={{display:'flex', justifyContent:'space-between', paddingRight:'1em'}}>
                                <div style={{display:'flex'}}>{column.display} </div>{props.sortOrder.has(column.field) ? <Icon name={props.sortOrder.get(column.field).ascending ? 'sortAscending' : 'sortDescending'} width='1em' height='1em' style={styles.Icon} /> : ''}</div>
                            <div style={!!props.queryValues[column.field] ? { ...styles.ColumnControl, backgroundColor: props.styles.selectedColor } : styles.ColumnControl}>
                                <input
                                    style={styles.ValuesField}
                                    data-field={column.field}
                                    onKeyUp={props.editQuery}
                                    placeholder='Filter by ...'
                                    value={props.queryValues[column.field]} />
                                {!!props.queryValues[column.field] &&
                                    <button style={styles.QueryButton} onClick={props.editQuery} data-field={column.field} data-action='clear'><Icon name='circleX' width='1em' height='1em' style={styles.Icon} /></button>}
                                <button style={styles.QueryButton} onClick={props.runQuery}><Icon name='circleCheck' width='1em' height='1em' style={styles.Icon} /></button>
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