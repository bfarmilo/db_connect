const { ipcRenderer } = require('electron');
const { h, render, Component } = require('preact');
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
            display: 'inline-block',
            backgroundColor: props.selectedColor
        }
    }
    return (
        <div style={props.editMode ? styles.EditableBox : styles.EditBoxContainer}>
            <div
                style={props.editMode ? styles.EditArea : styles.ViewArea}
                data-claimid={props.claimID}
                data-field={props.field}
                data-patentnumber={props.patentNumber}
                contentEditable={true}
                onKeyUp={props.activateEditMode}
            >
                {props.value}
            </div>
            {props.editMode ? (
                <div>
                    <SaveCancel
                        handleClick={props.clickSaveCancel}
                        claimID={props.claimID}
                        field={props.field}
                        patentNumber={props.patentNumber}
                    />
                </div>
            ) : ("")}
        </div>
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