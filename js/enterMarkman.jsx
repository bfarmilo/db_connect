import { ipcRenderer } from 'electron';
import { h, render, Component } from 'preact';
import { Throbber } from './jsx/throbber';
import { config } from './jsx/config'
import { EditCell } from './jsx/editCell';
import { Icon } from './jsx/icons';
import { Dropdown } from './jsx/DropDown';



class MarkmanEntry extends Component {
    constructor(props) {
        super(props);
        this.state = {
            terms: new Map(),
            clients: new Map(),
            patents: new Map(),
            claims: new Map(),
            constructions: new Map(),
            termConstructions: new Map(),
            term: '',
            construction: '',
            court: '',
            patent: '',
            page: 0,
            selectedClaims: new Map(),
            client: '',
            document: '',
            agreed: false,
            documentID: 0,
            applyToList: new Map(),
            constructionEditMode: false,
            lockTermAndConstruction: false,
            message: ''
        };
        this.styles = {
            Icon: {
                fill: 'white',
                strokeWidth: '0px',
                display: 'flex',
                backgroundColor: config.markman.themeColor
            }
        }
    }

    componentWillMount = () => {
        // set up listeners
        ipcRenderer.on('init_complete', (e, termList, clientList, patentList) => {
            const terms = new Map(termList);
            const clients = new Map(clientList);
            const patents = new Map([...patentList].sort());
            this.setState({ terms, clients, patents })
        })
        ipcRenderer.on('got_claims', (e, claimList) => {
            // load the claims, sorted into ascending order
            const claims = new Map([...claimList].sort((a, b) => a[0] - b[0]));
            // to deal with the bug where selecting only claim 1 causes it to freeze,
            // default to selecting the first claim
            this.setState({ claims, selectedClaims: new Map([[1, claims.get(1)]]) });
        })
        ipcRenderer.on('got_constructions', (e, constructionList) => {
            const constructions = new Map(constructionList);
            this.setState({ constructions });
        })
        ipcRenderer.on('got_file', (e, document, documentID) => {
            console.log(document, documentID)
            this.setState({ document, documentID })
        })
        ipcRenderer.on('got_termconstructions', (e, mtcList) => {
            const termConstructions = new Map(mtcList);
            this.setState({ termConstructions })
        })
        ipcRenderer.on('write_complete', (e, list) => {
            const termConstructions = new Map(list);
            this.setState({ termConstructions, term: '', termID: 0, construction: '', constructionID: 0, lockTermAndConstruction: false });
            this.showMessage('Database Updated');
        })
    }

    componentDidMount = () => {
        ipcRenderer.send('markman_ready');
    }

    editEntry = (event, entryType) => {
        /** getQueryRecord is a helper function to compose a query
         * @returns {Object} -> {<ClientID>, <TermID>, <ClaimID>, <DocumentID>}
         */
        const getQueryRecord = () => {
            const lookup = {
                client: { value: 'client', list: 'clients', id: 'ClientID' },
                term: { value: 'term', list: 'terms', id: 'TermID' },
                claim: { value: 'claim', list: 'claims', id: 'ClaimID' },
                construction: { value: 'construction', list: 'constructions', id: 'ConstructionID' }
            }
            //console.log(this.state.terms, this.state.constructions);
            return ['client', 'term', 'claim', 'construction'].reduce((query, type) => {
                // go through each data type, and add the <Type>ID if it is found
                if (this.state[lookup[type].list].has(this.state[lookup[type].value])) {
                    query[lookup[type].id] = this.state[lookup[type].list].get(this.state[lookup[type].value])
                }
                return query;
            }, this.state.documentID ? { DocumentID: this.state.documentID } : {})
        }

        if (entryType === 'claim') {
            const selectedClaims = new Map(Array.from(event.target.selectedOptions).map(option => {
                const claim = parseInt(option.value, 10);
                return [claim, this.state.claims.get(claim)]
            }));
            this.setState({ selectedClaims });
        }
        if (entryType === 'patent') {
            const patent = parseInt(event.target.value, 10)
            if (this.state.patents.has(patent)) {
                this.setState({ patent, selectedClaims: new Map() });
                ipcRenderer.send('get_claims', this.state.patents.get(patent));
            } else {
                this.setState({ patent: '' });
            }
        }
        // term is set - get constructions associated with that 
        if (entryType === 'term') {
            const term = event.target.value;
            console.log('selected term', term)
            this.setState({ term });
            if (this.state.terms.has(term)) {
                // this is an existing term, so see if there are any constructions
                ipcRenderer.send('get_constructions', getQueryRecord())
            }
        }
        // client is set - get constructions associated with that
        if (entryType === 'client') {
            const client = event.target.value;
            this.setState({ client });
            ipcRenderer.send('get_constructions', getQueryRecord())
        }
        // toggle value
        if (entryType === 'agreed') this.setState({ agreed: !this.state.agreed });
        // update values
        if (entryType === 'court') this.setState({ [entryType]: event.target.value })
        if (entryType === 'page') this.setState({ [entryType]: event.target.value })
        if (entryType === 'construction') this.setState({ [entryType]: event.target.value })

    }

