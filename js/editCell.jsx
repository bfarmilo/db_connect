import { h } from 'preact';
import marked from 'marked';
// an editable cell

const EditCell = props => {
    const styles = {
        EditBoxContainer: {
            display: 'flex',
            flexDirection: 'column'
        },
        EditableBox: {
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
        },
        ViewArea: {
            flexGrow: '1'
        },
        EditArea: {
            backgroundColor: props.selectedColor,
            border: 'none',
            fontFamily: 'Arial',
            height: 'auto'
        },
        Hidden: {
            display:'none',
            height:'auto'
        }
    }
    const markDownText = { __html: !props.value ? '' : marked(props.value) };
    return (props.editMode ? (
        <div style={styles.EditableBox}>
            <textarea
                style={styles.EditArea}
                data-claimid={props.claimID}
                data-field={props.field}
                data-patentnumber={props.patentNumber}
                contentEditable={true}
                onChange={props.editContent}
                value={props.value}
                rows={10}
            />
            <div>
                <SaveCancel
                    handleClick={props.clickSaveCancel}
                    claimID={props.claimID}
                    field={props.field}
                    patentNumber={props.patentNumber}
                />
            </div>
        </div>
    ) : (
            <div style={styles.EditBoxContainer}>
                <span
                    style={styles.ViewArea}
                    dangerouslySetInnerHTML={markDownText}
                    onClick={props.activateEditMode}
                    data-claimid={props.claimID}
                    data-field={props.field}
                    data-patentnumber={props.patentNumber}
                />
            </div>
        )
    )
}

const SaveCancel = props => {
    const styles = {
        SaveCancel: {
            gridRowStart: '2',
            display: 'flex',
            justifyContent: 'space-between'
        },
        Button: {
            borderRadius: '2px',
            backgroundColor: '#337ab7',
            color: 'lightgrey',
            fontWeight: 'bold',
            border: 'none',
            outline: 'none',
            padding: '0.4em 0.5em 0.4em 0.5em'
        }
    };
    const enabledButtons = [
        { action: 'save', display: 'Save Changes' },
        { action: 'cancel', display: 'Cancel' }
    ];
    return (
        <div style={styles.SaveCancel}>
            {enabledButtons.map(item => (
                <button
                    style={styles.Button}
                    data-claimid={props.claimID}
                    data-field={props.field}
                    data-patentnumber={props.patentNumber}
                    data-action={item.action}
                    onClick={props.handleClick}
                >
                    {item.display}
                </button>
            ))}
        </div>
    );
};

module.exports = {
    EditCell
}