import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { EditCell } from './jsx/editCell';
import { Icon } from './jsx/icons';
import { Throbber } from './jsx/Throbber';

/** @jsx h */

const DEFAULT_PAGE_NO = 0;

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
                EstimatedExpiryDate,
                PatentID: 0
            },
            patentSummaries: new Map(),
            activeSummary: new Map(),
            searchTerm: '',
            highlightList: new Map(),
            scrollNavigation: new Map(),
            patentImages: new Map(),
            currentScroll: 0,
            currentImage: 0,
            enableOffline: false,
            windowSize: { width: 0, height: 0 },
            working: true
        };
        this.openClickHandler = this.openClickHandler.bind(this);
        this.goBackClickHandler = this.goBackClickHandler.bind(this);
        this.editContent = this.editContent.bind(this);
        this.activateEditMode = this.activateEditMode.bind(this);
        this.clickSaveCancel = this.clickSaveCancel.bind(this);
        this.changeSearchTerm = this.changeSearchTerm.bind(this);
        this.addNewRef = this.addNewRef.bind(this);
        this.scrollToNext = this.scrollToNext.bind(this);
        this.makeOffline = this.makeOffline.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('state', (event, data) => {
            console.log('received data', data);
            // console.log('summaries', JSON.stringify(data.summaries));
            if (data.working) {
                this.setState({ working: data.working })
            } else {
                const { summaries, ...result } = { ...data.summaries, ...data };
                const patentSummaries = Object.keys(summaries[0]).length === 0 ? new Map() : new Map(summaries.map(summary => [summary.PatentSummaryID, summary]))
                // console.log('summary in Map form:', patentSummaries, patentSummaries.size);
                this.setState({
                    result,
                    patentSummaries,
                    highlightList: new Map(),
                    searchTerm: '',
                    currentScroll: 0,
                    scrollNavigation: new Map(),
                    working: false
                });
            }
        });
        ipcRenderer.on('resize', (event, { width, height }) => {
            console.log(`got new window size width:${width} height:${height}`);
            this.setState({ windowSize: { width, height } })
        });
        ipcRenderer.on('available_offline', (event, isOffline) => {
            console.log(`fullText is ${isOffline ? '' : 'not'} available offline`);
            this.setState({ enableOffline: isOffline });
        });
    }

    openClickHandler(event) {
        console.log('opening patent', this.state.result.PatentPath);
        ipcRenderer.send('open_patent', this.state.result.PatentPath, this.state.result.PatentID, `${this.state.result.PatentNumber} (${this.state.result.InventorLastName})`, 'patentDetail', DEFAULT_PAGE_NO);
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

    //TODO: Highlight the word in the paragraph
    changeSearchTerm(event) {
        if (event.target.value.length > 1) {
            const searchTerm = new RegExp(event.target.value, 'i');
            // paraList stores an array of paragraph indexes where the regex is found
            const paraList = JSON.parse(this.state.result.PatentHtml).map((para, index) => searchTerm.test(para) ? index : 'none').filter(val => val !== 'none');
            // convert this to a blank highlightList map. start by setting all values to {}, they will be set during render
            // IDEA -- replace all instances of searchTerm with **$1**
            console.log(paraList);
            const highlightList = new Map([...paraList.map(index => [index, {}])]);
            console.log('searching for', searchTerm);
            if (highlightList.size > 0) {
                console.log('set initial highlightList', highlightList);
                // hack so the first click of 'down' goes to the first instance
                const currentScroll = paraList[paraList.length - 1];
                const scrollNavigation = new Map([...paraList.map((val, idx) => {
                    const nav = {
                        next: idx !== paraList.length - 1 ? paraList[idx + 1] : paraList[0],
                        prev: idx !== 0 ? paraList[idx - 1] : paraList[paraList.length - 1]
                    };
                    return [val, nav]
                })]);
                console.log('set navigation', scrollNavigation)
                console.log('set currentScroll', currentScroll)
                this.setState({ searchTerm: event.currentTarget.value, highlightList, scrollNavigation, currentScroll });
            } else {
                // not found, so reset everything
                this.setState({
                    searchTerm: event.currentTarget.value,
                    highlightList: new Map(),
                    scrollNavigation: new Map(),
                    currentScroll: 0
                })
            }
        } else {
            // search field is blank or 1 character long, so clear all highlights
            this.setState({
                searchTerm: '',
                highlightList: new Map(),
                scrollNavigation: new Map()
            })
        }
    }

    addNewRef(paraIndex, node) {
        // callback from full text each time a new highlightList reference is set
        const highlightList = new Map(this.state.highlightList);
        // need to skip an update on null or if already set or else we end up in an infinite loop
        // React sets the refs to null first after a render before resetting their value
        if (highlightList.get(paraIndex) !== node && node !== null) {
            console.log('adding ref to %d', paraIndex, node);
            highlightList.set(paraIndex, node);
            // updates the highlightList state
            console.log('updated highlightList state', highlightList);
            this.setState({ highlightList });
        }
    }

    scrollToNext(event, direction) {
        const scrollTo = new Map([
            ['first', this.state.currentScroll],
            ['down', this.state.scrollNavigation.get(this.state.currentScroll).next],
            ['up', this.state.scrollNavigation.get(this.state.currentScroll).prev]
        ])
        const currentScroll = scrollTo.get(direction);
        console.log('scrolling to para', currentScroll);
        this.state.highlightList.get(currentScroll).scrollIntoView({ behavior: 'smooth' });
        this.setState({ currentScroll });
    }

    showImages = e => {
        console.log('got request to show images for patent ID', this.state.result.PatentID);
        ipcRenderer.send('show_images', this.state.result.PatentID, this.state.result.PatentNumber, `${this.state.result.PatentNumber} - Images`);
    }

    makeOffline = e => {
        console.log('got request to save fulltext to DB');
        ipcRenderer.send('store_fulltext', this.state.result.PatentHtml, this.state.result.PatentID);
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
                        enableOffline={this.state.enableOffline}
                        makeOffline={this.makeOffline}
                        editContent={this.editContent}
                        activateEditMode={this.activateEditMode}
                        clickSaveCancel={this.clickSaveCancel}
                        changeSearchTerm={this.changeSearchTerm}
                        highlightList={this.state.highlightList}
                        scrollToNext={this.scrollToNext}
                        showImages={this.showImages}
                    />
                    {this.state.working ? <Throbber
                        visible={true}
                        windowHeight={200}
                        themeColor={'rgba(51, 122, 183, 0.2)'}
                    /> : <FullText
                            patentHtml={JSON.parse(this.state.result.PatentHtml)}
                            highlightList={this.state.highlightList}
                            addNewRef={this.addNewRef}
                        />}
                </div>
            </div>
        );
    }
}

