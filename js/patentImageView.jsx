import { h, Component } from 'preact';
import pdfJsLib from 'pdfjs-dist';

/** Stateless preferred, once preact implements createRef()
 * @param {Object} props -> imageData - Map(page#, {url, pageData}), showPage - page number to show, rotation - 0,90,180,270
 */

/*const PatentImage = async props => {
    //let thisCanvas = createRef();
    pdfJsLib.GlobalWorkerOptions.workerSrc = 'http://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.0.489/pdf.worker.js';
    const pdf = await pdfJsLib.getDocument({ data: atob(props.imageData.get(props.showPage).pageData) });
    const page = await pdf.getPage(1);
    console.log(page);
    const scale = 1.5;
    const viewport = page.getViewport(scale, props.rotation);
    console.log(thisCanvas);
    const canvasContext = thisCanvas.getContext('2d');
    const renderContext = {
        canvasContext,
        viewport,
    };
    page.render(renderContext);
    return (
        <canvas height={viewport.height} width={viewport.width} />
    )
}
*/

class PatentImage extends Component {

    componentDidMount() {
        pdfJsLib.GlobalWorkerOptions.workerSrc = 'http://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.0.489/pdf.worker.js';
    }

    render() {
        pdfJsLib.getDocument({ data: atob(this.props.imageData.get(this.props.showPage).pageData) }).then((pdf) => {
            pdf.getPage(1).then((page) => {
                const viewportBaseline = page.getViewport(1, this.props.rotation);
                const scale = this.props.width / viewportBaseline.width;
                const viewport = page.getViewport(scale, this.props.rotation);
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
        });
        return <canvas ref={(canvas) => { this.canvas = canvas; }} />;
    }
}

module.exports = {
    PatentImage
}