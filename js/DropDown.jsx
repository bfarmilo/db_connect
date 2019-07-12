import { h } from 'preact';

/**
 * 
 * @param {Boolean} props.editable -> can the user insert a new value
 * @param {Map} props.data -> A map of [number, index] for lookups
 * @param {String} props.contents -> used to identify what is changing in onChange callback
 * @param {Event} props.onChange -> callback when entry is changed 
 * @param {Number} props.selected -> The key value of the current selection from data
 * @param {String} props.themeColor -> Background color for all boxes
 * @param {String} props.multiSelect -> Optional prop to enable multiple selections
 */

const Dropdown = props => {


    const styles = {
        select: {
            backgroundColor: props.themeColor
        },
        option: {
            background: props.themeColor
        },
        input: {
            backgroundColor: props.themeColor
        }
    }

    const optionList = props.data.size ? [...props.data] : ['', ''];
    const listID = props.contents; // change this into a hash?

    return (
        <div class={'customdropdown'} style={{ display: 'flex', flexGrow:'1', margin: '3px' }}>
            {props.editable ?
                <input style={styles.input} value={props.selected} list={listID} onChange={e => props.onChange(e, props.contents)}>
                    <datalist id={listID} style={styles.select}>
                        {optionList.map(([num, idx]) => <option style={styles.option} value={num} id={idx}>{num}</option>)}
                    </datalist>
                </input>
                :
                props.multiSelect ?
                    <select style={styles.select} multiple={props.multiSelect} size={Math.min(props.data.size, 5)} onChange={e => props.onChange(e, props.contents)}>
                        {optionList.map(([num, idx]) => <option style={styles.option} selected={props.selected.has(num)} value={num} id={idx}>{num}</option>)}
                    </select>
                    :
                    <select style={styles.select} value={props.selected} multiple={false} onChange={e => props.onChange(e, props.contents)}>
                        {optionList.map(([num, idx]) => <option style={styles.option} value={num} id={idx}>{num}</option>)}
                    </select>
            }
        </div>
    )
}

module.exports = {
    Dropdown
}