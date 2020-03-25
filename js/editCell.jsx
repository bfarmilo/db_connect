import { h } from 'preact';
import marked from 'marked';
import DOMPurify from 'dompurify';
import { Icon } from './icons.js';

/** A generic editable cell, using markdown. 
 * @param {(Event, string, string)=>void} props.editContent handler for changing content
 * @param {(Event, string, string)=>void} props.activateEditMode handler for switching to edit mode
 * @param {(Event, string, string)=>void} props.clickSaveCancel handler for clicking Save or Cancel
 * passes also a data-action = 'save' or 'cancel'
 * @param {string} props.themeColor style to set for buttons and other highlighting
 * @param {string} props.selectedColor style to set the color of a selected box
 * @param {string} props.value content of the edit cell
 * @param {number} props.boxHeight height of the edit cell
 * @param {boolean} props.editMode true when editing
 */
const EditCell = props => {

    const editModeRows = Math.max(10, Math.round(props.boxHeight / 15) - 2); //estimate buttons are 2 rows high (2em)

    const styles = {
        EditBoxContainer: {
            display: 'flex',
            flexDirection: 'column'
        },
        EditableBox: {
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
            minHeight: '1em'
        },
        ViewArea: {
            flexGrow: '1',
            fontSize: '0.9em'
        },
        EditArea: {
            backgroundColor: props.selectedColor,
            border: 'none',
            fontFamily: 'Arial'
        },
        Hidden: {
            display: 'none',
            height: 'auto'
        },
        li: {
            listStyleType: 'disc'
        }
    }
    const markdownOptions = {
        gfm: true,
        tables: true,
        breaks: true,
        smartLists: true,
        smartypants: true,
        tasklist: true
    }
    const compactView = !!props.compactView; // if not specified, default to false
    const markdownText = { __html: !props.value ? '' : DOMPurify.sanitize(marked(compactView && props.value.length > 100 ? `${props.value.slice(0,100)}...` : props.value, markdownOptions)) };
    return (props.editMode ? (
        <div style={styles.EditableBox}>
            <textarea
                style={styles.EditArea}
                contentEditable={true}
                onChange={props.editContent}
                value={props.value}
                rows={editModeRows}
            />
            <div>
                <SaveCancel
                    handleClick={(e, action) => props.clickSaveCancel(e, action)}
                    themeColor={props.themeColor}
                />
            </div>
        </div>
    ) : (
            <div style={styles.EditBoxContainer}>
                {props.value ?
                    <span
                        style={styles.ViewArea}
                        dangerouslySetInnerHTML={markdownText}
                        onClick={props.activateEditMode}
                    /> :
                    <span
                        style={{ color: 'lightgrey', fontStyle: 'italic', fontSize: 'small' }}
                        onClick={props.activateEditMode}
                    >Click to Add Text
                    </span>
                }
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
            justifyContent: 'flex-end'
        },
        Button: {
            borderRadius: '2px',
            backgroundColor: props.themeColor,
            color: 'lightgrey',
            fontWeight: 'bold',
            border: 'none',
            outline: 'none',
            padding: '0.4em 0.5em 0.4em 0.5em'
        },
        Icon: {
            fill: 'white',
            strokeWidth: '1px'
        }
    };
    const enabledButtons = [
        { action: 'cancel', display: 'Cancel' },
        { action: 'save', display: 'Save Changes' }
    ];
    return (
        <div style={styles.SaveCancel}>
            {enabledButtons.map(item => (
                <button
                    style={styles.Button}
                    onClick={(e) => props.handleClick(e, item.action)}
                >
                    <Icon name={item.action === 'save' ? 'circleCheck' : 'circleX'} width='1em' height='1em' style={styles.Icon} />
                </button>
            ))}
        </div>
    );
};

module.exports = {
    EditCell
}