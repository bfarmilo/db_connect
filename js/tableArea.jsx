import { h } from 'preact';
import { EditCell } from './editCell';

const TableArea = props => {
    /** Takes props
     * @param {Map} claimList a claimList map, one entry per claim, key=ClaimID
     * @param {Map} activeRows a map of currently editing rows, key="ClaimID-field"
     * @param {boolean} expandAll expand or collapse all claims
     * @param {(Event, string)=>void} getDetail handler for getting patent detail
     * @param {(Event, string, string)=>void} editContent handler for changing content
     * @param {(Event, string, string)=>void} editMode handler for switching to edit mode
     * @param {(Event, string, string)=>void} clickSaveCancel handler for clicking Save or Cancel
     * @param {string} selectedColor style to set the color of a selected box
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
            gridTemplateColumns: '7fr 2fr 2fr',
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
        }
    }
    return (
        <div class='TableArea'>
            {[...props.claimList].map(record => {
                const [claimID, item] = record;
                return (
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
                                    onMouseLeave={e => props.showInventor(e, '')}
                                    style={{backgroundColor: props.selectedColor}}
                                >{!!props.modalContent.inventor ? `${props.modalContent.inventor}: ` : ''}{props.modalContent.title}
                                </div>
                            )}
                        {["PotentialApplication", "WatchItems"].map(field => (
                            <EditCell
                                selectedColor={props.selectedColor}
                                editMode={props.activeRows.has(`${claimID}-${field}`)}
                                editContent={(e) => props.editContent(e, claimID, field)}
                                value={props.activeRows.get(`${claimID}-${field}`) || item[field]}
                                clickSaveCancel={(e, action) => props.clickSaveCancel(e, claimID, field, action)}
                                activateEditMode={(e) => props.editMode(e, claimID, field)}
                            />)
                        )}
                    </div>)
            })}
        </div>
    );
};

module.exports = {
    TableArea
}