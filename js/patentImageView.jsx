import { h, Component, createRef } from 'preact';
import pdfJsLib from 'pdfjs-dist';

/** Stateless preferred, once preact implements createRef()
 * @param {Object} props -> imageData - Map(page#, {url, pageData}) || Uint8Array, showPage - page number to show, rotation - 0,90,180,270, isImage - true if image mode
 */

class PatentImage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            pdf: false
        }
    }

    componentDidMount() {
        pdfJsLib.GlobalWorkerOptions.workerSrc = 'http://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.1.266/pdf.worker.js';
        if (!this.props.isImage) {
            //it's a full PDF, and the imageData is new, so figure out the page count and report it
            pdfJsLib.getDocument({ data: this.props.imageData }).promise.then(pdf => {
                console.log('new document has total number of pages', pdf.numPages);
                this.props.updatePageCount(pdf.numPages);
                this.setState({ pdf });
            })
        } else {
            pdfJsLib.getDocument({ data: atob(this.props.imageData.get(this.props.showPage).pageData) }).promise.then(pdf => {
                this.setState({ pdf });
            });
        }
    }

    render() {
        const portraitMode = this.props.rotation == 0 || this.props.rotation == 180;
        if (this.props.showPage && this.state.pdf) {
            console.log('showing page', this.props.showPage);
            const rotation = this.props.rotation;
            const pageToGet = this.props.isImage ? 1 : this.props.showPage;
            this.state.pdf.getPage(pageToGet).then(page => {
                const viewportBaseline = page.getViewport({ scale: 1, rotation });
                const scale = portraitMode ?
                    (this.props.windowSize.height - this.props.controlAreaHeight - 5) / viewportBaseline.height :
                    this.props.windowSize.width / viewportBaseline.width;
                const viewport = page.getViewport({ scale, rotation });
                console.log('width', this.props.windowSize.width, viewport.width);
                console.log('height', this.props.windowSize.height, viewport.height);
                this.props.reportViewport(viewport.width, viewport.height);
                const { canvas } = this;
                const canvasContext = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext,
                    viewport,
                };
                page.render(renderContext);
            });
            return <canvas ref={(canvas) => { this.canvas = canvas; }} />
        } else return <div />;
    }
}
/** Experimental -- not working GenericPDF stateless component
 * @param {Object} props -> pdfData - Map(page#, {url, pageData}), showPage - page number to show, rotation - 0,90,180,270
 */

const GenericPdf = async props => {
    let thisCanvas = createRef();
    pdfJsLib.GlobalWorkerOptions.workerSrc = 'http://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.1.266/pdf.worker.js';
    const pdf = await pdfJsLib.getDocument({ data: atob(props.pdfData.get(props.showPage).pageData) }).promise;
    const page = await pdf.getPage(1);
    console.log(page);
    const scale = 1.5;
    const viewport = page.getViewport({ scale, rotation: props.rotation });
    console.log(thisCanvas, thisCanvas.current);
    const canvasContext = thisCanvas.current.getContext('2d');
    const renderContext = {
        canvasContext,
        viewport,
    };
    page.render(renderContext);
    return (
        <canvas height={viewport.height} width={viewport.width} ref={thisCanvas} />
    )
}


module.exports = {
    PatentImage,
    GenericPdf
}