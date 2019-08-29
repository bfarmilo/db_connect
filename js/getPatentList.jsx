import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Icon } from './jsx/icons';

class GetPatentList extends Component {
    constructor(props) {
        super(props);
        this.styles = {
            getPatentList: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr'
            },
            otherControls: {
                display: 'grid',
                gridTemplateColumns: 'auto',
                gridTemplateRows: '1fr 1fr 1fr 1fr'
            },
            textArea: { display: 'flex' },
            labelStyle: {
                fontFamily: 'Arial',
                padding: '0.4em 0.5em 0.4em 0.5em'
            },
            goArea: {
                display: 'flex',
                justifyContent: 'center',
                gridColumn: '1/3'
            },
            inputStyle: {
                backgroundColor: 'rgba(51, 122, 183, 0.2)',
                border: 'none',
                fontFamily: 'Arial',
                height: 'auto',
                width: 'auto',
                padding: '0.4em 0.5em 0.4em 0.5em',
                flexGrow: 1
            },
            checkBoxStyle: {
                backgroundColor: 'rgba(51, 122, 183, 0.2)',
                margin: '0.7em 0em 0em 0.7em'
            },
            buttonStyle: {
                borderRadius: '2px',
                backgroundColor: 'rgba(51, 122, 183, 1)',
                color: 'white',
                fontWeight: 'bold',
                border: 'none',
                outline: 'none',
                padding: '0.4em 0.5em 0.4em 0.5em',
            }
        }
        this.state = {
            patentList: [],
            reference: 'REF',
            storagePath: 'PMC Public\\Licensing',
            downloadPats: true,
            updateStatus: new Map(),
            startIdx: 1,
            filterOptions: 'claim1',
            claimPlainText: []
        }
        this.resetStatus = {
            isRequested: false,
            isScraped: false,
            isDownloaded: false,
            isPatentInserted: false,
            isClaimInserted: false,
            isError: false
        }
        this.updateKey = new Map([
            ['requested', 'isRequested'],
            ['scraped', 'isScraped'],
            ['downloaded', 'isDownloaded'],
            ['patent inserted', 'isPatentInserted'],
            ['claims inserted', 'isClaimInserted'],
            ['error', 'isError']
        ])
        this.handleInput = this.handleInput.bind(this);
        this.handlePatentButton = this.handlePatentButton.bind(this);
        this.handleFolderSelect = this.handleFolderSelect.bind(this);
        this.handleFilterOptions = this.handleFilterOptions.bind(this);
        this.handleAddClaimsOnly = this.handleAddClaimsOnly.bind(this);
    }

    componentWillMount() {
        ipcRenderer.on('new_folder', (e, storagePath) => {
            this.setState({ storagePath });
        })
        ipcRenderer.on('new_patents_ready', (e, [patent, statusMessage]) => {
            const patentNumber = parseInt(patent, 10);
            console.log('received update for patent %s, with value %s', `${patentNumber}`, statusMessage)
            const updateStatus = new Map(this.state.updateStatus);
            const newStatus = { ...updateStatus.get(patentNumber) };
            console.log(newStatus, updateStatus.get(patentNumber), { ...this.state.updateStatus.get(patentNumber) }, this.updateKey.get(statusMessage))
            // insert the new data into the entry at currentEntry.key
            updateStatus.set(parseInt(patentNumber, 10), { ...this.state.updateStatus.get(patentNumber), [this.updateKey.get(statusMessage)]: true });
            console.log('new status set', updateStatus);
            this.setState({ updateStatus });
        });
        ipcRenderer.on('page_load_error', (e, error) => {
            console.error('external window reports new error', error);
        })
    }

    handleInput(event, inputType) {
        const newValue = event.currentTarget.value;
        console.log('received change to %s, setting new value %s', inputType, newValue);
        switch (inputType) {
            case 'patentList':
                // strip out 'US', commas, slashes and spaces, filter out things <7 digits long, convert to an array of strings by splitting on \n
                // format as {patentNumber:Ref}
                const patentList = newValue.replace(/(US|,|\/| )/g, '').split(/\n/g).sort().filter(item => item.match(/\d{7}/));
                this.setState({ patentList });
                break;
            case 'downloadPats':
                this.setState({ downloadPats: !this.state.downloadPats });
                break;
            case 'startIdx':
                this.setState({ startIdx: parseInt(newValue, 10) });
                break;
            default:
                // 'reference', 'storagePath'
                this.setState({ [inputType]: newValue });
        }
    }

    handleFilterOptions(event) {
        // independent || dependent || claim1 || allbut1 || all
        const filterOptions = event.currentTarget.value;
        console.log(`setting filter Options to ${filterOptions}`);
        this.setState({ filterOptions });
    }

    handleFolderSelect(event) {
        ipcRenderer.send('browse', this.state.storagePath);
    }

    handleAddClaimsOnly(text, status) {
        // claimText.text is the plain text of the claim
        // claimText.status is an integer indicating the status of the claim
        // concatenate this with the existing state to add to the array
        this.setState({claimText: this.state.claimText.concat({text, status})});
    }

    handlePatentButton(event) {
        if (this.state.patentList.length > 0) {
            console.log('sending data to Main:', this.state.patentList, this.state.reference, this.state.storagePath, this.state.downloadPats, this.state.filterOptions, this.state.startIdx);
            ipcRenderer.send(
                'get_new_patents',
                this.state.patentList,
                this.state.reference,
                this.state.storagePath,
                this.state.downloadPats,
                this.state.filterOptions,
                this.state.startIdx,
                this.state.claimText
            );
            // add list of patents to status, setting 'isRequested' to true
            const updateStatus = new Map(this.state.patentList.map(patent => ([parseInt(patent, 10), { ...this.resetStatus, isRequested: true }])));
            console.log('status updated', updateStatus);

            // update status and clear patentList box
            this.setState({ updateStatus, patentList: [] });
        }
    }
    // TODO: Add visible/invisible box for claim plain text entry. Claims should be separated by newlines only !
    render({ }, { }) {
        return (
            <div style={this.styles.getPatentList}>
                <div style={this.styles.textArea}>
                    <textarea style={this.styles.inputStyle} onChange={e => this.handleInput(e, 'patentList')} rows='5' value={this.state.patentList.join('\n')} placeholder='Enter List of Patents' />
                </div>
                <div style={this.styles.otherControls}>
                    <div style={{ display: 'flex' }}>
                        <label style={this.styles.labelStyle} htmlFor='reference'>Ref: </ label>
                        <input id='reference' type='text' style={this.styles.inputStyle} onChange={e => this.handleInput(e, 'reference')} value={this.state.reference} />
                    </div>
                    <div style={{ display: 'flex' }}>
                        <label style={this.styles.labelStyle} htmlFor='startIdx'>Reference Starting Index</label>
                        <input style={this.styles.inputStyle} type='number' id='startIdx' onChange={e => this.handleInput(e, 'startIdx')} value={this.state.startIdx} />
                    </div>
                    <div style={{ display: 'flex' }}>
                        <label style={this.styles.labelStyle} htmlFor='storagePath'>PDF Path: </ label>
                        <input id='storagePath' type='text' style={this.styles.inputStyle} onClick={this.handleFolderSelect} value={this.state.storagePath} />
                    </div>
                    <div style={{ display: 'flex' }}>
                        <input style={this.styles.checkBoxStyle} type='checkbox' checked={this.state.downloadPats} id='downloadPats' onClick={e => this.handleInput(e, 'downloadPats')} />
                        <label style={this.styles.labelStyle} htmlFor='downloadPats'>Download Patents</label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', fontFamily: 'Arial', fontSize: 'smaller' }}>
                        {['independent', 'dependent', 'claim1', 'allbut1', 'all'].map(item => (
                            <div key={item}>
                                <input type='radio' id={item} name='claims' onClick={this.handleFilterOptions} value={item} checked={this.state.filterOptions === item} />
                                <label for={item}>{item.includes('all') ? `${item}` : `${item} Only`}</label>
                            </div>
                        ))}
                    </div>
                </div>
                {/*TODO: Add Switchable block here which gives the manual claim interface
                Need to specify single patent, and for each claim a Claim Status
                Ideally would get the dropdown list of available statuses from the database
                Make sure the event handler gets passed (text {Sting}, status{Number}) */}
                <div style={this.styles.goArea}>
                    <button style={this.styles.buttonStyle} onClick={this.handlePatentButton}>Get Patents</button>
                </div>
                {this.state.updateStatus.size > 0 ? (<div>Status:
                    <table style={{ textAlign: 'center' }}>
                        <tr>
                            <th />
                            <th>Request Sent</th>
                            <th>Text Extracted</th>
                            <th>PDF downloaded</th>
                            <th>Patent Inserted in DB</th>
                            <th>Claims Inserted in DB</th>
                            <th>Error</th>
                        </tr>
                        {[...this.state.updateStatus].map(([patent, status]) => (
                            <tr key={patent}>
                                <td>{patent}</td>
                                {Object.keys(status).map(statusItem => (
                                    <td key={statusItem} id={status[statusItem]}>{status[statusItem] ? '\u2713' : ''}</td>
                                ))}
                            </tr>
                        ))}
                    </table>
                </div>) : <div />}
            </div>
        )
    }
};

render(<GetPatentList />, document.getElementById('mainbody'));