import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { EditCell } from './jsx/editCell';
/** @jsx h */

class PatentDetail extends Component {

    constructor(props) {
        super(props);
        const EstimatedExpiryDate = new Date();
        this.state = {
            result: {
                PatentPath: '_blank',
                Title: 'No Patent Loaded',
                PatentNumber: 1111111,
                IndependentClaimsCount: 0,
                ClaimsCount: 0,
                PatentHtml: '[""]',
                InventorLastName: '',
                EstimatedExpiryDate
            },
            patentSummaries: new Map(),
            activeSummary: new Map(),
            searchTerm: '',
            highlightList: []
        };
        this.openClickHandler = this.openClickHandler.bind(this);
        this.goBackClickHandler = this.goBackClickHandler.bind(this);
        this.editContent = this.editContent.bind(this);
        this.activateEditMode = this.activateEditMode.bind(this);
        this.clickSaveCancel = this.clickSaveCancel.bind(this);
        this.changeSearchTerm = this.changeSearchTerm.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('state', (event, data) => {
            console.log('received data', data);
            console.log('summaries', JSON.stringify(data.summaries));
            const { summaries, ...result } = { ...data.summaries, ...data };
            const patentSummaries = Object.keys(summaries[0]).length === 0 ? new Map() : new Map(summaries.map(summary => [summary.PatentSummaryID, summary]))
            console.log('summary in Map form:', patentSummaries, patentSummaries.size);
            this.setState({ result, patentSummaries });
        });
    }

    openClickHandler(event) {
        console.log('opening patent', this.state.result.patentPath);
        ipcRenderer.send('open_patent', this.state.result.PatentPath);
    }

    goBackClickHandler(event) {
        console.log('closing window');
        ipcRenderer.send('close_patent_window');
    }

    editContent(event, summaryID) {
        console.log('content change detected for', summaryID);
    }

    activateEditMode(event, summaryID) {
        console.log('request to activate edit mode detected for', summaryID);
        const activeSummary = new Map(this.state.activeSummary);
        const newValue = this.state.patentSummaries.get(summaryID);
        activeSummary.set(summaryID, !!newValue ? newValue.PatentSummaryText : '');
        console.log('record added to activeSummary', activeSummary);
        this.setState({ activeSummary });
    }

    clickSaveCancel(event, summaryID, action) {
        console.log(action, 'event detected for', summaryID);
        const activeSummary = new Map(this.state.activeSummary);
        if (action === 'save') {
            const newRecord = {
                DateModified: new Date(),
                PatentSummaryText: activeSummary.get(summaryID),
                AuthorID: 2
            };
            if (summaryID === 'new') {
                newRecord.PatentID = this.state.result.PatentID;
                console.log('request to create new summary with data', newRecord);
                // send it off
            } else {
                newRecord.PatentSummaryID = summaryID;
                console.log('request to update record with data', newRecord)
                // send it off
            }
        }
        if (action === 'cancel') {
            console.log('cancel event detected');
        }
        // finished updating, inserting, or cancelled, so clear out activeSummary
        activeSummary.delete(summaryID);
        // note, could update patentSummaries here and refresh page
        this.setState({ activeSummary }, () => ipcRenderer.send('view_patentdetail', this.state.result.PatentNumber));
    }

    //TODO: Implement RegExp search of fullText
    changeSearchTerm(event) {
        const searchTerm = new RegExp(event.target.value, 'g');
        // highlightList stores an array of paragraph indexes where the regex is found
        const highlightList = JSON.parse(this.state.result.PatentHtml).map((para, index) => searchTerm.test(para) ? index : 'none').filter(val => val !== 'none');
        console.log(highlightList, searchTerm);
        this.setState({ searchTerm: event.currentTarget.value, highlightList });
    }