const Result = (props) => {
    const hasDate = !!props.result.EstimatedExpiryDate;
    const formattedNumber = props.result.PatentNumber < 19999999 ?
        props.result.PatentNumber.toString().replace(/(\d{1,2})(\d{3})(\d{3})/g, '$1,$2,$3') :
        props.result.PatentNumber.toString().replace(/(\d{4})(.*)/g, '$1/$2');
    // TODO - deal with patent numbers above 9,999,999
    //TODO: Make date, inventor, PMCRef editable
    const [summaryID, summaryText] = props.summaries.size ? props.summaries.entries().next().value : ['new', { PatentSummaryText: '' }];
    // console.log('set summaryID and text', summaryID, summaryText);
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
        SearchBox: {},
        Icon: {
            fill: 'white',
            strokeWidth: '0px',
            display: 'flex',
            justifyContent: 'center'
        }
    }

    return (
        <div class="PatentDetail">
            <div class="PMCRef">{props.result.PMCRef}</div>
            <div class="PatentNumber">{formattedNumber} {props.result.InventorLastName ? `(${props.result.InventorLastName})` : ''} </div>
            <div class="Date">{hasDate ? `Expiry ~${props.result.EstimatedExpiryDate}` : 'Expiry Unknown'}</div>
            <div class="CloseWindow"><button onClick={props.goBackClickHandler}><Icon name='x' width='1em' height='1em' style={styles.Icon} /></button></div>
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
            <div class="Search">
                <input style={styles.SearchBox} placeholder="type term then Enter" onChange={e => props.changeSearchTerm(e)} />
                {props.highlightList.size > 0 ? (<div class='SearchNext' >
                    <Icon name='triUp' width='1em' height='1em' style={styles.Icon} handleClick={e => props.scrollToNext(e, 'up')} />
                    <Icon name='triDown' width='1em' height='1em' style={styles.Icon} handleClick={e => props.scrollToNext(e, 'down')} />
                </div>) : ''}
            </div>
            <div class="OpenPDF">
                <button style={{ flexGrow: '1' }} onClick={props.openClickHandler}>Open PDF</button>
                <button style={{ flexGrow: '1' }} onClick={props.showImages}>Show Images</button>
                {!props.enableOffline ? <button style={{ flexGrow: '1' }} onClick={e => props.makeOffline(e)}>Make available offline</button> : ''}
            </div>

        </div>
    )
};

const FullText = (props) => {
    const styles = {
        MatchIndex: {
            fontStyle: 'italic',
            color: 'rgba(51, 122, 183, 1)'
        }
    }

    return (
        <div class='FullText'>
            {props.patentHtml.map((paragraph, index) => {
                const header = paragraph.toUpperCase() === paragraph;
                const highlight = props.highlightList.has(index);
                return paragraph.length > 2 ? (
                    <div key={index}>
                        {highlight ?
                            <div class='Highlight' ref={elem => props.addNewRef(index, elem)}>
                                <button>Match {[...props.highlightList.keys()].indexOf(index) + 1}/{props.highlightList.size}</button> {paragraph /*idea: split on **text** and span them*/}
                            </div>
                            : <div class={header ? 'PatentParagraph PatentHeader' : 'PatentParagraph'}>
                                {header ? `${paragraph.charAt(0)}${paragraph.slice(1).toLowerCase()}` : paragraph}
                            </div>
                        }
                    </div>
                ) : '';
            })}
        </div>
    )
}

render(<PatentDetail />, document.getElementById('patentDetail'))