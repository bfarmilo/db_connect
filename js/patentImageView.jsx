import { h, Component } from 'preact';
import { useRef, useEffect } from 'preact/hooks';
import pdfJsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

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




class newPatentImage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            pdf: null,
            status: 'reset',
            page: null
        }
    }

    componentDidMount() {
        pdfJsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        if (!this.props.isImage) {
            //it's a full PDF, and the imageData is new, so figure out the page count and report it
            pdfJsLib.getDocument({ data: this.props.imageData }).promise.then(pdf => {
                console.log('new document has total number of pages', pdf.numPages);
                this.props.updatePageCount(pdf.numPages);
                this.update(pdf);
            })
        } else {
            pdfJsLib.getDocument({ data: atob(this.props.imageData.get(this.props.showPage).pageData) }).promise.then(pdf => {
                console.log('new image data received, calling update');
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
        // experimental - text extraction
        /* page.getTextContent().then(text => {
            console.log('extracted text from page', text);
        }); */
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

/**
 * props
 *    imageData={this.state.patentImages}
 *    showPage={this.state.currentImage}
 *    windowSize={this.state.windowSize}
 *    startPage={this.state.firstImage}
 *    controlAreaHeight={CONTROL_HEIGHT}
 *    rotation={this.state.rotation}
 *    reportViewport={this.reportViewport}
 *    updatePageCount={this.setLastPage}
 *    reportStatus={this.reportStatus}
 *    isImage={true}
 *    numPagesToShow
 */

class PatentImage extends Component {

    constructor(props) {
        super(props);
        this.state = {
            status: 'ready',
            currentPdfPage: 1,
            totalPages: 1,
            pdfPages: new Map()
        };
        this.pdf = null;
        this.canvas = new Map();
    }

    componentDidMount() {
        pdfJsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        console.log('mount', this.state.status, !!this.pdf);
    }

    shouldComponentUpdate(nextProps, nextState) {
        // update component if status, page or window changes
        console.log('shouldUpdate', nextState.status, !!this.pdf);
        return this.state.status !== nextState.status || this.props.showPage !== nextProps.showPage ||
            this.props.windowSize.width !== nextProps.windowSize.width ||
            this.props.windowSize.height !== nextProps.windowSize.height;
    }

    componentDidUpdate(prevProps) {
        const { width, height } = this.props.windowSize;
        const isNewPage = prevProps.showPage !== this.props.showPage;
        const isNewSize = prevProps.windowSize.width !== width || prevProps.windowSize.height !== height;
        console.log(`DidUpdate due to ${isNewPage ? 'new page' : isNewSize ? 'new size' : JSON.stringify(Array.from(this.props).filter(prop => prevProps[prop] != prop))}${this.props.imageData.size ? '' : ' but no imagedata yet'}`);
        if (this.props.isImage && isNewPage && this.props.imageData.size) {
            // one page per file, and the page is different, so update the image
            this.pdf = null;
            this.loadDocument();
        } else if (isNewSize && this.pdf) {
            // this is just a size change so jump to scaling
            this.scalePage();
        } else if (prevProps.imageData.size !== this.props.imageData.size) {
            // new count of files
        }
    }

    loadDocument = () => {
        // update status, reset pages & log
        this.setState({ pdfPages: new Map(), status: 'loading' });
        console.log('loadDocument', this.state.status, !!this.pdf, this.canvas);
        // TODO deal with multi-page PDF's
        const data = atob(this.props.imageData.get(this.props.showPage).pageData);
        const loadingTask = pdfJsLib.getDocument({ data });
        // update status to processing and store pdf data
        loadingTask.promise.then(pdf => {
            const allPages = pdf.numPages;
            const totalPages = Math.min(this.props.numPagesToShow, allPages);
            console.log(`pdf loaded with ${allPages} pages, processing ${totalPages}`);
            this.pdf = pdf;
            this.setState({ status: 'processing', totalPages }, () => this.loadPage())
        })
    }

    loadPage = () => {
        console.log('loadPage', this.state.status, !!this.pdf, this.canvas);
        const pdfPages = new Map([...this.state.pdfPages]);
        console.log('loadPage', pdfPages);
        const pageArray = (new Array(this.state.totalPages)).fill(0).map((val, index) => index + 1);
        // load the page, update status and initiate scaling step
        Promise.all(pageArray.map(pdfPage => {
            //skip any pages we've already extracted
            if (pdfPages.has(pdfPage)) { console.log('skipped loading page', pdfPage); return; }
            return this.pdf.getPage(pdfPage)
                .then(page => pdfPages.set(pdfPage, { page }))
        }))
            .then(() => this.setState({ status: 'scaling', pdfPages }, () => this.scalePage()))
    }

    scalePage = () => {
        console.log('scalePage', this.state.status, !!this.pdf);
        const pdfPages = new Map([...this.state.pdfPages]);

        // deal with rotations and scaling
        [...pdfPages].map(([pdfPage, pageProps]) => {
            const portraitMode = this.props.rotation == 0 || this.props.rotation == 180;
            const viewportBaseline = pageProps.page.getViewport({ scale: 1, rotation: this.props.rotation });
            const scale = portraitMode ?
                (this.props.windowSize.height - this.props.controlAreaHeight - 5) / viewportBaseline.height :
                this.props.windowSize.width / viewportBaseline.width;
            const viewport = pageProps.page.getViewport({ scale, rotation: this.props.rotation })
            console.log('width', this.props.windowSize.width, viewport.width);
            console.log('height', this.props.windowSize.height, viewport.height);
            // report viewport data to potentially get new window sizes
            // also add the canvas here since we've got the count right
            const canvas = this.canvas.get(pdfPage);
            // experimental - text extraction
            // see https://github.com/mozilla/pdf.js/blob/master/examples/text-only/pdf2svg.js for example of how to turn this into displayable text via SVG
            pageProps.page.getTextContent().then(text => {
                console.log('extracted text from page', text);
            });
            pdfPages.set(pdfPage, { ...pageProps, viewport, canvas });
        })
        const { width, height } = pdfPages.get(this.state.currentPdfPage).viewport;
        this.props.reportViewport(width, height);
        // update state and viewport, pass off to rendering
        this.setState({ pdfPages, status: 'rendering' }, () => this.renderPage());
    }

    renderPage = () => {

        console.log('renderPage', this.state.status, !!this.pdf);
        const pdfPages = new Map([...this.state.pdfPages]);

        const renderGroup = start => {
            console.log('rendering pages ', start + 1, Math.min(start + 3, pdfPages.size));
            console.log(this.canvas, [...pdfPages]);
            return Promise.all([...pdfPages].slice(start, start + 3).map(([pdfPage, pageProps]) => {
                const { canvas, viewport } = pageProps;
                console.log('rendering page', pdfPage, 'to canvas', canvas);
                const canvasContext = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                const renderContext = {
                    canvasContext,
                    viewport,
                };
                // render the page and back to idle
                const renderTask = pageProps.page.render(renderContext);
                return renderTask.promise;
            })).then(() => {
                //this.props.reportStatus('ready');
                if (start + 3 < this.state.totalPages) return renderGroup(start + 3);
            });
        }
        this.props.reportStatus('busy');
        renderGroup(0)
            .then(() => {
                this.setState({ status: 'ready' });
                // report completion
                console.log('rendering complete');
                this.props.reportStatus('ready');
            });
    }

    render() {
        console.log('render', this.state.status, !!this.pdf);
        if (this.props.showPage && this.state.status === 'ready' && !this.pdf) this.loadDocument();
        const pdfPages = new Map([...this.state.pdfPages]);
        console.log(pdfPages);
        return (<div>{[...pdfPages].map(([pdfPage, pageEntry], index) => <canvas key={pdfPage} ref={(canvas) => { this.canvas.set(index + 1, canvas) }} />)}</div>)
    }
}
/** Experimental -- not working GenericPDF stateless component
 * @param {Object} props -> pdfData - Map(page#, {url, pageData}), showPage - page number to show, rotation - 0,90,180,270
 */

const GenericPdf = async props => {

    pdfJsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

    const src = props.imageData.has(props.showPage) ? atob(props.imageData.get(props.showPage).pageData) : null;

    const canvasRef = useRef(null)

    useEffect(() => {
        const fetchPdf = async () => {
            const loadingTask = pdfJsLib.getDocument({ data: src });

            const pdf = await loadingTask.promise;

            const firstPageNumber = 1;

            const page = await pdf.getPage(firstPageNumber);

            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });

            // Prepare canvas using PDF page dimensions
            const canvas = canvasRef.current;

            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            const renderTask = page.render(renderContext);

            await renderTask.promise;
        };

        if (props.imageData.has(props.showPage)) fetchPdf();
    }, [src]);

    return (
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
        />
    );
}


module.exports = {
    PatentImage,
    newPatentImage,
    GenericPdf
}