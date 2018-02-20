import { h, render, Component } from 'preact';
import { EditCell } from './editCell';

const TableArea = props => {
    // TODO Make PotentialApplication and WatchItems markdown windows !!
    const styles = {
        PatentNumber: {
            cursor: 'pointer'
        },
        ExpandClaim: {
            cursor: 'pointer'
        }
    }
    return (
        <div class="TableArea">
            {props.claimList.map(patent => patent.claims.map(item => (
                <div key={item.ClaimID} class="TableRow">
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
                        onClick={props.expand}
                    >
                        <div style={styles.ExpandClaim}>
                            Claim {item.ClaimNumber}{item.expandClaim ? ': (collapse)' : ' (expand)'}
                        </div>
                        {item.expandClaim && (<div dangerouslySetInnerHTML={{ __html: `${item.ClaimHtml}` }} />)}
                    </div>
                    {["PotentialApplication", "WatchItems"].map(cell => {
                        const activeValue = props.activeRows.find(claim => claim.claimID === `${item.ClaimID}` && claim.field === cell);
                        return (<EditCell
                            selectedColor={props.selectedColor}
                            patentNumber={`${patent.PatentNumber}`}
                            claimID={`${item.ClaimID}`}
                            field={cell}
                            editMode={activeValue}
                            value={activeValue ? activeValue.value : item[cell]}
                            clickSaveCancel={props.clickSaveCancel}
                            activateEditMode={props.editMode}
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