    clickSaveCancel = (event, entryType, action) => {
        console.log('got save/cancel event');
        this.setState({ constructionEditMode: false })
    }

    getFile = event => {
        console.log(this.state.clients.get(this.state.client));
        if (this.state.clients.has(this.state.client)) {
            ipcRenderer.send('get_file', this.state.client, this.state.clients.get(this.state.client));
        } else {
            this.showMessage('Please select a client before linking a file');
        }
    }

    addEntry = (event, claimList) => {
        // get the values we will need to create the new record
        const patentNumber = this.state.patent;
        const PatentID = this.state.patents.get(this.state.patent);
        const clientName = this.state.client;
        const ClientID = this.state.clients.get(clientName);
        if (!ClientID) {
            this.showMessage('Please select a client before adding an entry');
        } else {
            const applyToList = new Map([...this.state.applyToList]);
            [...claimList].map(([claim, ClaimID]) => {
                // use 'patentID:claimID' as a key in the map
                const key = `${PatentID}:${ClaimID}:${ClientID}`;
                // if not present already, add it and update the state   
                if (!this.state.applyToList.has(key)) {
                    console.log('adding record', patentNumber, claim)
                    applyToList.set(key, { PatentID, patentNumber, ClaimID, claimNumber: claim, ClientID, clientName })
                }
            });
            this.setState({ applyToList });
        }
    }

    removeEntry = (event, key) => {
        console.log('got remove entry event');
        const applyToList = new Map([...this.state.applyToList]);
        applyToList.delete(key);
        this.setState({ applyToList, lockTermAndConstruction: !!applyToList.size });

    }

    activateEditMode = event => {
        console.log('got activate edit mode event')
        this.setState({ constructionEditMode: true })
    }

    sendNewValues = (event, mode) => {
        const { court, page, documentID, term, construction, agreed } = this.state;
        if (mode !== 'clear' && court && page && documentID && term && construction) {
            const termID = this.state.terms.has(term) ? this.state.terms.get(term) : null;
            const constructionKey = `${construction}:${documentID}:${page}:${agreed}:${court}`;
            const constructionID = this.state.constructions.has(constructionKey) ? this.state.constructions.get(constructionKey) : null;
            // send the applytoList to main for writing
            const staticRecord = {
                term,
                termID,
                construction,
                constructionID,
                court,
                page,
                documentID,
                agreed
            }
            console.log('sending records to main process', [...this.state.applyToList], staticRecord);
            ipcRenderer.send('markman_write', [...this.state.applyToList], staticRecord)
        } else {
            // clear Term and construction
            if (mode === 'clear') {
                this.setState({ term: '', termID: 0, construction: '', constructionID: 0, lockTermAndConstruction: false });
            } else {
                // missing some data, identify which one
                const missingEntries = ['court', 'page', 'documentID', 'term', 'construction'].map(item => {
                    if (!this.state[item]) return item;
                    return '';
                }).join(',');
                this.showMessage(`Missing ${missingEntries}. Please enter a value and select 'Apply' again`);
            }
        }
    }

    showMessage = message => {
        console.log(message);
        this.setState({ message });
        setTimeout(() => this.setState({ message: '' }), 2000);
    }

