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
                summaries: [ {} ]
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
    <div class="PatentDetail">
        <div class="PMCRef">
            {props.result.PMCRef}
        </div>
        <div class="PatentNumber">: {props.result.PatentNumber.toString().replace(/(\d{1})(\d{3})(\d{3})/g, '$1,$2,$3')} </div>
        <div />
        <div class="CloseWindow"><button onClick={props.goBackClickHandler}>X</button></div>
        <div class="Title">"{props.result.Title}"</div>
        {Object.keys(props.result.summaries[0]).length ? (
            <div class="Summary">{props.result.summaries[0].PatentSummaryText}</div>
        ) : <div />}
        <div class="ClaimsCount">Claims (<strong>Independent</strong>/Total): <strong>{props.result.IndependentClaimsCount}</strong>/{props.result.ClaimsCount}</div>
        <div class="OpenPDF"><button onClick={props.openClickHandler}>Open PDF</button></div>
    </div>
);

render(<PatentDetail />, document.getElementById('patentDetail'))