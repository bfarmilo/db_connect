import { h } from 'preact';
import { EditCell } from './editCell';
import { Icon } from './icons';

const TableArea = props => {
    /** Takes props
     * @param {Map} resultList a claimList map, one entry per claim, key=ClaimID
     * @param {Map} activeRows a map of currently editing rows, key="ClaimID-field"
     * @param {boolean} expandAll expand or collapse all claims
     * @param {(Event, string)=>void} getDetail handler for getting patent detail
     * @param {(Event, string, string)=>void} editContent handler for changing content
     * @param {(Event, string, string)=>void} editMode handler for switching to edit mode
     * @param {(Event, string, string)=>void} clickSaveCancel handler for clicking Save or Cancel
     * @param {Object} config Object with themecolor, gridTemplates, styles, columns
     */
    const styles = {
        ClaimDiv: {
            padding: '0 5px 0 5px'
        },
        PatentNumber: {
            cursor: 'pointer'
        },
        TableRow: {
            display: 'grid',
            gridTemplateColumns: props.displayMode === 'claims' ? '7fr 2fr 2fr' : props.config.gridTemplateColumns,
            padding: '0.4em 0.5em 0.4em 0.5em'
        },
        HideTitle: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 5fr'
        },
        DependentClaim: {
            color: 'rgba(0, 0, 0, 0.5)'
        },
        IndependentClaim: {
            color: 'rgba(0, 0, 0, 1)'
        },
        Summary: {
            backgroundColor: props.config.themeColor,
            color: 'white',
            padding: '2px'
        },
        FileName: {
            fontSize: 'small',
            fontColor: props.config.themeColor,
            fontStyle: 'italic',
            cursor: 'pointer',
            display: 'flex'
        },
        Icon: {
            fill: props.config.themeColor
        }
    }

    let tableLayout;
    console.log(props.resultList);
    if (props.displayMode === 'claims') {
        // claims
        tableLayout = [...props.resultList].map(([claimID, item]) => (
            <div key={claimID} style={styles.TableRow}>
                {props.modalContent.claimID !== claimID ? (
                    <div style={styles.HideTitle}>
                        <div
                            style={{ cursor: 'pointer' }}
                            onMouseOver={e => props.showInventor(e, `${claimID}`)}
                        >{item.PMCRef}</div>
                        <div
                            style={styles.PatentNumber}
                            onClick={(e) => props.getDetail(e, `${item.PatentNumber}`)}
                        >
                            {item.PatentNumber}
                        </div>
                        <div>
                            <details open={props.expandAll}>
                                <summary style={item.IsIndependentClaim ? styles.IndependentClaim : styles.DependentClaim}>Claim {item.ClaimNumber}</summary>
                                <div style={styles.ClaimDiv} dangerouslySetInnerHTML={{ __html: `${item.ClaimHtml}` }} />
                            </details>
                        </div>
                    </div>
                ) : (
                        <div
                            onClick={(e) => props.getDetail(e, `${item.PatentNumber}`)}
                            onMouseLeave={e => props.showInventor(e, '')}
                            style={styles.Summary}
                        >{!!props.modalContent.inventor ? `${props.modalContent.inventor}: ` : ''}{props.modalContent.title}
                        </div>
                    )}
                {["PotentialApplication", "WatchItems"].map(field => (
                    <EditCell
                        editMode={props.activeRows.has(`${claimID}-${field}`)}
                        value={props.activeRows.get(`${claimID}-${field}`) || item[field]}
                        editContent={(e) => props.editContent(e, claimID, field)}
                        clickSaveCancel={(e, action) => props.clickSaveCancel(e, claimID, field, action)}
                        activateEditMode={(e) => props.editMode(e, claimID, field)}
                        themeColor={props.config.themeColor}
                        selectedColor={props.config.selectedColor}
                    />)
                )}
            </div>)
        )
    } else {
        //markman
        // TODO: 1. Handle file links properly (in main process?)
        // make use of Court and Agreed.
        tableLayout = [...props.resultList].map(([ID, item]) => (
            <div key={ID} style={styles.TableRow}>
                {props.config.columns.map(column => {
                    if (column.field === 'FileName') {
                        return <div
                            style={styles.FileName}
                            onClick={e => props.openFile(e, item.DocumentPath, item.MarkmanPage)}>
                            <Icon name='jumpFile' width='1em' height='2em' style={styles.Icon} />
                            <div style={{paddingLeft:'7px'}}>{item[column.field]}</div>
                        </div>
                    }
                    return <div>{item[column.field]}</div>
                }
                )}
            </div>
        )
        )
    }

    return (
        <div class='TableArea'>
            {tableLayout}
        </div>
    );
};

module.exports = {
    TableArea
}