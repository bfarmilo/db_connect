import { h } from 'preact';
import { simpleHash } from './claimListMethods';
import { Icon } from './icons';
import { Dropdown } from './DropDown';
// the main UI at the top of the table to run and filter queries

const ControlArea = props => {

    const config = props.config[props.displayMode];
    
    // for the dropdown, create a map of [DBdisplayname -> dbname]
    const databaseList = new Map([...props.dbList].map(([dbName, dbProperties]) => {
        return [dbProperties.display, dbName]
    }));
    // for the dropdown, create a map of [ViewdisplayName -> viewName]
    const displayList = new Map(Object.keys(props.config).map(key => ([props.config[key].display, key])))

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
            gridTemplateColumns: config.gridTemplateColumns,
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
            display: 'flex'
        }
    }

    let specialButton;

    switch (props.displayMode) {
        case 'claims': {
            specialButton = (<button
                style={props.expandAll ? { ...styles.FilterButton, backgroundColor: props.styles.selectedColor } : styles.FilterButton}
                data-claimid='all'
                onClick={props.toggleExpand}
            >
                {props.expandAll ? 'Collapse All Claims' : 'Expand All Claims'}
            </button>);
        }
            break;
        case 'markman': {
            specialButton = (<button style={styles.FilterButton} onClick={props.newConstruction}>Enter New Construction</button>);
        }
            break;
        case 'priorArt': {
            specialButton = (<button style={!props.compactView ? { ...styles.FilterButton, backgroundColor: props.styles.selectedColor } : styles.FilterButton} onClick={props.toggleCompact}>{props.compactView ? 'Expand Summaries' : 'Collapse Summaries'}</button>);
        }
            break;
        default: specialButton = <div />;
    }

    return (
        <div class="ControlArea">
            <div style={styles.ButtonArea}>
                <div style={styles.ResultCount}>{`${props.resultCount} Matching ${config.display}${props.resultCount == 1 ? '' : 's'} Found`}</div>
                {config.enabledButtons.length ? config.enabledButtons.map(button => (
                    <button
                        key={button.field}
                        data-value={button.field}
                        data-setvalue={button.setValue}
                        onClick={props.toggleFilter}
                        style={props.queryValues[button.field] ? { ...styles.FilterButton, backgroundColor: props.styles.selectedColor } : styles.FilterButton}
                    >{button.display}</button>
                )) : ''}
                {specialButton}
                <button style={styles.FilterButton} onClick={props.getNewPatents}>
                    Download New Patents</button>
                <button style={styles.FilterButton} onClick={props.changeMode}>
                    View {props.config[config.next].display}s</button>
                <Dropdown
                    editable={false}
                    data={displayList}
                    contents='displayMode'
                    onChange={props.changeMode}
                    selected={props.config[props.displayMode].display}
                    themeColor={props.config[props.displayMode].themeColor}
                    multiSelect={false}
                />
                <Dropdown
                    editable={false}
                    data={databaseList}
                    contents='database'
                    onChange={props.changeDB}
                    selected={props.activeDB}
                    themeColor={props.config[props.displayMode].themeColor}
                    multiSelect={false}
                />
            </div>
            <div style={styles.TableHeading}>
                {config.columns.map(column => {
                    return (
                        <div key={column.field}>
                            <div data-field={column.field} onClick={props.modifySortOrder} style={{ display: 'flex', justifyContent: 'space-between', paddingRight: '1em' }}>
                                <div style={{ display: 'flex' }}>{column.display} </div>{props.sortOrder.has(column.field) ? <Icon name={props.sortOrder.get(column.field).ascending ? 'sortAscending' : 'sortDescending'} width='1em' height='1em' style={styles.Icon} /> : ''}</div>
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