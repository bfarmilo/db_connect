import { h } from 'preact';
import { EditCell } from './editCell';

const TableArea = props => {
    // TODO Make PotentialApplication and WatchItems markdown windows !!
    const styles = {
        ClaimDiv: {
            padding: '0 5px 0 5px'
        },
        PatentNumber: {
            cursor: 'pointer'
        },
        TableRow: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 5fr 2fr 2fr',
            padding: '0.4em 0.5em 0.4em 0.5em'
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
            {props.claimList.map(patent => patent.claims.map(item => (
                <div key={item.ClaimID} style={styles.TableRow}>
                    <div>{patent.PMCRef}</div>
                    <div
                        style={styles.PatentNumber}
                        data-patentnumber={`${patent.PatentNumber}`}
                        data-field="PatentNumber"
                        onClick={props.getDetail}
                    >
                        {patent.PatentNumber}
                    </div>
                    <div
                        data-claimid={`${item.ClaimID}`}
                        data-field="ClaimFullText"
                        data-patentnumber={patent.PatentNumber}
                    >
                        <details open={props.expandAll}>
                            <summary style={item.IsIndependentClaim ? styles.IndependentClaim : styles.DependentClaim}>Claim {item.ClaimNumber}</summary>
                            <div style={styles.ClaimDiv} dangerouslySetInnerHTML={{ __html: `${item.ClaimHtml}` }} />
                        </details>
                    </div>
                    {["PotentialApplication", "WatchItems"].map(cell => {
                        const activeValue = props.activeRows.find(claim => claim.claimID === `${item.ClaimID}` && claim.field === cell);
                        return (<EditCell
                            selectedColor={props.selectedColor}
                            patentNumber={`${patent.PatentNumber}`}
                            claimID={`${item.ClaimID}`}
                            field={cell}
                            editMode={activeValue}
                            editContent={props.editContent}
                            value={activeValue ? activeValue.value : item[cell]}
                            clickSaveCancel={props.clickSaveCancel}
                            activateEditMode={props.editMode} //pass arguments here instead of down a level
                        />)
                    })}
                </div>
            )))}
        </div>
    );
};

module.exports = {
    TableArea
}