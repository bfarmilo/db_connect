import { h, Component, createRef } from 'preact';
import pdfJsLib from 'pdfjs-dist';

/* TODO:
* GetNumPages
* getNewHeight
* componentWillReceiveProps --> Deal with receiving new pages 306
* updateNewHeight 321
* make pages into an array, and return one <Page> component per entry, keep track of the last page drawn
* <optional> handle click on line 128
* loadpage 151
* skippage 162
* push viewHeights into an array 224

/** Stateless preferred, once preact implements createRef()
 * @param {Object} props -> imageData - Map(page#, {url, pageData}) || Uint8Array, showPage - page number to show, rotation - 0,90,180,270, isImage - true if image mode
 */

class PatentImage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            pdf: null,
            status: 'reset',
            page: null
        }
    }

    componentDidMount() {
        pdfJsLib.GlobalWorkerOptions.workerSrc = 'http://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.1.266/pdf.worker.js';
        if (!this.props.isImage) {
            //it's a full PDF, and the imageData is new, so figure out the page count and report it
            pdfJsLib.getDocument({ data: this.props.imageData }).promise.then(pdf => {
                console.log('new document has total number of pages', pdf.numPages);
                this.props.updatePageCount(pdf.numPages);
                this.update(pdf);
            })
        } else {
            pdfJsLib.getDocument({ data: atob(this.props.imageData.get(this.props.showPage).pageData) }).promise.then(pdf => {
                this.update(pdf);
            });
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        // update component if status, page or window changes
        return this.state.status !== nextState.status ||
            this.props.showPage !== nextProps.showPage ||
            this.props.windowSize.width !== nextProps.windowSize.width ||
            this.props.windowSize.height !== nextProps.windowSize.height;
    }

    componentDidUpdate(prevProps) {
        const { width, height } = this.props.windowSize;
        if (this.props.isImage && prevProps.imageData.get(prevProps.showPage) !== this.props.imageData.get(this.props.showPage)) {
            // if there is new pdf data, update the image
            pdfJsLib.getDocument({ data: atob(this.props.imageData.get(this.props.showPage).pageData) }).promise.then(pdf => {
                this.update(pdf);
            });
        } else if (prevProps.windowSize.width !== width || prevProps.windowSize.height !== height) {
            // this is just a size change so jump to rendering
            this.renderPage(this.state.page);
        }
    }

    update = pdf => {
        if (pdf) {
            this.loadPage(pdf)
        } else {
            this.setState({ status: 'loading' });
        }
    }

    loadPage = pdf => {
        // if we're doing a lap and rendering isn't complete yet, skip the rest
        if (this.state.status === 'rendering') return;
        // otherwise get a PDF page associated with a page number and render it
        const pageToGet = this.props.isImage ? 1 : this.props.showPage;
        console.log(`loading page ${pageToGet}`);
        if (this.props.isImage || (this.props.showPage > this.props.startPage)) {
            pdf.getPage(pageToGet).then(this.renderPage);
            this.setState({ pdf, status: 'rendering' })
        } else {
            this.skipPage(this.props.showPage);
        }
    }

    skipPage = pageToSkip => {
        // experimental, not tested, used to put in white space for a multi-page PDF so the scroll bar appears in the right spot
        console.log(`page skipped ${pageToSkip}`);
        const { canvas } = this;
        let context = canvas.getContext('2d');
        let width = 200;
        let height = 500;
        canvas.width = width;
        canvas.height = height;

        context.rect(5, 5, width - 10, height - 10);
        context.stroke();

        //this.setState({ status: 'rendered', page: null, width, height })

    }

    renderPage = page => {
        const portraitMode = this.props.rotation == 0 || this.props.rotation == 180;
        console.log('showing page', this.props.showPage);
        const rotation = this.props.rotation;
        const viewportBaseline = page.getViewport({ scale: 1, rotation });
        const scale = portraitMode ?
            (this.props.windowSize.height - this.props.controlAreaHeight - 5) / viewportBaseline.height :
            this.props.windowSize.width / viewportBaseline.width;
        const viewport = page.getViewport({ scale, rotation });
        console.log('width', this.props.windowSize.width, viewport.width);
        console.log('height', this.props.windowSize.height, viewport.height);
        // report the current viewport height up to the parent component
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
        this.setState({ status: 'rendered', page });
    }


    render() {
        if (this.props.showPage && this.state.pdf) {
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