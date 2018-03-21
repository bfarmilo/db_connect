import { h } from 'preact';
import marked from 'marked';

/** A generic editable cell, using markdown. 
 * @param {(Event, string, string)=>void} props.editContent handler for changing content
 * @param {(Event, string, string)=>void} props.activateEditMode handler for switching to edit mode
 * @param {(Event, string, string)=>void} props.clickSaveCancel handler for clicking Save or Cancel
 * passes also a data-action = 'save' or 'cancel'
 * @param {string} props.selectedColor style to set the color of a selected box
 * @param {string} props.value content of the edit cell
 */
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
            flexGrow: '1',
            fontSize: '0.9em'
        },
        EditArea: {
            backgroundColor: props.selectedColor,
            border: 'none',
            fontFamily: 'Arial',
            height: 'auto'
        },
        Hidden: {
            display: 'none',
            height: 'auto'
        }
    }
    const markdownOptions = {
        sanitize: true,
        gfm: true,
        tables: true,
        breaks: true,
        smartLists: true,
        smartypants: true,
        tasklist: true
    }
    const markdownText = { __html: !props.value ? '' : marked(props.value, markdownOptions) };
    return (props.editMode ? (
        <div style={styles.EditableBox}>
            <textarea
                style={styles.EditArea}
                contentEditable={true}
                onChange={props.editContent}
                value={props.value}
                rows={10}
            />
            <div>
                <SaveCancel
                    handleClick={(e, action) => props.clickSaveCancel(e, action)}
                />
            </div>
        </div>
    ) : (
            <div style={styles.EditBoxContainer}>
                <span
                    style={styles.ViewArea}
                    dangerouslySetInnerHTML={markdownText}
                    onClick={props.activateEditMode}
                />
            </div>
        )
    )
}

/** A private component that renders a Save and a Cancel button
 * Takes props
 * @param {()=>void} props.handleClick click handler for Save and Cancel button
 * also has a data-action property 'save' or 'cancel', needs to be handled up top
 */
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
                    onClick={(e) => props.handleClick(e, item.action)}
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