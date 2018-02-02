const { ipcRenderer } = require('electron');
const { h, render, Component } = require('preact');

class PatentDetail extends Component {

    constructor(props) {
        super(props);
        this.state = {
            result: {
                PatentPath: '_blank',
                Title: 'No Patent Loaded',
                PatentNumber: 1111111,
                IndependentClaimsCount: 0,
                ClaimsCount: 0,
                summaries:[]
            }
        };
        this.openClickHandler = this.openClickHandler.bind(this);
        this.goBackClickHandler = this.goBackClickHandler.bind(this);
    }

    componentDidMount() {
        ipcRenderer.on('state', (event, result) => {
            console.log('received data', result);
            console.log('summary:', result.summaries)
            this.setState({ result });
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

    render({ }, { result }) {
        console.log('calling render with state', result, document.getElementById('patentDetail'))
        return (
            <div>
                <div class="list">
                    <Result
                        result={result}
                        openClickHandler={this.openClickHandler}
                        goBackClickHandler={this.goBackClickHandler}
                    />
                </div>
            </div>
        );
    }
}

const Result = (props) => (
    <div style={{
        padding: 10,
        margin: 10,
        background: 'white',
        boxShadow: '0 1px 5px rgba(0,0,0,0.5)'
    }}>
        <div>
            <a href={props.result.PatentPath} target="_blank">
                {props.result.PMCRef}
            </a><span>: {props.result.PatentNumber.toString().replace(/(\d{1})(\d{3})(\d{3})/g, '$1,$2,$3')} </span>
            <div>"{props.result.Title}"</div>
            <div>Claims (<strong>Independent</strong>/Total): <strong>{props.result.IndependentClaimsCount}</strong>/{props.result.ClaimsCount}</div>
            {!!props.result.summaries[0] && (
                <div>{props.result.summaries[0].PatentSummaryText}</div>
            )}
            <button onClick={props.openClickHandler}>Open PDF</button>
            <button onClick={props.goBackClickHandler}>Close Window</button>
        </div>
    </div>
);

render(<PatentDetail />, document.getElementById('patentDetail'))