    render({ props }, { state }) {

        const updateList = [...this.state.applyToList].map(([key, entry]) => (
            <div class='listToAdd'>
                <div style={{}}>{entry.patentNumber}</div>
                <div style={{}}> Claim {entry.claimNumber}</div>
                <div>{entry.clientName}</div>
                <div style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2em',
                    height: '2em',
                    backgroundColor: config.markman.themeColor,
                    display: 'flex',
                    borderRadius: '3px',
                    margin: '3px'
                }}>
                    <Icon name='x' width='1em' height='1em' style={this.styles.Icon} handleClick={e => this.removeEntry(e, key)} />
                </div>
            </div>)
        )

        return (
            <div>
                {this.state.message ? <div class='messageModal'>{this.state.message}</div> : <div />}
                <div class='firstpanel'>
                    <label style={{ gridArea: 'term', display: 'flex', alignItems: 'center' }}>Term:{this.state.lockTermAndConstruction ? <div class='term'>{this.state.term}</div> : <Dropdown editable={true} themeColor={config.markman.themeColor} data={this.state.terms} selected={this.state.term} contents={'term'} onChange={this.editEntry} />
                    }</label>
                    <label style={{ gridArea: 'construction' }}>Construction:
                        <EditCell
                            editMode={this.state.constructionEditMode && !this.state.lockTermAndConstruction}
                            value={this.state.construction}
                            editContent={(e) => this.editEntry(e, 'construction')}
                            clickSaveCancel={(e, action) => this.clickSaveCancel(e, 'construction', action)}
                            activateEditMode={(e) => this.activateEditMode(e)}
                            themeColor={config.markman.themeColor}
                            selectedColor={config.markman.themeColor}
                            boxHeight={100}
                        />
                    </label>
                    <div style={{ gridArea: 'document', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div style={{ display: 'flex', color: 'grey', fontStyle: 'italic' }}>{!this.state.documentID ? 'Select a file containing the ruling' : this.state.document}</div><button style={{ display: 'flex', height: '2.5em' }} onClick={e => this.getFile(e)}>Browse to File</button></div>
                    <label style={{ gridArea: 'client', display: 'flex', alignItems: 'center' }}>Client:<Dropdown editable={false} themeColor={config.markman.themeColor} data={this.state.clients} selected={this.state.client} contents={'client'} onChange={this.editEntry} /></label>
                    <span style={{ gridArea: 'agreed', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center' }}>Agreed?<button style={{ display: 'flex', height: '2.5em' }} ><Icon name={this.state.agreed ? 'circleCheck' : 'circleX'} width='1.5em' height='1.5em' style={this.styles.Icon} handleClick={e => this.editEntry(e, 'agreed')} /></button></label>
                        <label style={{ display: 'flex', alignItems: 'center' }}>Page number for Construction:<input name='page' type='number' style={{ width: '4em', backgroundColor: config.markman.themeColor }} value={this.state.page || 0} onChange={e => this.editEntry(e, 'page')} default='Page' /></label>
                        <label style={{ display: 'flex', alignItems: 'center' }}>Court:<input name='court' type='text' style={{ width: '5em', backgroundColor: config.markman.themeColor }} value={this.state.court} onChange={e => this.editEntry(e, 'court')} default='Court' /></label>
                    </span>
                </div>
                <div class='secondpanel'>
                    <Dropdown editable={true} themeColor={config.markman.themeColor} data={this.state.patents} selected={this.state.patent} contents={'patent'} onChange={this.editEntry} />
                    {this.state.patent ?
                        <Dropdown editable={false} multiSelect={true} themeColor={config.markman.themeColor} data={this.state.claims} selected={this.state.selectedClaims} contents={'claim'} onChange={this.editEntry} />
                        : <div style={{ gridArea: 'claim' }} />}
                    <div style={{
                        gridArea: 'control',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2em',
                        backgroundColor: config.markman.themeColor,
                        display: 'flex',
                        borderRadius: '3px',
                        margin: '3px'

                    }}>
                        <Icon name='circleCheck' width='1.5em' height='1.5em' style={this.styles.Icon} handleClick={e => this.addEntry(e, this.state.selectedClaims)} />
                    </div>
                </div>
                {this.state.applyToList.size ? <div class='thirdpanel'>
                    {updateList}
                    <div />
                    <div style={{ display: 'flex' }}><button onClick={e => this.sendNewValues(e, 'clear')}>Clear All Values</button><button onClick={e => this.sendNewValues(e, 'apply')}>Apply</button></div>
                </div> : <div />}
            </div>
        )
    }
}

render(<MarkmanEntry />, document.getElementById('markmanEntry'));