    render({ }, { result }) {
        console.log('calling render with state', this.state.result, this.state.patentSummaries)
        return (
            <div>
                <div class="list">
                    <Result
                        result={this.state.result}
                        summaries={this.state.patentSummaries}
                        openClickHandler={this.openClickHandler}
                        goBackClickHandler={this.goBackClickHandler}
                        selectedColor={'rgba(51, 122, 183, 0.2)'}
                        activeSummary={this.state.activeSummary}
                        editContent={this.editContent}
                        activateEditMode={this.activateEditMode}
                        clickSaveCancel={this.clickSaveCancel}
                        changeSearchTerm={this.changeSearchTerm}
                        highlightList={this.state.highlightList}
                    />
                    <FullText
                        patentHtml={JSON.parse(this.state.result.PatentHtml)}
                        highlightList={this.state.highlightList}
                    />
                </div>
            </div>
        );
    }
}

const Result = (props) => {
    const hasDate = !!props.result.EstimatedExpiryDate;
    //TODO: Make date editable
    const [summaryID, summaryText] = props.summaries.size ? props.summaries.entries().next().value : ['new', { PatentSummaryText: '' }];
    console.log('set summaryID and text', summaryID, summaryText);
    const styles = {
        NewSummary: {
            backgroundColor: 'rgba(0,0,0,0)',
            border: 'none',
            fontStyle: 'italic',
            width: '100%',
            padding: '2px'
        },
        EditCell: {
            gridColumn: '1/5'
        },
        SearchBox: {}
    }
    return (
        <div class="PatentDetail">
            <div class="PMCRef">{props.result.PMCRef}</div>
            <div class="PatentNumber">{props.result.PatentNumber.toString().replace(/(\d{1})(\d{3})(\d{3})/g, '$1,$2,$3')} {props.result.InventorLastName ? `(${props.result.InventorLastName})` : ''} </div>
            <div class="Date">{hasDate ? `Expiry ~${props.result.EstimatedExpiryDate}` : 'Expiry Unknown'}</div>
            <div class="CloseWindow"><button onClick={props.goBackClickHandler}>X</button></div>
            <div class="Title">"{props.result.Title}"</div>
            <div class="Summary">{props.summaries.size || props.activeSummary.size ? (
                <EditCell
                    selectedColor={props.selectedColor}
                    editMode={props.activeSummary.has(summaryID)}
                    editContent={(e) => props.editContent(e, summaryID)}
                    value={props.activeSummary.get(summaryID) || summaryText.PatentSummaryText}
                    clickSaveCancel={(e, action) => props.clickSaveCancel(e, summaryID, action)}
                    activateEditMode={(e) => props.activateEditMode(e, summaryID)}
                />) : (
                    <input
                        style={styles.NewSummary}
                        onClick={(e) => props.activateEditMode(e, 'new')}
                        placeholder="create new summary">
                    </input>
                )}
            </div>
            <div class="ClaimsCount">Claims (<strong>Independent</strong>/Total): <strong>{props.result.IndependentClaimsCount}</strong>/{props.result.ClaimsCount}</div>
            <div class="Search"><input style={styles.SearchBox} placeholder="type term then Enter" onChange={e => props.changeSearchTerm(e)}></input><span class="PatentParagraph">{props.highlightList.length}</span></div>
            <div class="OpenPDF"><button onClick={props.openClickHandler}>Open PDF</button></div>
        </div>
    )
};

const FullText = (props) => {
    const styles = {
        MatchIndex: {
            fontStyle: 'italic',
            backgroundColor: 'rgba(111,145,185,1)'
        }
    }
    return (
        <div class="FullText">
            {props.patentHtml.map((paragraph, index) => {
                const header = paragraph.toUpperCase() === paragraph;
                const highlight = props.highlightList.length > 0 && props.highlightList.includes(index);
                return paragraph.length > 2 ? (
                    <div class={header ? "PatentParagraph PatentHeader" : highlight ? "Highlight" : "PatentParagraph"} key={index}>
                        {header ? `${paragraph.charAt(0)}${paragraph.slice(1).toLowerCase()}` :
                            highlight ? <span><span style={styles.MatchIndex}>[Match {props.highlightList.indexOf(index) + 1}/{props.highlightList.length}]</span> {paragraph}</span> : paragraph}
                    </div>
                ) : ''
            })}
        </div>
    )
}

render(<PatentDetail />, document.getElementById('patentDetail'))